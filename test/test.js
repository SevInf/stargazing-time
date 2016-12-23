/* eslint-env mocha */
'use strict'
const chai = require('chai')
const getGoodTimes = require('..').getGoodTimes
const nock = require('nock')

chai.use(require('chai-as-promised'))
chai.use(require('chai-datetime'))
const assert = chai.assert

function forecast () {
  return nock('http://api.openweathermap.org')
        .get('/data/2.5/forecast')
}

function performDefaultCall () {
  return getGoodTimes({ apiKey: 'myapikey', id: 12345 })
}

const MIN_VALID_RESPONSE = {
  list: []
}

function result (opts) {
  return {
    dt: Math.floor(opts.time.getTime() / 1000),
    clouds: {
      all: opts.clouds || 0
    }
  }
}

describe('getGoodTimes', () => {
  describe('forming request', () => {
    it('should correctly form request when used with city id', () => {
      const scope = forecast()
                .query({
                  id: 12345,
                  appid: 'myapikey'
                })
                .reply(200, MIN_VALID_RESPONSE)

      return getGoodTimes({
        apiKey: 'myapikey',
        id: 12345
      }).then(() => scope.done())
    })

    it('should correctly form request when used with city name', () => {
      const scope = forecast()
                .query({
                  q: 'Berlin,de',
                  appid: 'myapikey'
                })
                .reply(200, MIN_VALID_RESPONSE)

      return getGoodTimes({
        apiKey: 'myapikey',
        city: 'Berlin,de'
      }).then(() => scope.done())
    })

    it('should correctly form request when used with coordinates', () => {
      const scope = forecast()
                .query({
                  lon: 12.34,
                  lat: 56.78,
                  appid: 'myapikey'
                })
                .reply(200, MIN_VALID_RESPONSE)

      return getGoodTimes({
        apiKey: 'myapikey',
        lon: 12.34,
        lat: 56.78
      }).then(() => scope.done())
    })

    it('should throw TypeError when there is no api key', () => {
      assert.throws(
                () => getGoodTimes({ city: 'Berlin,de' }),
                TypeError,
                /apiKey/
            )
    })

    it('should throw on incorrect params', () => {
      assert.throws(
                () => getGoodTimes({ planet: 'Earth', apiKey: 'myapikey' }),
                TypeError
            )
    })

    it('should throw on incomplete coordinates', () => {
      assert.throws(
                () => getGoodTimes({ lat: 123.45, apiKey: 'myapikey' }),
                TypeError
            )
    })

    it('should throw on empty parameters', () => {
      assert.throws(
                () => getGoodTimes(),
                TypeError
            )
    })
  })

  describe('error handling', () => {
    it('should return server side error message', () => {
      const message = 'Nope!'
      forecast()
                .query(true)
                .reply(403, { message: message })

      return assert.isRejected(
                performDefaultCall(),
                message
            )
    })

    it('should contain http status code', () => {
      forecast()
                .query(true)
                .reply(403, { message: 'nope' })

      return assert.isRejected(performDefaultCall())
                .then(e => assert.propertyVal(e, 'status', 403))
    })
  })

  describe('results', () => {
    const BERLIN = {
      coord: {
        lat: 52.524368,
        lon: 13.41053
      }
    }

    it('should return "from" field', () => {
      const time = new Date('2016-12-01T22:00:00+00:00')

      forecast()
                .query(true)
                .reply(200, {
                  city: BERLIN,
                  list: [
                    result({ time: time })
                  ]
                })

      return assert.isFulfilled(performDefaultCall())
                .then(results => {
                  assert.equalDate(
                        results[0].from,
                        time
                    )
                })
    })

    it('should return "to" equal to "from" + 3 hours', () => {
      forecast()
                .query(true)
                .reply(200, {
                  city: BERLIN,
                  list: [
                    result({ time: new Date('2016-12-01T19:00:00+00:00') })
                  ]
                })

      return assert.isFulfilled(performDefaultCall())
                .then(results => {
                  assert.equalDate(
                        results[0].to,
                        new Date('2016-12-01T22:00:00+00:00')
                    )
                })
    })

    it('should return original forecast', () => {
      const originalForecast = result({ time: new Date('2016-12-01T19:00:00+00:00') })
      forecast()
                .query(true)
                .reply(200, {
                  city: BERLIN,
                  list: [
                    originalForecast
                  ]
                })

      return assert.isFulfilled(performDefaultCall())
                .then(results => {
                  assert.deepEqual(
                        results[0].forecast,
                        originalForecast
                    )
                })
    })

    function findTimestamp (timestamp) {
      return res => res.from.getTime() === timestamp.getTime()
    }

    it('should filter out cloudy intervals', () => {
      const cloud0Time = new Date('2016-12-01T19:00:00+00:00')
      const cloud29Time = new Date('2016-12-01T22:00:00+00:00')
      const cloud30Time = new Date('2016-12-02T01:00:00+00:00')
      const cloud100Time = new Date('2016-12-02T04:00:00+00:00')
      forecast()
                .query(true)
                .reply(200, {
                  city: BERLIN,
                  list: [
                    result({ time: cloud0Time, clouds: 0 }),
                    result({ time: cloud29Time, clouds: 29 }),
                    result({ time: cloud30Time, clouds: 30 }),
                    result({ time: cloud100Time, clouds: 100 })
                  ]
                })

      return assert.isFulfilled(performDefaultCall())
                .then(results => {
                  assert.isOk(
                        results.find(findTimestamp(cloud0Time)),
                        `Expected to return ${cloud0Time} with 0 cloudiness`
                    )

                  assert.isOk(
                        results.find(findTimestamp(cloud29Time)),
                        `Expected to return ${cloud29Time} with 29% cloudiness`
                    )

                  assert.isNotOk(
                        results.find(findTimestamp(cloud30Time)),
                        `Expected not to return ${cloud30Time} with 30% cloudiness`
                    )

                  assert.isNotOk(
                        results.find(findTimestamp(cloud100Time)),
                        `Expected not to return ${cloud100Time} with 100% cloudiness`
                    )
                })
    })

    it('should filter out day time', () => {
      const dayTime = new Date('2016-12-01T12:00:00+00:00')
      const nightTime = new Date('2016-12-01T22:00:00+00:00')
      forecast()
                .query(true)
                .reply(200, {
                  city: BERLIN,
                  list: [
                    result({ time: dayTime }),
                    result({ time: nightTime })
                  ]
                })

      return assert.isFulfilled(performDefaultCall())
                .then(results => {
                  assert.isOk(
                        results.find(findTimestamp(nightTime)),
                        `Expected to return ${nightTime} (night)`
                    )

                  assert.isNotOk(
                        results.find(findTimestamp(dayTime)),
                        `Expected not to return ${dayTime} (day)`
                    )
                })
    })
  })
})

'use strict'
const fetch = require('node-fetch')
const querystring = require('querystring')
const SunCalc = require('suncalc')

const FORECAST_URL = 'http://api.openweathermap.org/data/2.5/forecast'

function getGoodTimes (params) {
  const query = buildQueryString(params)

  return fetch(`${FORECAST_URL}?${query}`)
        .then(response => {
          if (response.status !== 200) {
            return handleError(response)
          }
          return response.json()
                .then(pickGoodIntervals)
        })
}

function buildQueryString (params) {
  if (!params) {
    throw new TypeError('Invalid parameters: object expected')
  }

  if (!params.apiKey) {
    throw new TypeError('apiKey is required')
  }

  const query = Object.assign(
        buildQueryStringParams(params),
        { appid: params.apiKey }
    )

  return querystring.stringify(query)
}

function buildQueryStringParams (params) {
  if (params.id) {
    return { id: params.id }
  }

  if (params.city) {
    return { q: params.city }
  }

  if (params.lat && params.lon) {
    return {
      lat: params.lat,
      lon: params.lon
    }
  }
  throw new TypeError('Invalid parameters: expected id, city or {lat, lon} pair')
}

function handleError (response) {
  return response.json()
    .then(data => {
      const error = new Error(data.message)
      error.status = response.status
      return Promise.reject(error)
    })
}

function pickGoodIntervals (forecastResults) {
  const list = convertResults(forecastResults.list)
  return list
    .filter(isSkyClear)
    .filter(forecast => isNight(forecast, forecastResults.city.coord))
}

function convertResults (resultsList) {
  return resultsList.map(result => {
    const from = new Date(result.dt * 1000)
    return {
      from: from,
      to: add3Hours(from),
      forecast: result
    }
  })
}

function add3Hours (date) {
  const threeHours = 10800000 // 3 * 60 * 60 * 1000;
  return new Date(date.getTime() + threeHours)
}

function isSkyClear (interval) {
  return interval.forecast.clouds.all < 30
}

function isNight (interval, coords) {
  const times = SunCalc.getTimes(interval.from, coords.lat, coords.lon)

  return interval.from >= times.night
}

exports.getGoodTimes = getGoodTimes


# stargazing-time

Library that tells you the best time for stargazing in the next 5 days using
[OpenWeatherMap](http://openweathermap.org).

## Usage

First of all, you need to [obtain OpenWeatherMap API
key](http://home.openweathermap.org/users/sign_up).

Once you have it, you can start using the library. You can specify the place you
want to query in 3 different ways:

### Using city name + country code

```js
const StargazingTime = require('stargazing-time');
StargazingTime.getGoodTimes({
        city: 'Berlin,de',
        apiKey: '<YOUR API KEY>'
    })
    .then(results => console.log(results));
```

### Using OpenWeatherMap city id

```js
const StargazingTime = require('stargazing-time');
StargazingTime.getGoodTimes({
        id: 2950159,
        apiKey: '<YOUR API KEY>'
    })
    .then(results => console.log(results));
```

[Find out more about city ids](http://openweathermap.org/forecast5#cityid5);


### Using coordinates

```js
const StargazingTime = require('stargazing-time');
StargazingTime.getGoodTimes({
        lat: 52.52436,
        lon: 13.41053,
        apiKey: '<YOUR API KEY>'
    })
    .then(results => console.log(results));
```

## Response format

`getGoodTimes` returns a promise to array of time intervals in the next 5 days,
which can be good for stargazing. Each element of array has the following
fields:

- `from`: `Date` — beginning time of the interval
- `to`: `Date` — end time of the interval
- `forecast` — original weather forecast, as per [OpenWeatherMap JSON API](http://openweathermap.org/forecast5#JSON).

The time interval considered good if:

1. It is night (doh!) 
2. Cloudiness is less than 30%

## License

MIT

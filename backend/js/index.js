const express = require('express');
const countryjs = require('countryjs');
const polygonCenter = require('geojson-polygon-center');
const fetch = require('node-fetch');

const app = express();

const weatherUrl = 'http://api.openweathermap.org/data/2.5/weather';
const weatherKey = '2c1130f49b3fd9d694aff9d1034a413f';


app.get('/countries', (req, res) => {
    console.log("Query for all countries.");
    const allCountriesArr = countryjs.all();
    const result = allCountriesArr.map(country => {
        return {
            name: country.name,
            code: country.ISO[2],
        }
    });
    res.send(result);
});

app.get('/countries/:code', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for country with ${countryCode} code.`);
    const countryInfo = countryjs.info(countryCode);
    res.send(countryInfo);
});


app.get('/countries/:code/provinces', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for provinces of country with ${countryCode} code.`);
    const {provinces} = countryjs.info(countryCode);
    res.send(provinces);
});

app.get('/countries/:code/wiki', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for wiki redirection for country with ${countryCode} code.`);
    const wiki = countryjs.wiki(countryCode);
    res.redirect(wiki);
});


app.get('/countries/:code/center', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for coordinates of country with ${countryCode} code. Tricky one ;-D`);
    const geoJSON = countryjs.geoJSON(countryCode);
    const center = polygonCenter(geoJSON.features[0].geometry);
    res.send(center);
});


app.get('/countries/:code/weather/capital', (req, res) => {
    const countryCode = req.params.code;
    const capital = countryjs.capital(countryCode);

    console.log(`Query for weather in ${capital} -capital city of country with ${countryCode} code.`);

    let weatherQueryUrl = weatherUrl + `?q=${capital},${countryCode}&appid=${weatherKey}`;
    _getWeatherData(weatherQueryUrl)
    .then(object => {
        const {weather, main, wind, rain} = object;
        console.log(object);
        res.send(object);
    })
    .catch(error => {
        console.log("Logging error:", error.message);
        res.send(error.message);
    });

});

//****************************************** */

app.get('/weatherMath/temperatureMath', (req, res) => {
    const countryCodes = req.query.countries;
    if (!countryCodes) {
        res.send("No country codes!")
        return;
    }

    const codesArr = countryCodes.split(",");

    (async () => {
        const tempAndCodesArray = await _getTempArray(codesArr);

        let data = {};
        let resObject = { data };

        let maxTempData;
        let minTempData;
        tempAndCodesArray.forEach(elem => {
            data[elem.code] = elem.msg ? elem.msg : elem.temp;
            if (elem.temp) {
                if (!maxTempData || elem.temp > maxTempData.temp) {
                    maxTempData = elem;
                }

                if (!minTempData || elem.temp < minTempData.temp) {
                    minTempData = elem;
                }
            }
        });

        if (maxTempData) {
            resObject.countryMaxTemperature = maxTempData.code;
            resObject.temperatureMax = maxTempData.temp;
        }

        if (minTempData) {
            resObject.countryMinTemperature = minTempData.code;
            resObject.temperatureMin = minTempData.temp;
        }

        let temperatureSum = tempAndCodesArray.reduce((prev, curr) => {
            if (curr.temp) {
                return prev + curr.temp;
            } else {
                return prev;
            }
        }, 0);

        resObject.temperatureAvg = temperatureSum / tempAndCodesArray.length;

        res.send(resObject);
        return;
    })();

});

app.get('/weatherMath/humidityMath', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for country with ${countryCode} code.`);
    const countryInfo = countryjs.info(countryCode);
    res.send(countryInfo);
});


app.listen(3000, () => {
    console.log(`Server up and running!`);
});

function _getWeatherData(weatherQueryUrl) {
    return fetch(weatherQueryUrl)
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error("Connection lost!");
            }
        });
}

async function _getTempArray(codesArr) {
    return await Promise.all(codesArr.map(async code => {
        const capital = countryjs.capital(code);
        let weatherQueryUrl = weatherUrl + `?q=${capital},${code}&appid=${weatherKey}`;

        return _getWeatherData(weatherQueryUrl)
            .then(object => {
                const { temp, temp_min, temp_max } = object.main;
                return { temp, code };
            })
            .catch(error => {
                console.log("Logging error:", error.message);
                return new Promise(res => res({code, msg: "No data"}));
            });
    }));
}

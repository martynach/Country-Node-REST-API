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
    const result = allCountriesArr.map(country => ({
        name: country.name,
        code: country.ISO[2],
    })
    );

    res.send(result);

});

app.get('/countries/:code', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for country with ${countryCode} code.`);

    const error = getErrorResponseIfCountryDoesNotExist(countryCode);
    if(error) {
        res.send(error);
        return;
    }

    const countryInfo = countryjs.info(countryCode);
    res.send(countryInfo);
});

app.get('/countries/:code/provinces', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for provinces of country with ${countryCode} code.`);

    const error = getErrorResponseIfCountryDoesNotExist(countryCode);
    if(error) {
        res.send(error);
        return;
    }

    const {provinces} = countryjs.info(countryCode);
    res.send(provinces);
});

app.get('/countries/:code/wiki', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for wiki redirection for country with ${countryCode} code.`);

    const error = getErrorResponseIfCountryDoesNotExist(countryCode);
    if(error) {
        res.send(error);
        return;
    }

    const wiki = countryjs.wiki(countryCode);
    res.redirect(wiki);
});

app.get('/countries/:code/center', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for coordinates of country with ${countryCode} code. Tricky one ;-D`);

    const error = getErrorResponseIfCountryDoesNotExist(countryCode);
    if(error) {
        res.send(error);
        return;
    }

    const geoJSON = countryjs.geoJSON(countryCode);
    const center = polygonCenter(geoJSON.features[0].geometry);
    res.send(center);
});

app.get('/countries/:code/weather/capital', (req, res) => {
    const countryCode = req.params.code;
    console.log(`Query for weather in capital city of country with ${countryCode} code.`);

    const error = getErrorResponseIfCountryDoesNotExist(countryCode);
    if(error) {
        res.send(error);
        return;
    }

    const capital = countryjs.capital(countryCode);

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

app.get('/weatherMath/temperatureMath', (req, res) => {

    const error = validateCountriesAndGetErrorResponse(req.query.countries);
    if (error) {
        res.send(error);
        return;
    }

    (async () => {
        res.send(await getJsonResponseForWhatCalculation("temp", req.query.countries));
    })();

});

app.get('/weatherMath/humidityMath', (req, res) => {

    const error = validateCountriesAndGetErrorResponse(req.query.countries);
    if (error) {
        res.send(error);
        return;
    }

    (async () => {
        res.send(await getJsonResponseForWhatCalculation("humidity", req.query.countries));
    })();

});

app.get('/weatherMath/pressureMath', (req, res) => {

    const error = validateCountriesAndGetErrorResponse(req.query.countries);
    if (error) {
        res.send(error);
        return;
    }

    (async () => {
        res.send(await getJsonResponseForWhatCalculation("pressure", req.query.countries));
    })();

});

/**
 * returns json response with errorMessage if country with given code does not exist
 * @param {*} code - code of country to check
 */
function getErrorResponseIfCountryDoesNotExist(code) {
    const countryInfo = countryjs.info(code);
    if (!countryInfo) {
        return JSON.stringify({ errorMessage: `Country with ${code} code not found.` });
    }
}

/**
 * returns json response with errorMessage if any of given countries does not exist;
 * errorMessage contains information only about first country which does not exist
 * @param {*} codesString - string containing codes of countries to check separated by comma
 */
function validateCountriesAndGetErrorResponse(codesString) {

    if(!codesString) {
        return JSON.stringify({errorMessage: "No country codes provided."});
    }

    const codesArr = codesString.split(",");
    for (code of codesArr) {
        const error = getErrorResponseIfCountryDoesNotExist(code);
        if (error) {
            return error;
        }
    }
}

/**
 * This function creates json response after doint some math for countries with given codes
 * and using weather data given by what argument
 * @param {*} what - can one one of three possible values: temp, humidity, pressure
 * @param {*} countryCodes - valid country codes
 */
async function getJsonResponseForWhatCalculation(what, countryCodes) {
    console.log("Query for ", what, "analysis for countries with codes:", countryCodes);

    const codesArr = countryCodes.split(",");
    const weatherDataAndCodesArray = await _getWeatherDataArray(codesArr);

    let data = {};
    let resObject = { data };

    let maxData;
    let minData;
    weatherDataAndCodesArray.forEach(elem => {
        data[elem.code] = elem.msg ? elem.msg : elem[what];
        if (elem[what]) {
            if (!maxData || elem[what] > maxData[what]) {
                maxData = elem;
            }

            if (!minData || elem[what] < minData[what]) {
                minData = elem;
            }
        }
    });

    if (maxData) {
        resObject["countryMax" + what] = maxData.code;
        resObject[what + "Max"] = maxData[what];
    }

    if (minData) {
        resObject["countryMin" + what] = minData.code;
        resObject[what + "Min"] = minData[what];
    }

    let sum = weatherDataAndCodesArray.reduce((prev, curr) =>
        curr[what] ? prev + curr[what] : prev
        , 0);

    resObject[what + "Avg"] = sum / weatherDataAndCodesArray.length;

    return resObject;
}



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

async function _getWeatherDataArray(codesArr) {
    return await Promise.all(codesArr.map(async code => {
        const capital = countryjs.capital(code);
        let weatherQueryUrl = weatherUrl + `?q=${capital},${code}&appid=${weatherKey}`;

        return _getWeatherData(weatherQueryUrl)
            .then(object => {
                const { temp, humidity, pressure } = object.main;
                return { temp, humidity, pressure, code };
            })
            .catch(error => {
                console.log("Logging error:", error.message);
                return {code, msg: "No data"};
            });
    }));
}


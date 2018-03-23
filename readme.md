# API RESTowe które zwróci trochę informacji o krajach oraz o pogodzie:

### Źródła danych:
### 1. https://www.npmjs.com/package/countryjs
### 2. https://openweathermap.org/

## /countries
Lista krajów zawierająca nazwę i ich dwuliterowe kody, np.
[
	{
		name: ‘Poland’,
		code: ‘PL’
}
]

## /countries/{code}
Np. /countries/PL
Zwraca wszystkie informacje o kraju jakie mamy

## /countries/{code}/provinces
Zwraca tablicę będącą lista stanów/prowincji w danym kraju

## /countries/{code}/wiki
Przekierowuje do artykułu na wikipedii na temat danego kraju

## /countries/{code}/weather/capital
Podaje aktualną pogodę w stolicy danego kraju

## /countries/{code}/center
Zwraca współrzędne środka kraju


## /weatherMath/temperatureMath?countries={code1},{code2},...
Analizuje temperatury w stolicach krajów

Zwraca:
{
	data: {
		‘{code1}’: 0.00,
		‘{code2}’: 0.00,
		...
},
countryMaxTemperature: ‘{code}’
countryMinTemperature: ‘{code}’
temperatureMin: 0.00,
temperatureMax: 0.00,
temperatureAvg: 0.00,
}

## /weatherMath/humidityMath?countries={code1},{code2},...
## /weatherMath/pressureMath?countries={code1},{code2},...
jak powyżej tylko z odpowiednimi nazwami

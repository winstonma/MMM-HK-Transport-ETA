/* global WeatherProvider, ETAObject */

/* Magic Mirror
 * Module: Weather
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

HKTransportETAProvider.register("mtrbus", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "MTR Bus",

	// Set the default config properties that is specific to this provider
	defaults: {
		apiBase: "https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule"
	},

	// Overwrite the fetchETA method.
	fetchETA() {
		const lang = 'en';
		const dataObject = { "language": lang, "routeName": this.config.line };
		this.fetchData(this.config.apiBase, method = "POST", data = dataObject)
			.then((data) => {
				const correntETA = this.generateETAObject(data);
				this.setCurrentETA(correntETA);
			})
			.catch(function (request) {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	/*
	 * Generate a ETAObject based on currentWeatherInformation
	 */
	generateETAObject(currentETAData) {
		const stop = currentETAData.busStop.find((s) => s.busStopId === this.config.sta);

		if (!stop) {
		  //return currentETAData.routeStatusRemarkTitle ?? '尾班車已過或未有到站時間提供';
		  return [];
		}
	  
		const etas = stop.bus.map(
		  ({ arrivalTimeInSecond, departureTimeInSecond, isDelayed, isScheduled }) => ({
			time: moment().add(arrivalTimeInSecond || departureTimeInSecond, 'seconds'),
			isDelayed: (isDelayed === '1'),
			isScheduled: (isScheduled === '1')
		  })
		);

		return etas;
	},

	/*
	 * Convert the OpenWeatherMap icons to a more usable name.
	 */
	convertWeatherType(weatherType) {
		const weatherTypes = {
			"01d": "day-sunny",
			"02d": "day-cloudy",
			"03d": "cloudy",
			"04d": "cloudy-windy",
			"09d": "showers",
			"10d": "rain",
			"11d": "thunderstorm",
			"13d": "snow",
			"50d": "fog",
			"01n": "night-clear",
			"02n": "night-cloudy",
			"03n": "night-cloudy",
			"04n": "night-cloudy",
			"09n": "night-showers",
			"10n": "night-rain",
			"11n": "night-thunderstorm",
			"13n": "night-snow",
			"50n": "night-alt-cloudy-windy"
		};

		return weatherTypes.hasOwnProperty(weatherType) ? weatherTypes[weatherType] : null;
	},

	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams() {
		let params = "?";

		params += "&language=" + 'zh';
		params += "&routeName=" + 'K12';

		return params;
	}
});

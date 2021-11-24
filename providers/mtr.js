/* global WeatherProvider, ETAObject */

/* Magic Mirror
 * Module: Weather
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

HKTransportETAProvider.register("mtr", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "MTR",

	// Set the default config properties that is specific to this provider
	defaults: {
		apiBase: "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php"
	},

	// Overwrite the fetchETA method.
	fetchETA() {
		this.fetchData(this.getUrl())
			.then((data) => {
				const correntETA = this.generateETAObject(data);
				this.setCurrentETA(correntETA);
			})
			.catch(function (request) {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	/** OpenWeatherMap Specific Methods - These are not part of the default provider methods */
	/*
	 * Gets the complete url for the request
	 */
	getUrl() {
		return this.config.apiBase + this.getParams();
	},

	/*
	 * Generate a ETAObject based on currentWeatherInformation
	 */
	generateETAObject(currentETAData) {
		const etas = [];

		const etaObject = Object.values(currentETAData.data)[0];

		etaObject.UP.reduce((r, a) => {
			r[a.dest] = [...r[a.dest] || [], a];
			return r;
		}, {});

		// Push object inside 'UP'
		if (etaObject.UP) {
			const groupByDest = etaObject.UP.reduce((r, a) => {
				r[a.dest] = [...r[a.dest] || [], a];
				return r;
			}, {});
			const result = Object.keys(groupByDest).map((key) => {
				let retVal = {};
				retVal.dest = key;
				retVal.time = Object.values(groupByDest[key]).map(value => value.time);
				return retVal;
			})[0];
			etas.push(result);
		}

		if (etaObject.DOWN) {
			const groupByDest = etaObject.DOWN.reduce((r, a) => {
				r[a.dest] = [...r[a.dest] || [], a];
				return r;
			}, {});
			const result = Object.keys(groupByDest).map((key) => {
				let retVal = {};
				retVal.dest = key;
				retVal.time = Object.values(groupByDest[key]).map(value => value.time);
				return retVal;
			})[0];
			etas.push(result);
		}

		return etas;
	},

	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams() {
		let params = "?";

		params += "&line=" + this.config.line;
		params += "&sta=" + this.config.sta;

		return params;
	}
});

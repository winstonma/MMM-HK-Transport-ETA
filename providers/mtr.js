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
		apiBase: "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php",
		mtrLines: "https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/mtr-lines.json",
		mtrData: {},
		lineInfo: []
	},

	// Overwrite the fetchETA method.
	async fetchETA() {

		if (this.config.lineInfo.length === 0) {
			this.config.lineInfo = await this.fetchStationInfo();
		}

		Promise.all(this.config.lineInfo.map(station => this.fetchData(this.getUrl(station))))
			.then(dataArray => {
				const currentETAArray = dataArray.map(data => this.generateETAObject(data));
				this.setCurrentETA(currentETAArray);
			})
			.catch(function (request) {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	fetchStationInfo() {
		return this.fetchData(this.config.mtrLines)
			.then(data => {
				this.config.mtrData = data;

				// Find the valid line and routes
				return Object.entries(data)
					.map(([key, value]) => value.stations.map(station => ({
						line_code: key,
						line: this.config.lang.startsWith("zh") ? value.tc : value.en,
						station: this.config.lang.startsWith("zh") ? station.tc : station.en,
						station_tc: station.tc,
						station_en: station.en,
						station_code: station.code
					})))
					.flat()
					.filter(station => ([station.station_tc, station.station_en].includes(this.config.sta)))
			})
			.catch(function (request) {
				Log.error("Could not load data ... ", request);
			});
	},

	/** OpenWeatherMap Specific Methods - These are not part of the default provider methods */
	/*
	 * Gets the complete url for the request
	 */
	getUrl(stationInfo) {
		return this.config.apiBase + this.getParams(stationInfo);
	},

	/*
	 * Generate a ETAObject based on currentWeatherInformation
	 */
	generateETAObject(currentETAData) {
		const etaObject = Object.values(currentETAData.data)[0];

		const [lineCode, stationCode] = Object.keys(currentETAData.data)[0].split("-");
		const lang = this.config.lang.startsWith("zh") ? "tc" : "en";
		const stationInfo = this.config.lineInfo.find(station => ((station.line_code === lineCode) && (station.station_code === stationCode)));

		return {
			line: stationInfo.line,
			station: stationInfo.station,
			etas: Object.keys(etaObject)
				.filter(key => ['UP', 'DOWN'].includes(key))
				.map(direction => {
					const groupByDest = etaObject[direction].reduce((r, a) => {
						const destination = this.config.mtrData[lineCode].stations.find(station => station.code === a.dest)[lang];
						r[destination] = [...r[destination] || [], a];
						return r;
					}, {});
					return Object.entries(groupByDest).map(([key, value]) => ({
						dest: key,
						time: value.map(eta => eta.time)
					}))[0];
				})
		}
	},

	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams(stationInfo) {
		let params = "?";

		params += "&line=" + stationInfo.line_code;
		params += "&sta=" + stationInfo.station_code;

		return params;
	}
});

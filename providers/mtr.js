/* global ETAProvider, ETAObject */

/* MagicMirror²
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
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
		mtrLines: "/modules/MMM-HK-Transport-ETA/telegram-hketa/data/mtr-lines.json",
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
					.map(([key, lineInfo]) =>
						lineInfo.stations.filter(station => ([station.tc, station.en].includes(this.config.sta)))
							.map(station => ({
								line_code: key,
								line: this.config.lang.startsWith("zh") ? lineInfo.tc : lineInfo.en,
								station: this.config.lang.startsWith("zh") ? station.tc : station.en,
								station_code: station.code
							}))
					)
					.flat()
			})
			.catch(function (request) {
				Log.error("Could not load data ... ", request);
			});
	},

	/** MTR Specific Methods - These are not part of the default provider methods */
	/*
	 * Gets the complete url for the request
	 */
	getUrl(stationInfo) {
		return this.config.apiBase + this.getParams(stationInfo);
	},

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(currentETAData) {
		const etaObject = Object.values(currentETAData.data)[0];

		const [lineCode, stationCode] = Object.keys(currentETAData.data)[0].split("-");
		const lang = this.config.lang.startsWith("zh") ? "tc" : "en";
		const stationInfo = this.config.lineInfo.find(station => ((station.line_code === lineCode) && (station.station_code === stationCode)));
		const etas = Object.keys(etaObject)
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
			}).filter(n => n);

		return {
			line: stationInfo.line,
			station: stationInfo.station,
			etas: etas
		}
	},

	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams(stationInfo) {
		const params = "?";

		params += "&line=" + stationInfo.line_code;
		params += "&sta=" + stationInfo.station_code;

		return params;
	}
});

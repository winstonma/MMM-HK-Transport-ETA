/* global WeatherProvider, ETAObject */

/* Magic Mirror
 * Module: Weather
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

HKTransportETAProvider.register("gmb", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "GMB",

	// Set the default config properties that is specific to this provider
	defaults: {
		apiBase: "https://data.etagmb.gov.hk",
		routeData: {},
		lineInfo: []
	},

	// Overwrite the fetchETA method.
	async fetchETA() {

		if (this.config.lineInfo.length === 0) {
			this.config.lineInfo = await this.fetchRouteInfo();
		}

		Promise.all(this.config.lineInfo.map(station =>
			this.fetchData(this.getUrl(station))
				.then(data => this.generateETAObject(station, data))
		)).then(currentETAArray => {
			this.setCurrentETA(currentETAArray);
		})
			.catch(request => {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	fetchRouteInfo() {
		const routeURL = `${this.config.apiBase}/route/${this.config.area}/${this.config.line}`;
		return this.fetchData(routeURL)
			.then(data => {
				this.config.routeData = data;

				// Find the valid line and routes
				return {
					directions: data.data[0].directions,
					routeID: data.data[0].route_id
				};
			}).then(data =>
				Promise.all(data.directions.map(route => this.fetchData(`${this.config.apiBase}/route-stop/${data.routeID}/${route.route_seq}`)
					.then(retValue => ({
						routeData: retValue,
						routeID: data.routeID,
						routeSeq: route.route_seq,
						dest: this.config.lang.startsWith("zh") ? route.dest_tc : route.dest_en,
					}))
				))
			).then(data =>
				data.map(route => route.routeData.data.route_stops.map(stopData => ({
					...stopData,
					routeID: route.routeID,
					routeSeq: route.routeSeq,
					station: this.config.lang.startsWith("zh") ? stopData.name_tc : stopData.name_en,
					dest: route.dest
				})))
					.flat()
					.filter(stop => stop.name_tc === this.config.sta)
			)
			.catch(request => {
				Log.error("Could not load data ... ", request);
			});
	},

	/** OpenWeatherMap Specific Methods - These are not part of the default provider methods */
	/*
	 * Gets the complete url for the request
	 */
	getUrl(stationInfo) {
		return `${this.config.apiBase}/eta/route-stop/${stationInfo.routeID}/${stationInfo.stop_id}`;
	},

	/*
	 * Generate a ETAObject based on currentWeatherInformation
	 */
	generateETAObject(stationInfo, currentETAData) {
		return {
			line: this.config.line,
			station: stationInfo.station,
			etas: [{
				dest: stationInfo.dest,
				time: currentETAData.data[0].eta?.map(time => time.timestamp)
			}]
		}
	},
});

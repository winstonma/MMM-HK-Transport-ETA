/* global ETAProvider, ETAObject */

/* Magic Mirror
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
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
				return data.data[0];
			}).then(routeInfo =>
				Promise.all(routeInfo.directions.map(route => this.fetchData(`${this.config.apiBase}/route-stop/${routeInfo.route_id}/${route.route_seq}`)
					.then(retValue =>
						retValue.data.route_stops.filter(stop => stop.stop_id === this.config.sta)
							.map(stop => ({
								...stop,
								routeID: routeInfo.route_id,
								routeSeq: route.routeSeq,
								station: this.config.lang.startsWith("zh") ? stop.name_tc : stop.name_en,
								dest: this.config.lang.startsWith("zh") ? route.dest_tc : route.dest_en,
							}))
					)
				))
			).then(data => data.flat())
			.catch(request => {
				Log.error("Could not load data ... ", request);
			});
	},

	/** GMB Specific Methods - These are not part of the default provider methods */
	/*
	 * Gets the complete url for the request
	 */
	getUrl(stationInfo) {
		return `${this.config.apiBase}/eta/route-stop/${stationInfo.routeID}/${stationInfo.stop_id}`;
	},

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(stationInfo, currentETAData) {
		const etas = (currentETAData.data[0].eta?.length === 0) ? null : [{
			dest: stationInfo.dest,
			time: currentETAData.data[0].eta?.map(time => time.timestamp)
		}];
		return {
			line: this.config.line,
			station: stationInfo.station,
			etas: etas
		}
	},
});

/* global ETAProvider, ETAObject */

/* MagicMirror²
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
		stationInfo: null
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		if (this.config.stationInfo === null) {
			this.config.stationInfo = await this.fetchRouteInfo();
		}
	
		try {
			const url = this.getUrl(this.config.stationInfo);
			const data = await this.fetchData(url);

			// Generate the ETA object and update current eta
			const etaObject = this.generateETAObject(data.data);
			const currentETAArray = Array.isArray(etaObject) ? etaObject : [etaObject];

			this.setCurrentETA(currentETAArray);
		} catch (request) {
			Log.error("Could not load data ... ", request);
		} finally {
			this.updateAvailable();
		}
	},

	async fetchRouteInfo() {
		try {
			const routeURL = `${this.config.apiBase}/route/${this.config.area}/${this.config.line}`;
			const routeData = await this.fetchData(routeURL);
			
			if (!routeData.data || !routeData.data[0]) {
				throw new Error("Invalid route data received");
			}
	
			const routeInfo = routeData.data[0];
			const stopPromises = routeInfo.directions.map(async (route) => {
				const stopsResponse = await this.fetchData(`${this.config.apiBase}/route-stop/${routeInfo.route_id}/${route.route_seq}`);
				return stopsResponse.data.route_stops
					.filter(stop => stop.stop_id === this.config.sta)
					.map(stop => ({
						...stop,
						routeID: routeInfo.route_id,
						routeSeq: route.routeSeq,
						station: this.config.lang.startsWith("zh") ? stop.name_tc : stop.name_en,
						dest: this.config.lang.startsWith("zh") ? route.dest_tc : route.dest_en,
					}));
			});
	
			const stopData = await Promise.all(stopPromises);

			return stopData.flat()[0];
		} catch (request) {
			Log.error("Could not load data ... ", request);
			throw request; // Rethrow the error for further handling if necessary
		}
	},

	/** GMB Specific Methods - These are not part of the default provider methods */
	/*
	 * Gets the complete url for the request
	 */
	getUrl(stationInfo) {
		return `${this.config.apiBase}/eta/route-stop/${stationInfo.routeID}/${this.config.sta}`;
	},

	/**
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(currentETAData) {
		const getTargetStation = (etaData) => {
			if (this.config.stop_seq) {
				const outputData = etaData.find(etaData => etaData.stop_seq == this.config.stop_seq);
				return Array.isArray(outputData) ? outputData : [outputData];
			} else {
				return etaData
			}
		}

		const targetStation = getTargetStation(currentETAData);
		return targetStation.map(data => ({
			line: this.config.line,
			station: this.config.stationInfo.station,
			etas: data.eta?.length === 0 ? null : [{
				dest: this.config.stationInfo.dest,
				time: data.eta.map(etaData => etaData.timestamp)
			}]
		}));
	},
});

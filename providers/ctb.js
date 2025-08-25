/* global ETAProvider, ETAObject */

/* MagicMirror²
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

HKTransportETAProvider.register("ctb", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "CTB",

	// Set the default config properties that is specific to this provider
	defaults: {
		apiBase: "https://rt.data.gov.hk/v1.1",
		stopInfo: null,
		stopRouteInfo: null
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		try {
			if (!this.config.stopInfo || !this.config.stopRouteInfo) {
				this.config.stopInfo = await this.fetchStopInfo();
				this.config.stopRouteInfo = await this.fetchStopRouteInfo();
			}

			const etaData = await Promise.all(this.config.stopRouteInfo.map(stopRoute =>
				this.fetchData(this.getUrl(stopRoute.route))
					.then(data => data.data)
			));

			const filteredData = etaData.filter(etaInfo => etaInfo?.length);
			const currentETAArray = this.generateETAObject(filteredData);
			this.setCurrentETA(currentETAArray);
		} catch (error) {
			Log.error("Error fetching ETA data:", error.message);
		} finally {
			this.updateAvailable();
		}
	},

	fetchStopInfo() {
		const stopURL = `${this.config.apiBase}/transport/citybus-nwfb/stop/${this.config.sta}`;
		return this.fetchData(stopURL)
			.then(data => data.data)
			.catch(request => {
				Log.error("Could not load data ... ", request);
			});
	},

	fetchStopRouteInfo() {
		const stopURL = `${this.config.apiBase}/transport/batch/stop-route/${this.providerName}/${this.config.sta}`;
		return this.fetchData(stopURL)
			.then(data => data.data)
			.catch(request => {
				Log.error("Could not load data ... ", request);
			});
	},

	/*
	 * Gets the complete url for the request
	 */
	getUrl(route) {
		return `${this.config.apiBase}/transport/citybus-nwfb/eta/${this.providerName}/${this.config.sta}/${route}`;
	},

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(currentETAArray) {
		return currentETAArray.map(currentETA => {
			// Group ETAs by direction
			const etasByDirection = this.groupETAsByDirection(currentETA);
			
			// Get first direction's data since we only use index 0
			const [firstDirection] = Object.values(etasByDirection);
			if (!firstDirection?.length) return null;
			
			const [firstETA] = firstDirection;
			return {
				line: firstETA.route,
				station: this.getLocalizedStationName(),
				etas: [{
					dest: this.getLocalizedDestination(firstETA),
					time: firstDirection.map(eta => eta.eta)
				}]
			};
		}).filter(Boolean);
	},

	// Helper methods to improve readability
	groupETAsByDirection(etaList) {
		return etaList.reduce((groups, eta) => {
			groups[eta.dir] = groups[eta.dir] || [];
			groups[eta.dir].push(eta);
			return groups;
		}, {});
	},

	getLocalizedStationName() {
		return this.config.lang.startsWith("zh") 
			? this.config.stopInfo.name_tc 
			: this.config.stopInfo.name_en;
	},

	getLocalizedDestination(eta) {
		return this.config.lang.startsWith("zh") 
			? eta.dest_tc 
			: eta.dest_en;
	},

	init(config) {
		if (!config.apiBase) {
			throw new Error("API base URL is required");
		}
		if (!config.sta) {
			throw new Error("Station ID is required");
		}
		super.init(config);
	}
});

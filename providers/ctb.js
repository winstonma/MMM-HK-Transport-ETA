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
		apiBase: "https://rt.data.gov.hk/v2/transport/citybus",
		company_id: "CTB",
		stopInfo: null,
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		try {
			if (!this.config.stopInfo) {
				this.config.stopInfo = await this.fetchStopInfo();
			}

			const etaData = await Promise.all(
				this.config.routes.map(async (stopRoute) => {
					const url = this.getUrl(stopRoute.route);
					const data = await this.fetchData(url);
					if (data && data.data) {
						return { data: data.data, dir: stopRoute.dir };
					} else {
						Log.warn(
							`No data.data found for route ${stopRoute.route}. Full response:`,
							data,
						);
						return null;
					}
				}),
			);

			const filteredData = etaData.filter((item) => item?.data?.length);
			const currentETAArray = this.generateETAObject(filteredData);

			this.setCurrentETA(currentETAArray);
		} catch (error) {
			Log.error("Error fetching ETA data:", error.message);
		} finally {
			this.updateAvailable();
		}
	},

	fetchStopInfo() {
		const stopURL = `${this.config.apiBase}/stop/${this.config.sta}`;
		return this.fetchData(stopURL)
			.then((data) => data.data)
			.catch((error) => {
				Log.error("Could not load stop info ... ", error);
				throw error; // Re-throw the error to propagate it
			});
	},

	/*
	 * Gets the complete url for the request
	 */
	getUrl(route) {
		return `${this.config.apiBase}/eta/${this.config.company_id}/${this.config.sta}/${route}`;
	},

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(etaDataListWithDir) {
		let combinedETAData = [];
		etaDataListWithDir.forEach((item) => {
			let etas = item.data;
			if (item.dir) {
				etas = etas.filter((eta) => eta.dir === item.dir);
			}
			combinedETAData = combinedETAData.concat(etas);
		});

		if (!combinedETAData || combinedETAData.length === 0) {
			return [];
		}

		const firstETA = combinedETAData[0];
		const route = firstETA.route;

		// Group ETAs by destination
		const etasByDestination = combinedETAData.reduce((groups, eta) => {
			const dest = this.getLocalizedDestination(eta);
			groups[dest] = groups[dest] || [];
			groups[dest].push(eta.eta);
			return groups;
		}, {});

		const etasArray = Object.entries(etasByDestination).map(
			([dest, times]) => ({
				dest: dest,
				time: times,
			}),
		);

		return [
			{
				line: route,
				etas: etasArray,
			},
		];
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
		if (!this.config.stopInfo) {
			return null;
		}
		return this.config.lang.startsWith("zh")
			? this.config.stopInfo.name_tc
			: this.config.stopInfo.name_en;
	},

	getLocalizedDestination(eta) {
		return this.config.lang.startsWith("zh") ? eta.dest_tc : eta.dest_en;
	},

	getHeader: function () {
		return this.getLocalizedStationName();
	},
});

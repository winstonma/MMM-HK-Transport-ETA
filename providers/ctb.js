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
		if (!this.config.stopInfo) {
			this.config.stopInfo = await this.fetchStopInfo();
			this.config.stopRouteInfo = await this.fetchStopRouteInfo();
		}

		Promise.all(this.config.stopRouteInfo.map(stopRoute =>
			this.fetchData(this.getUrl(stopRoute.route))
				.then(data => data.data)
		))
			.then(data => data.filter(etaInfo => etaInfo.length))
			.then(data => this.generateETAObject(data))
			.then(currentETAArray => {
				this.setCurrentETA(currentETAArray);
			})
			.catch(request => {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
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
			const groupedETA = currentETA.reduce((group, product) => {
				const { dir } = product;
				group[dir] = group[dir] ?? [];
				group[dir].push(product);
				return group;
			}, {});
			return Object.keys(groupedETA).map((key, index) => {
				const value = groupedETA[key];
				return {
					line: value[0].route,
					station: this.config.lang.startsWith("zh") ? this.config.stopInfo.name_tc : this.config.stopInfo.name_en,
					etas: [{
						dest: this.config.lang.startsWith("zh") ? value[0].dest_tc : value[0].dest_en,
						time: value.map(eta => eta.eta)
					}]
				}
			})[0];
		});
	},
});

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
		stopInfo: null
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		if (!this.config.stopInfo) {
			this.config.stopInfo = await this.fetchStopInfo();
		}

		this.fetchData(this.getUrl())
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

	/*
	 * Gets the complete url for the request
	 */
	getUrl() {
		return `${this.config.apiBase}/transport/citybus-nwfb/eta/CTB/${this.config.sta}/${this.config.line}`;
	},

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(currentETAData) {
		const groupedETA = currentETAData.data.reduce((group, product) => {
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
		});
	},
});

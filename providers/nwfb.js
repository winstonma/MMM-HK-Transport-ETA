/* MagicMirror²
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

HKTransportETAProvider.register("nwfb", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "NWFB",

	// Set the default config properties that is specific to this provider
	defaults: {
		apiBase: "https://rt.data.gov.hk/v1.1",
		stopInfo: null,
		stopRouteInfo: null,
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		try {
			if (!this.config.stopInfo) {
				this.config.stopInfo = await this.fetchStopInfo();
				this.config.stopRouteInfo = await this.fetchStopRouteInfo();
			}

			const routeData = await Promise.all(
				this.config.stopRouteInfo.map(async (stopRoute) => {
					const data = await this.fetchData(
						this.getUrl(stopRoute.route),
					);
					return data.data;
				}),
			);

			const filteredData = routeData.filter((etaInfo) => etaInfo.length);
			const currentETAArray = this.generateETAObject(filteredData);
			this.setCurrentETA(currentETAArray);
		} catch (error) {
			Log.error("Could not load data ... ", error);
		} finally {
			this.updateAvailable();
		}
	},

	async fetchStopInfo() {
		const stopURL = `${this.config.apiBase}/transport/citybus-nwfb/stop/${this.config.sta}`;
		try {
			const data = await this.fetchData(stopURL);
			return data.data;
		} catch (error) {
			Log.error("Could not load data ... ", error);
		}
	},

	async fetchStopRouteInfo() {
		const stopURL = `${this.config.apiBase}/transport/batch/stop-route/${this.providerName}/${this.config.sta}`;
		try {
			const data = await this.fetchData(stopURL);
			return data.data;
		} catch (error) {
			Log.error("Could not load data ... ", error);
		}
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
		return currentETAArray.map((currentETA) => {
			if (!currentETA || currentETA.length === 0) {
				Log.warn(
					"Invalid ETA data received for currentETA.",
					currentETA,
				);
				return null;
			}

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
					station: this.config.lang.startsWith("zh")
						? this.config.stopInfo.name_tc
						: this.config.stopInfo.name_en,
					etas: [
						{
							dest: this.config.lang.startsWith("zh")
								? value[0].dest_tc
								: value[0].dest_en,
							time: value.map((eta) => eta.eta),
						},
					],
				};
			})[0];
		});
	},
});

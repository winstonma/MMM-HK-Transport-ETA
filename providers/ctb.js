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
		newDataURL:
			"https://winstonma.github.io/MMM-HK-Transport-ETA-Data/ctb/stops",
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		try {
			if (!this.config.stopInfo) {
				this.config.stopInfo = await this.fetchStopInfo();
			}

			// Use routes from config instead of fetching them dynamically
			if (this.config.routes && Array.isArray(this.config.routes)) {
				// Fetch ETA data for each route using the fetchRouteETA function
				const etaData = (
					await Promise.all(
						this.config.routes.map(async (routeObj) => {
							const data = await this.fetchRouteETA(routeObj);
							// Filter out null or empty data immediately
							return data && data.length ? data : null;
						}),
					)
				).filter((item) => item); // Filter out null values immediately

				const currentETAArray = this.generateETAObject(etaData);

				this.setCurrentETA(currentETAArray);
			} else {
				Log.warn("No routes configured for CTB provider");
				this.setCurrentETA([]);
			}
		} catch (error) {
			Log.error("Error fetching ETA data:", error.message);
		} finally {
			this.updateAvailable();
		}
	},

	async fetchStopInfo() {
		try {
			// First try to fetch from the new data source
			const newDataURL = `${this.config.newDataURL}/${this.config.sta}.json`;

			try {
				const newData = await this.fetchData(newDataURL);

				// Check if we received valid data from the new source
				if (
					newData &&
					(newData.name_tc || newData.name_en || newData.name_sc)
				) {
					// If this.config.routes doesn't exist and the new data has routes, populate it
					if (
						!this.config.routes &&
						newData.routes &&
						Array.isArray(newData.routes)
					) {
						this.config.routes = newData.routes.map((route) => ({
							route: route,
						}));
					}
					return newData;
				}
			} catch (newDataError) {
				Log.warn(
					`Failed to fetch from new data source for stop ${this.config.sta}, falling back to original API:`,
					newDataError.message,
				);
			}

			// Fallback to original logic if new data source fails
			const stopURL = `${this.config.apiBase}/stop/${this.config.sta}`;
			const data = await this.fetchData(stopURL);

			// Check if we received valid data
			if (!data) {
				Log.warn(
					`No data received for stop ${this.config.sta}. Full response:`,
					data,
				);
				return null;
			}

			// Check if the data object has the expected structure
			if (!data.data) {
				Log.warn(
					`No data.data found for stop ${this.config.sta}. Full response:`,
					data,
				);
				return null;
			}

			return data.data;
		} catch (error) {
			Log.error(
				`Could not load stop info for stop ${this.config.sta} ... `,
				error,
			);
			throw error; // Re-throw the error to propagate it
		}
	},

	async fetchRouteETA(routeObj) {
		try {
			// Generate the URL for the ETA request
			const routeStr =
				typeof routeObj.route === "object" && routeObj.route !== null
					? routeObj.route.route || String(routeObj.route)
					: String(routeObj.route);

			const url = `${this.config.apiBase}/eta/${this.config.company_id}/${this.config.sta}/${routeStr}`;

			// Fetch the data
			const data = await this.fetchData(url);
			if (data && data.data) {
				return data.data;
			} else {
				Log.warn(
					`No data.data found for route ${routeObj.route}. Full response:`,
					data,
				);
				return null;
			}
		} catch (error) {
			Log.error(
				`Error fetching ETA for route ${routeObj.route}:`,
				error.message,
			);
			return null;
		}
	},

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(etaData) {
		// Flatten the array of arrays into a single array of ETA objects
		let combinedETAData = [].concat(...etaData);

		// Check if we have any ETA data
		if (!combinedETAData || combinedETAData.length === 0) {
			return [];
		}

		// Group ETAs by route first, then by destination within each route
		const etasByRoute = combinedETAData.reduce((routeGroups, eta) => {
			if (!eta || !eta.route) {
				return routeGroups;
			}

			const route = eta.route;
			const dest = this.getLocalizedDestination(eta);

			// Initialize route group if it doesn't exist
			if (!routeGroups[route]) {
				routeGroups[route] = {};
			}

			// Initialize destination group within route if it doesn't exist
			if (!routeGroups[route][dest]) {
				routeGroups[route][dest] = [];
			}

			// Add ETA time to the destination group
			routeGroups[route][dest].push(eta.eta);

			return routeGroups;
		}, {});

		// Convert the grouped data into the expected format
		const result = Object.entries(etasByRoute).map(
			([route, destinations]) => {
				const etasArray = Object.entries(destinations).map(
					([dest, times]) => ({
						dest: dest,
						time: times,
					}),
				);

				return {
					line: route,
					etas: etasArray,
				};
			},
		);

		return result;
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

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

			// Use routes from config instead of fetching them dynamically
			if (this.config.routes && Array.isArray(this.config.routes)) {
				// Fetch ETA data for each route using the fetchRouteETA function
				const etaData = (await Promise.all(
					this.config.routes.map(async (routeObj) => {
						const data = await this.fetchRouteETA(routeObj);
						// Filter out null or empty data immediately
						return (data && data.length) ? data : null;
					})
				)).filter(item => item); // Filter out null values immediately

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
			const stopURL = `${this.config.apiBase}/stop/${this.config.sta}`;
			const data = await this.fetchData(stopURL);

			// Check if we received valid data
			if (!data) {
				Log.warn(`No data received for stop ${this.config.sta}. Full response:`, data);
				return null;
			}

			// Check if the data object has the expected structure
			if (!data.data) {
				Log.warn(`No data.data found for stop ${this.config.sta}. Full response:`, data);
				return null;
			}

			return data.data;
		} catch (error) {
			Log.error(`Could not load stop info for stop ${this.config.sta} ... `, error);
			throw error; // Re-throw the error to propagate it
		}
	},

	async fetchRoutes(route = null) {
		try {
			let routesURL = `${this.config.apiBase}/route/ctb`;
			if (route) {
				routesURL = `${routesURL}/${route}`;
			}
			const data = await this.fetchData(routesURL);
			if (!data || !data.data) {
				Log.warn(
					`No data or data.data found for routes from ${routesURL}. Full response:`,
					data,
				);
				return []; // Return an empty array to prevent further issues
			}
			return data.data;
		} catch (error) {
			Log.error("Could not load routes info ... ", error);
			throw error;
		}
	},

	async fetchRouteStops(route) {
		try {
			const outboundURL = `${this.config.apiBase}/route-stop/${this.config.company_id}/${route}/outbound`;
			const inboundURL = `${this.config.apiBase}/route-stop/${this.config.company_id}/${route}/inbound`;

			const [outboundData, inboundData] = await Promise.all([
				this.fetchData(outboundURL),
				this.fetchData(inboundURL),
			]);

			if (!outboundData || !outboundData.data) {
				Log.warn(
					`No data or data.data found for outbound route stops from ${outboundURL}. Full response:`,
					outboundData,
				);
			}
			if (!inboundData || !inboundData.data) {
				Log.warn(
					`No data or data.data found for inbound route stops from ${inboundURL}. Full response:`,
					inboundData,
				);
			}

			// Combine outbound and inbound stops into a single array
			const outboundStops = outboundData?.data || [];
			const inboundStops = inboundData?.data || [];

			// Add direction property to each stop for identification
			const allStops = [
				...outboundStops.map(stop => ({ ...stop, direction: 'outbound' })),
				...inboundStops.map(stop => ({ ...stop, direction: 'inbound' }))
			];

			return allStops;
		} catch (error) {
			Log.error(`Could not load route stops for route ${route} ... `, error);
			throw error;
		}
	},

	/*
	 * Fetch route stops with stop names
	 * Enhances route stops data with all name variants by calling fetchStop for each stop
	 */
	async fetchRouteStopsWithNames(route) {
		try {
			// First get the route stops (which contain stop_ids)
			const routeStops = await this.fetchRouteStops(route);

			if (!routeStops || !Array.isArray(routeStops) || routeStops.length === 0) {
				return [];
			}

			// Process stops in batches to avoid overwhelming the API
			const batchSize = 5;
			const enhancedStops = [];

			for (let i = 0; i < routeStops.length; i += batchSize) {
				const batch = routeStops.slice(i, i + batchSize);
				const batchPromises = batch.map(async (stop) => {
					try {
						// Fetch the full stop information to get all name variants
						const stopInfo = await this.fetchStop(stop.stop);

						// Return the original stop object enhanced with all name variants
						return {
							...stop,
							name_tc: stopInfo?.name_tc || null,
							name_en: stopInfo?.name_en || null,
							name_sc: stopInfo?.name_sc || null
						};
					} catch (error) {
						Log.error(`Error fetching stop info for stop ${stop.stop}:`, error);
						// Return the original stop object even if we couldn't get the info
						return stop;
					}
				});

				// Wait for all promises in this batch to resolve
				const batchResults = await Promise.all(batchPromises);
				enhancedStops.push(...batchResults);
			}

			return enhancedStops;
		} catch (error) {
			Log.error(`Could not load route stops with names for route ${route} ... `, error);
			throw error;
		}
	},

	/*
	 * Fetch stop information by stop_id
	 */
	async fetchStop(stop_id) {
		try {
			const stopURL = `${this.config.apiBase}/stop/${stop_id}`;
			const data = await this.fetchData(stopURL);

			if (!data || !data.data) {
				Log.warn(
					`No data or data.data found for stop ${stop_id}. Full response:`,
					data,
				);
				return null;
			}

			return data.data;
		} catch (error) {
			Log.error(`Could not load stop info for stop ${stop_id} ... `, error);
			throw error;
		}
	},

	async fetchAllRoutes() {
		try {
			const allRoutes = await this.fetchRoutes();

			if (!allRoutes || !Array.isArray(allRoutes) || allRoutes.length === 0) {
				Log.warn("No routes found or invalid routes data:", allRoutes);
				return [];
			}

			return allRoutes;
		} catch (error) {
			Log.error("Could not load all routes ... ", error);
			throw error;
		}
	},

	async filterRoutesByStop(routes, stop_id) {
		try {
			// For each route, check if it passes through the specified stop
			const routesThroughStop = [];

			// Process routes in batches to avoid overwhelming the API
			const batchSize = 5;
			for (let i = 0; i < routes.length; i += batchSize) {
				const batch = routes.slice(i, i + batchSize);
				const batchPromises = batch.map(async (route) => {
					try {
						// Fetch stops for this route
						const routeStops = await this.fetchRouteStops(route.route);

						// Check if the specified stop_id is in this route and return route number if found
						return routeStops.some(stop => stop.stop === stop_id) ? route.route : null;
					} catch (error) {
						Log.error(`Error fetching route stops for route ${route.route}:`, error);
						return null;
					}
				});

				// Wait for all promises in this batch to resolve
				const batchResults = await Promise.all(batchPromises);

				// Add non-null results to our routesThroughStop array
				routesThroughStop.push(...batchResults.filter(result => result));
			}

			return routesThroughStop;
		} catch (error) {
			Log.error(`Could not filter routes for stop ${stop_id} ... `, error);
			throw error;
		}
	},

	/*
	 * Fetch routes that pass through a specific stop_id
	 */
	async fetchRoutesByStop(stop_id) {
		try {
			// First fetch all routes
			const allRoutes = await this.fetchAllRoutes();

			// Then filter routes by stop_id
			const routesThroughStop = await this.filterRoutesByStop(allRoutes, stop_id);

			return routesThroughStop;
		} catch (error) {
			Log.error(`Could not load routes for stop ${stop_id} ... `, error);
			throw error;
		}
	},

	async fetchRouteETA(routeObj) {
		try {
			// Generate the URL for the ETA request
			const routeStr = typeof routeObj.route === 'object' && routeObj.route !== null ?
				(routeObj.route.route || String(routeObj.route)) :
				String(routeObj.route);

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
			Log.error(`Error fetching ETA for route ${routeObj.route}:`, error.message);
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

		// Get the first ETA object to extract route information
		const firstETA = combinedETAData[0];

		// Additional safety check to ensure firstETA exists and has a route property
		if (!firstETA || !firstETA.route) {
			return [];
		}

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

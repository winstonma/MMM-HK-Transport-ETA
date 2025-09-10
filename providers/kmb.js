/* global ETAProvider, ETAObject */

/* MagicMirror²
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

HKTransportETAProvider.register("kmb", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "KMB",

	// Set the default config properties that is specific to this provider
	defaults: {
		apiBase: "https://data.etabus.gov.hk/v1/transport/kmb",
		stopInfo: null, // Changed from [] to null for better cache invalidation
		routeStopCache: new Map(),
		stopDataCache: new Map(),
	},

	/**
	 * Main method to fetch ETA data
	 */
	async fetchETA() {
		try {
			// Only fetch route info if stopInfo is null
			if (!this.config.stopInfo) {
				this.config.stopInfo = await this.fetchStopInfo();
			}

			const currentETAArray = await this.fetchAllStopETAs();
			this.setCurrentETA(currentETAArray);
		} catch (error) {
			Log.error("KMB ETA Provider: Failed to fetch ETA data", error);
			this.handleError(error);
		} finally {
			this.updateAvailable();
		}
	},

	/**
	 * Fetch ETA data for all stops
	 */
	async fetchAllStopETAs() {
		if (!this.config.stop_ids?.length) {
			Log.warn(
				"KMB ETA Provider: No stops configured in this.config.stops.",
			);
			return [];
		}

		const allStopETAPromises = this.config.stop_ids.map(async (stops_id) =>
			this.fetchStopETA(stops_id),
		);

		const results = await Promise.allSettled(allStopETAPromises);

		const aggregatedResults = new Map();

		results.forEach((result) => {
			const uniqueETAs = this._processStopResult(result);
			this._aggregateETAs(aggregatedResults, uniqueETAs);
		});

		this._sortAggregatedResults(aggregatedResults);

		return Array.from(aggregatedResults.values());
	},

	/**
	 * Processes a single stop result to extract unique ETAs.
	 * @param {object} stopResult - The result object from Promise.allSettled.
	 * @returns {Array} An array of unique ETA objects.
	 */
	_processStopResult(stopResult) {
		if (
			stopResult.status === "fulfilled" &&
			stopResult.value.success &&
			stopResult.value.data
		) {
			const uniqueETAs = {};
			stopResult.value.data.forEach((eta) => {
				if (eta.eta) {
					const key = `${eta.route}-${eta.dir}-${eta.dest_tc}-${eta.eta}`;
					if (
						!uniqueETAs[key] ||
						eta.service_type < uniqueETAs[key].service_type
					) {
						uniqueETAs[key] = eta;
					}
				}
			});
			return Object.values(uniqueETAs);
		}
		return [];
	},

	/**
	 * Aggregates unique ETA objects into the main aggregatedResults Map.
	 * @param {Map} aggregatedResults - The Map to store aggregated ETA data.
	 * @param {Array} uniqueETAs - An array of unique ETA objects for a stop.
	 */
	/**
	 * Returns the localized destination name.
	 * @param {object} eta - The ETA object.
	 * @returns {string} The localized destination name.
	 */
	_getLocalizedDestination(eta) {
		return this.config.lang?.startsWith("zh") ? eta.dest_tc : eta.dest_en;
	},

	_aggregateETAs(aggregatedResults, uniqueETAs) {
		uniqueETAs.forEach((eta) => {
			const line = eta.route;
			const dest = this._getLocalizedDestination(eta);
			const formattedTime = moment(eta.eta).format("YYYY-MM-DD HH:mm:ss");

			if (!aggregatedResults.has(line)) {
				aggregatedResults.set(line, {
					line: line,
					etas: [],
				});
			}

			let existingDest = aggregatedResults
				.get(line)
				.etas.find((e) => e.dest === dest);
			if (!existingDest) {
				existingDest = {
					dest: dest,
					time: [],
				};
				aggregatedResults.get(line).etas.push(existingDest);
			}
			existingDest.time.push(formattedTime);
		});
	},

	/**
	 * Sorts the aggregated ETA results.
	 * @param {Map} aggregatedResults - The Map containing aggregated ETA data.
	 */
	_sortAggregatedResults(aggregatedResults) {
		aggregatedResults.forEach((lineData) => {
			lineData.etas.forEach((etaData) => {
				etaData.time.sort(); // Sort the ETA times
			});
			this._sortEtasByDestination(lineData.etas);
		});
	},

	/**
	 * Sorts an array of ETA destinations.
	 * @param {Array} etas - The array of ETA destinations to sort.
	 */
	_sortEtasByDestination(etas) {
		etas.sort((a, b) => a.dest.localeCompare(b.dest));
	},

	/**
	 * Fetch ETA data for a single stop.
	 */
	async fetchStopETA(stopID) {
		try {
			const data = await this.fetchData(this.getETAUrl(stopID));
			return { stopID, data: data?.data || [], success: true };
		} catch (error) {
			Log.error(
				`KMB ETA Provider: Failed to fetch ETA for stop ${stopID}`,
				error,
			);
			return { stopID, data: [], success: false, error };
		}
	},

	/**
	 * Fetch route information with enhanced error handling
	 */
	async fetchStopInfo() {
		try {
			if (this.config.sta?.includes("-")) {
				if (!this.config.stops?.length) {
					throw new Error("No stops configured");
				}
				const stops = this.config.stops;

				const sortedStops = stops.sort((a, b) => {
					if (a.stop.id !== b.stop.id)
						return a.stop.id > b.stop.id ? 1 : -1;

					if (a.variant.route.number !== b.variant.route.number)
						return a.variant.route.number < b.variant.route.number
							? -1
							: 1;

					return a.sequence - b.sequence;
				});

				const stopPromises = sortedStops.map(async (data) => {
					const bound =
						data.variant.route.bound === 1 ? "outbound" : "inbound";
					const routeStopData = await this.fetchData(
						`${this.config.apiBase}/route-stop/${data.variant.route.number}/${bound}/${data.variant.serviceType}`,
					);

					const sequence =
						data.sequence === 999
							? routeStopData.data.length
							: data.sequence + 1;
					const stopID = routeStopData.data.find(
						(stop) => parseInt(stop.seq) === sequence,
					).stop;

					return {
						...data,
						stopID: stopID,
					};
				});

				const stopList = await Promise.all(stopPromises);

				this.config.stop_ids = [
					...new Set(stopList.map((line) => line.stopID)),
				];
			} else {
				this.config.stop_ids = [this.config.sta];
			}

			const displayStopName = await this.getDisplayStopName();

			return {
				stopName: displayStopName,
				lastUpdated: Date.now(),
			};
		} catch (error) {
			Log.error(
				"KMB ETA Provider: Error fetching route information",
				error,
			);
			throw error;
		}
	},

	/**
	 * Get display name for the stop
	 */
	async getDisplayStopName() {
		try {
			const firstStopData = await this.fetchStopData(
				this.config.stop_ids[0],
			);
			return this.config.lang?.startsWith("zh")
				? firstStopData.name_tc || firstStopData.name_en
				: firstStopData.name_en || firstStopData.name_tc;
		} catch (error) {
			Log.warn("KMB ETA Provider: Could not fetch stop name", error);
			return "";
		}
	},

	/**
	 * Enhanced route-stop data fetching
	 */
	async fetchRouteStopData(variant) {
		const route = variant.route.number;
		const direction = variant.route.bound === 1 ? "outbound" : "inbound";
		const service_type = String(variant.serviceType);

		if (!route || !direction || service_type === undefined) {
			throw new Error("Missing required parameters for route-stop data");
		}

		const cacheKey = `${route}/${direction}/${service_type}`;
		if (this.config.routeStopCache.has(cacheKey)) {
			return this.config.routeStopCache.get(cacheKey);
		}

		try {
			const url = `${this.config.apiBase}/route-stop/${route}/${direction}/${service_type}`;
			const response = await this.fetchData(url);
			const data = response?.data || [];
			if (data.length > 0) {
				this.config.routeStopCache.set(cacheKey, data);
			}
			return data;
		} catch (error) {
			Log.error(
				`KMB ETA Provider: Error fetching route-stop data for ${cacheKey}`,
				error,
			);
			throw error;
		}
	},

	/**
	 * Enhanced routes fetching
	 */
	async fetchRoutes(route = null, direction = null, service_type = null) {
		try {
			let url = `${this.config.apiBase}/route/`;
			if (route && direction && service_type !== null) {
				url += `${route}/${direction}/${service_type}`;
			}

			const response = await this.fetchData(url);
			return response?.data || [];
		} catch (error) {
			Log.error("KMB ETA Provider: Error fetching routes", error);
			throw error;
		}
	},

	/**
	 * Enhanced stop data fetching
	 */
	async fetchStopData(stop_id) {
		if (!stop_id) {
			throw new Error("Stop ID is required");
		}

		if (this.config.stopDataCache.has(stop_id)) {
			return this.config.stopDataCache.get(stop_id);
		}

		try {
			const url = `${this.config.apiBase}/stop/${stop_id}`;
			const response = await this.fetchData(url);
			const data = response?.data;
			if (data) {
				this.config.stopDataCache.set(stop_id, data);
			}
			return data;
		} catch (error) {
			Log.error(
				`KMB ETA Provider: Error fetching stop data for ${stop_id}`,
				error,
			);
			throw error;
		}
	},

	/**
	 * Fetch data
	 */
	async fetchData(url, options = {}) {
		try {
			const response = await fetch(url, options);
			return await response.json();
		} catch (error) {
			throw error;
		}
	},

	/**
	 * Handle errors gracefully
	 */
	handleError(error) {
		// Set empty ETA array on error to prevent showing stale data
		this.setCurrentETA([]);
		this._cleanup();

		// Could implement additional error handling here:
		// - Exponential backoff for subsequent requests
		// - Fallback to cached data if recent enough
		// - User notifications for persistent errors
	},

	/**
	 * Cleans up resources, e.g., clears caches.
	 */
	_cleanup() {
		this.config.routeStopCache.clear();
		this.config.stopDataCache.clear();
	},

	/**
	 * Create ETA URL for a stop
	 */
	getETAUrl(stopID) {
		return `${this.config.apiBase}/stop-eta/${stopID}`;
	},

	/**
	 * Get header for display
	 */
	getHeader() {
		if (this.config.stopInfo) {
			return this.config.stopInfo.stopName;
		}
		return null;
	},
});

/* global ETAProvider, ETAObject */

/* MagicMirror²
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

HKTransportETAProvider.register("mtrbus", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "MTR Bus",

	// Set the default config properties that is specific to this provider
	defaults: {
		apiBase: "https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule",
		mtrBusLines: "/modules/MMM-HK-Transport-ETA/data/routes-mtr.json",
		stops: null,
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		try {
			if (!this.config.stops) {
				this.config.stops = await this.fetchStopsInfo();
			}

			if (this.config.stops.length === 0) {
				Log.warn("No stops configured for MTR Bus ETA");
				this.setCurrentETA([]);
				this.updateAvailable();
				return;
			}

			// Fetch ETA data for each route
			const routeETAData = await this.fetchRouteETAs();

			// Filter out routes with no ETA data
			const validRouteETAData = routeETAData.filter(routeData => 
				routeData.etas && routeData.etas.length > 0 && 
				routeData.etas.some(eta => eta.time && eta.time.length > 0)
			);

			this.setCurrentETA(validRouteETAData);
		} catch (error) {
			Log.error("Could not load data ... ", error);
		} finally {
			this.updateAvailable();
		}
	},

	/**
	 * Fetch ETA data for all configured routes
	 * @returns {Array} Array of route ETA data
	 */
	async fetchRouteETAs() {
		// Create promises for each route
		const etaPromises = this.config.stops.map(routeGroup => 
			this.fetchSingleRouteETA(routeGroup)
		);

		// Wait for all requests to complete
		const etaResults = await Promise.all(etaPromises);

		// Generate ETA data for each route
		return etaResults.map(({ routeGroup, data }) =>
			this.generateETAObject(routeGroup, data),
		);
	},

	/**
	 * Fetch ETA data for a single route
	 * @param {Object} routeGroup - The route group to fetch data for
	 * @returns {Object} Object containing routeGroup and data
	 */
	async fetchSingleRouteETA(routeGroup) {
		try {
			// Prepare the request payload
			const dataObject = {
				language: "en",
				routeName: routeGroup.route
			};

			// Make the API request
			const response = await fetch(this.config.apiBase, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(dataObject)
			});

			// Check if response is ok
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// Parse the JSON response
			const data = await response.json();
			return { routeGroup, data };
		} catch (error) {
			Log.error(`Error fetching ETA for route ${routeGroup.route}:`, error);
			return { routeGroup, data: null };
		}
	},

	async fetchStopsInfo() {
		try {
			// Load the MTR bus lines data
			const data = await this.fetchData(this.config.mtrBusLines);

			// Group stops by route for the configured station
			const routeGroups = this.groupStopsByRoute(data);

			// Convert map to array format
			const groupedStops = Array.from(routeGroups.values());

			if (groupedStops.length === 0) {
				Log.error(`No route data found for station ID: ${this.config.sta}`);
				return [];
			}

			// Set the line if not already set (use the first route)
			if (!this.config.line && groupedStops.length > 0) {
				this.config.line = groupedStops[0].route;
			}

			return groupedStops;
		} catch (error) {
			Log.error("Could not load data ... ", error);
			return [];
		}
	},

	/**
	 * Group stops by route for the configured station
	 * @param {Array} data - The MTR bus lines data
	 * @returns {Map} - A map of route groups
	 */
	groupStopsByRoute(data) {
		const routeGroups = new Map();
		
		// Iterate through all routes, lines, and stops
		data.forEach(route => {
			route.lines.forEach(line => {
				line.stops.forEach(stop => {
					// Check if this stop matches our configured station
					if (this.isMatchingStop(stop)) {
						// Initialize the route group if it doesn't exist
						if (!routeGroups.has(route.route_number)) {
							routeGroups.set(route.route_number, {
								route: route.route_number,
								station: this.getStationName(stop),
								stops: []
							});
						}
						
						// Add stop to the route group
						routeGroups.get(route.route_number).stops.push({
							ref_ID: stop.ref_ID,
							direction: line.direction,
							dest: this.getDestinationName(line)
						});
					}
				});
			});
		});
		
		return routeGroups;
	},

	/**
	 * Check if a stop matches our configured station
	 * @param {Object} stop - The stop to check
	 * @returns {boolean} - True if the stop matches our configured station
	 */
	isMatchingStop(stop) {
		return stop.ref_ID === this.config.sta || 
			   stop.name_en === this.config.sta || 
			   stop.name_ch === this.config.sta;
	},

	/**
	 * Get the station name based on the configured language
	 * @param {Object} stop - The stop object
	 * @returns {string} - The station name in the configured language
	 */
	getStationName(stop) {
		return this.config.lang.startsWith("zh") ? stop.name_ch : stop.name_en;
	},

	/**
	 * Get the destination name based on the configured language
	 * @param {Object} line - The line object
	 * @returns {string} - The destination name in the configured language
	 */
	getDestinationName(line) {
		if (this.config.lang.startsWith("zh")) {
			return line.stops.length > 0 
				? line.stops[line.stops.length - 1].name_ch 
				: line.description_zh;
		} else {
			return line.stops.length > 0 
				? line.stops[line.stops.length - 1].name_en 
				: line.description_en;
		}
	},

	/*
	 * Generate a ETAObject based on routeGroup and currentETAData
	 */
	generateETAObject(routeGroup, currentETAData) {
		if (!currentETAData || !currentETAData.busStop) {
			Log.warn(
				"Invalid ETA data received: busStop is missing.",
				currentETAData,
			);
			
			// Return structure for the entire route with empty ETAs
			return {
				station: routeGroup.station,
				line: routeGroup.route,
				etas: routeGroup.stops.map(stop => ({
					dest: stop.dest,
					time: [],
				})),
			};
		}

		// Generate ETA objects for each stop in this route
		const etas = routeGroup.stops.map(stop => {
			const stopData = currentETAData.busStop.find(
				busStop => busStop.busStopId === stop.ref_ID,
			);

			if (!stopData || !stopData.bus) {
				return {
					dest: stop.dest,
					time: [],
				};
			}

			return {
				dest: stop.dest,
				time: stopData.bus.map(bus => {
					// Use arrival time if available and not empty, otherwise use departure time
					const timeInSeconds = bus.arrivalTimeText === "" 
						? bus.departureTimeInSecond 
						: bus.arrivalTimeInSecond;
					return moment().add(timeInSeconds, "seconds");
				}),
			};
		});

		return {
			station: routeGroup.station,
			line: routeGroup.route,
			etas: etas,
		};
	},

	/**
	 * Get the header to display for this provider
	 * @returns {string} The header text
	 */
	getHeader() {
		if (this.config.stops && this.config.stops.length > 0) {
			return this.config.stops[0].station;
		}
		return this.providerName;
	},
});

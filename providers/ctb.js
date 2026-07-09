/* MagicMirror²
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

class CTBProvider extends HKTransportETAProvider {
	constructor() {
		super();

		// Set the name of the provider.
		// This isn't strictly necessary, since it will fallback to the provider identifier
		// But for debugging (and future alerts) it would be nice to have the real name.
		this.providerName = "CTB";

		// Set the default config properties that is specific to this provider
		this.defaults = {
			apiBase: "https://rt.data.gov.hk/v2/transport/citybus",
			company_id: "CTB",
			stopInfo: null,
			newDataURL:
				"https://winstonma.github.io/MMM-HK-Transport-ETA-Data/ctb/stops",
		};
	}

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
							return data?.length ? data : null;
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
	}

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
	}

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
			if (data?.data) {
				// Log raw API response to debug invalid date issues
				Log.log(
					`[CTB] Raw API response for route ${routeStr}:`,
					JSON.stringify(data.data),
				);
				if (data.data.length > 0) {
					Log.log(`[CTB] First ETA object for route ${routeStr}:`, {
						eta: data.data[0].eta,
						dest_en: data.data[0].dest_en,
						dest_tc: data.data[0].dest_tc,
						dir: data.data[0].dir,
						route: data.data[0].route,
					});
				}
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
	}

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(etaData) {
		// Flatten the array of arrays into a single array of ETA objects
		const combinedETAData = etaData.flat();

		// Check if we have any ETA data
		if (combinedETAData.length === 0) {
			return [];
		}

		// Log all raw ETA times for debugging
		Log.log(`[CTB] Processing ${combinedETAData.length} raw ETA objects`);
		const invalidETAs = combinedETAData.filter(
			(eta) =>
				!eta.eta ||
				eta.eta === "" ||
				eta.eta === "null" ||
				eta.eta === "undefined",
		);
		if (invalidETAs.length > 0) {
			Log.log(
				`[CTB] Found ${invalidETAs.length} ETA objects with empty eta values (likely KMB-operated trips)`,
			);
		}

		// Group ETAs by route first, then by destination within each route
		const groupedByRoute = Object.groupBy(
			combinedETAData,
			(eta) => eta.route,
		);

		// Convert the grouped data into the expected format
		return Object.entries(groupedByRoute).map(([route, routeEtas]) => {
			const groupedByDest = Object.groupBy(routeEtas, (eta) =>
				this.getLocalizedDestination(eta),
			);

			const etasArray = Object.entries(groupedByDest).map(
				([dest, etaItems]) => {
					// Valid ETAs, add the time
					const times = etaItems
						.filter(
							(eta) =>
								eta.eta &&
								eta.eta !== "" &&
								eta.eta !== "null" &&
								eta.eta !== "undefined",
						)
						.map((eta) => eta.eta);

					// Check for invalid dates
					if (times.some((t) => !moment(t).isValid())) {
						Log.warn(
							`[CTB] Invalid date detected in route ${route}, dest ${dest}. Times:`,
							times,
						);
					}

					// Check if this is a KMB-operated trip (empty eta with KMB remark)
					const hasKmbCycle = etaItems.some(
						(eta) =>
							(!eta.eta ||
								eta.eta === "" ||
								eta.eta === "null" ||
								eta.eta === "undefined") &&
							eta.rmk_en?.includes("KMB"),
					);
					if (hasKmbCycle) {
						Log.log(
							`[CTB] Detected KMB-operated trip for route ${route}, dest: ${dest}`,
						);
					}

					const etaObj = {
						dest: dest,
						time: times,
					};

					// Add note if applicable
					if (hasKmbCycle) {
						etaObj.note = this.config.lang.startsWith("zh")
							? "九巴時段"
							: "KMB Cycle";
					}

					return etaObj;
				},
			);

			return {
				line: route,
				etas: etasArray,
			};
		});
	}

	// Helper methods to improve readability
	getLocalizedStationName() {
		if (!this.config.stopInfo) {
			return null;
		}
		return this.config.lang.startsWith("zh")
			? this.config.stopInfo.name_tc
			: this.config.stopInfo.name_en;
	}

	getLocalizedDestination(eta) {
		return this.config.lang.startsWith("zh") ? eta.dest_tc : eta.dest_en;
	}

	getHeader() {
		return this.getLocalizedStationName();
	}
}

HKTransportETAProvider.register("ctb", CTBProvider);

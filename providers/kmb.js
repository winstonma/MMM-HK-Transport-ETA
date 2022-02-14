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
		allRoutesData: {},
		lineInfo: [],
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		if (this.config.lineInfo.length === 0) {
			this.config.lineInfo = await this.fetchRouteInfo();
		}

		Promise.all(this.config.lineInfo.stopIDList.map(stopID =>
			this.fetchData(this.getUrl(stopID))
				.then(data => data.data)
		))
			.then(etaArray => etaArray.flat().filter(eta => eta.eta))
			.then(etaArray => {
				const currentETAArray = this.config.lineInfo.stopInfo.map(stop => {
					const filteredResult = etaArray.filter(eta =>
						(eta.route === stop.variant.route.number) &&
						(eta.service_type === stop.variant.serviceType))
						.sort((a, b) => a.eta_seq - b.eta_seq);
					if (filteredResult.length == 0) {
						return {};
					}

					const dest = this.config.lang.startsWith("zh") ? filteredResult[0].dest_tc : filteredResult[0].dest_en;

					return {
						line: stop.variant.route.number,
						station: this.config.lineInfo.stopName,
						etas: [{
							dest: dest,
							time: filteredResult.map(a => a.eta)
						}]
					}
				}).filter(value => Object.keys(value).length !== 0);
				this.setCurrentETA(currentETAArray);
			})
			.catch(request => {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	fetchRouteInfo() {
		// First of all, obtain the testData
		return this.getStoppings()
			.then(data => Promise.all(data.sort((a, b) => {
				if (a.stop.id != b.stop.id)
					return (a.stop.id > b.stop.id) ? 1 : -1;

				if (a.variant.route.number != b.variant.route.number)
					return (a.variant.route.number < b.variant.route.number) ? -1 : 1;

				return a.sequence - b.sequence;
			}).map(data => {
				const bound = data.variant.route.bound === 1 ? "outbound" : "inbound";
				return this.fetchData(`${this.config.apiBase}/route-stop/${data.variant.route.number}/${bound}/${data.variant.serviceType}`)
					.then(result => {
						const sequence = data.sequence === 999 ? result.data.length : data.sequence + 1;
						return {
							...data,
							stopID: result.data.find(stop => parseInt(stop.seq) === sequence).stop
						};
					})
			})).then(stopList => {
				const stopIDList = [...new Set(stopList.map(line => line.stopID))];
				return Promise.all(stopIDList.map(stopID =>
					this.fetchData(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${stopID}`)
						.then(data => data.data)
				)).then(stopNameList => {
					return stopList.map(stop => {
						const stopName = stopNameList.find(stopname => stopname.stop === stop.stopID);
						return {
							...stop,
							stopName: this.config.lang.startsWith("zh") ? stopName.name_tc : stopName.name_en
						};
					});
				})
			}).then(data => {
				const stopNameObject = data.map(stop => stop.stopName).reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
				const stopName = Object.keys(Object.fromEntries(
					Object.entries(stopNameObject).sort(([, a], [, b]) => a - b)
				))[0];
				return {
					stopName: stopName,
					stopInfo: data,
					stopIDList: [...new Set(data.map(line => line.stopID))]	
				}
			})
				.catch(request => {
					Log.error("Could not load data ... ", request);
				}));
	},

	// Create a URL from the config and base URL.
	getUrl(stopID) {
		return `${this.config.apiBase}/stop-eta/${stopID}`;
	},

	getStoppings() {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(this.config.stops);
			}, 0);
		});
	}
});

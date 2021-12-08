/* global WeatherProvider, ETAObject */

/* Magic Mirror
 * Module: Weather
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
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
		testData: [
			{
				"stop": {
					"id": "NI01-W-1000-0"
				},
				"variant": {
					"route": {
						"number": "274",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Sheung Shui (Tai Ping)",
					"destination": "Wu Kai Sha Station",
					"description": "Normal"
				},
				"direction": "B",
				"sequence": 20,
				"fare": 4.6
			},
			{
				"stop": {
					"id": "NI01-W-1000-0"
				},
				"variant": {
					"route": {
						"number": "43X",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Yiu On",
					"destination": "Tsuen Wan West Station",
					"description": ""
				},
				"direction": "F",
				"sequence": 5,
				"fare": 9.6
			},
			{
				"stop": {
					"id": "NI01-W-1000-0"
				},
				"variant": {
					"route": {
						"number": "81C",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Yiu On",
					"destination": "Tsim Sha Tsui East (Mody Road)",
					"description": ""
				},
				"direction": "F",
				"sequence": 5,
				"fare": 9.4
			},
			{
				"stop": {
					"id": "NI01-W-0800-0"
				},
				"variant": {
					"route": {
						"number": "85K",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Heng On",
					"destination": "Shatin Station",
					"description": ""
				},
				"direction": "F",
				"sequence": 6,
				"fare": 5.4
			},
			{
				"stop": {
					"id": "NI01-W-0900-0"
				},
				"variant": {
					"route": {
						"number": "85S",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Yiu On",
					"destination": "Hung Hom (Hung Luen Road)",
					"description": ""
				},
				"direction": "F",
				"sequence": 6,
				"fare": 9.1
			},
			{
				"stop": {
					"id": "NI01-W-0800-0"
				},
				"variant": {
					"route": {
						"number": "89C",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Heng On",
					"destination": "Kwun Tong (Tsui Ping Road)",
					"description": ""
				},
				"direction": "F",
				"sequence": 6,
				"fare": 9.1
			},
			{
				"stop": {
					"id": "NI01-W-0800-0"
				},
				"variant": {
					"route": {
						"number": "N86",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Kam Ying Court",
					"destination": "Shatin Station",
					"description": "Normal"
				},
				"direction": "",
				"sequence": 9,
				"fare": 11.4
			},
			{
				"stop": {
					"id": "NI01-W-1000-0"
				},
				"variant": {
					"route": {
						"number": "281X",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Yiu On",
					"destination": "Tsim Sha Tsui East (Mody Road)",
					"description": ""
				},
				"direction": "F",
				"sequence": 5,
				"fare": 9.4
			},
			{
				"stop": {
					"id": "NI01-W-0900-0"
				},
				"variant": {
					"route": {
						"number": "286M",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Ma On Shan Town Centre",
					"destination": "Diamond Hill Station (Circular)",
					"description": ""
				},
				"direction": "F",
				"sequence": 5,
				"fare": 7.6
			},
			{
				"stop": {
					"id": "NI01-W-0900-0"
				},
				"variant": {
					"route": {
						"number": "289K",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "University Station",
					"destination": "Chevalier Garden (Circular)",
					"description": ""
				},
				"direction": "B",
				"sequence": 3,
				"fare": 4.9
			},
			{
				"stop": {
					"id": "NI01-W-1000-0"
				},
				"variant": {
					"route": {
						"number": "681P",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Yiu On",
					"destination": "Sheung Wan",
					"description": ""
				},
				"direction": "F",
				"sequence": 6,
				"fare": 21.9
			},
			{
				"stop": {
					"id": "NI01-W-1000-0"
				},
				"variant": {
					"route": {
						"number": "981P",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Yiu On",
					"destination": "Wan Chai (Fleming Road)",
					"description": "(Monday to Friday)"
				},
				"direction": "F",
				"sequence": 6,
				"fare": 21.9
			},
			{
				"stop": {
					"id": "NI01-W-0850-2"
				},
				"variant": {
					"route": {
						"number": "A41P",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Wu Kai Sha Station",
					"destination": "Airport (Ground Transportation Centre)",
					"description": ""
				},
				"direction": "F",
				"sequence": 11,
				"fare": 27.7
			},
			{
				"stop": {
					"id": "NI01-W-0850-2"
				},
				"variant": {
					"route": {
						"number": "NA40",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Wu Kai Sha Station",
					"destination": "Hzmb Hong Kong Port",
					"description": "Normal"
				},
				"direction": "F",
				"sequence": 12,
				"fare": 40
			},
			{
				"stop": {
					"id": "NI01-W-0800-0"
				},
				"variant": {
					"route": {
						"number": "R287",
						"bound": 1
					},
					"serviceType": 1,
					"origin": "Wu Kai Sha Station",
					"destination": "Tsim Sha Tsui East (Mody Road)",
					"description": "Normal"
				},
				"direction": "",
				"sequence": 12,
				"fare": 18.3
			}
		],
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
						station: 'b',
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
		return Promise.all(
			this.config.testData.sort((a, b) => {
				if (a.stop.id != b.stop.id)
					return a.stop.id - b.stop.id;

				if (a.variant.route.number != b.variant.route.number)
					return b.variant.route.number - a.variant.route.number;

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
			})).then(data => ({
				stopInfo: data,
				stopIDList: [...new Set(data.map(line => line.stopID))]
			}))
			.catch(request => {
				Log.error("Could not load data ... ", request);
			});
	},

	// Create a URL from the config and base URL.
	getUrl(stopID) {
		return `${this.config.apiBase}/stop-eta/${stopID}`;
	},

	/*
	 * Generate a ETAObject based on currentWeatherInformation
	 */
	generateETAObject(stopID, currentETAData) {
		const routeList = this.config.lineInfo.stopInfo.filter(line => line.stopID === stopID).map(line => line.variant.route.number);
		const etaList = currentETAData.data
			.filter(eta => routeList.includes(eta.route))
			.map(data => ({
				dest: this.config.lang.startsWith("zh") ? data.dest_tc : data.dest_en
			}));

		if (!stop) {
			//return currentETAData.routeStatusRemarkTitle ?? '尾班車已過或未有到站時間提供';
			return {
				dest: stopInfo.dest,
				time: []
			};
		}

		return {
			dest: this.config.lang.startsWith("zh") ? route.dest_tc : route.dest_en,
			time: stop.bus.map(
				({ arrivalTimeInSecond, departureTimeInSecond, isDelayed, isScheduled }) =>
					moment().add(arrivalTimeInSecond || departureTimeInSecond, 'seconds'
					)
			)
		}
	},
});

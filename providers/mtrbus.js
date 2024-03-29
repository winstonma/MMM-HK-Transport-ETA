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
		mtrBusLines: "/modules/MMM-HK-Transport-ETA/telegram-hketa/data/routes-mtr.json",
		allRoutesData: {},
		lineInfo: []
	},

	// Overwrite the fetchETA method.
	async fetchETA() {

		if (this.config.lineInfo.length === 0) {
			this.config.lineInfo = await this.fetchRouteInfo();
		}

		const dataObject = { "language": 'en', "routeName": this.config.line };
		this.fetchData(this.config.apiBase, method = "POST", data = dataObject)
			.then(data => this.config.lineInfo.map(line => this.generateETAObject(line, data)))
			.then(currentETAArray => {
				this.setCurrentETA([{
					station: this.config.lineInfo[0].station,
					line: this.config.line,
					etas: currentETAArray
				}]);
			})
			.catch(request => {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	fetchRouteInfo() {
		return this.fetchData(this.config.mtrBusLines)
			.then(data => {
				this.config.allRoutesData = data;
				return data.find(route => route.route_number === this.config.line);
			}).then(data =>
				data.lines.map(line => {
					const filteredArray = line.stops.filter(stop => ([stop.name_ch, stop.name_en].includes(this.config.sta)));
					return [...new Map(filteredArray.map(item => [item.ref_ID, item])).values()]
						.map(stop => ({
							...stop,
							station: this.config.lang.startsWith("zh") ? stop.name_ch : stop.name_en,
							dest: this.config.lang.startsWith("zh") ?
								(line.description_zh.split(" 往 ").length > 1 ? line.description_zh.split(" 往 ")[1] : line.description_zh)
								: (line.description_en.split(" to ").length > 1 ? line.description_en.split(" to ")[1] : line.description_en),
						}))
				}).flat()
			)
			.catch(request => {
				Log.error("Could not load data ... ", request);
			});
	},

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(stopInfo, currentETAData) {
		const stop = currentETAData.busStop.find(stop => stop.busStopId === stopInfo.ref_ID);

		if (!stop) {
			//return currentETAData.routeStatusRemarkTitle ?? '尾班車已過或未有到站時間提供';
			return {
				dest: stopInfo.dest,
				time: []
			};
		}

		return {
			dest: stopInfo.dest,
			time: stop.bus.map(
				({ departureTimeInSecond }) =>
					moment().add(departureTimeInSecond, 'seconds')
			)
		}
	},
});

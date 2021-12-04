/* global WeatherProvider, ETAObject */

/* Magic Mirror
 * Module: Weather
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
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
		mtrBusLines: "https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/routes-mtr.json",
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
					return line.stops.map(stop => ({
						...stop,
						description_en: line.description_en,
						description_zh: line.description_zh,
						dest: this.config.lang.startsWith("zh") ? line.description_zh.split(" 往 ")[1] : route.description_en.split(" to ")[1],
					}))
				})
					.flat()
					.filter(stop => ([stop.name_ch, stop.name_en].includes(this.config.sta)))
			)
			.catch(request => {
				Log.error("Could not load data ... ", request);
			});
	},

	/*
	 * Generate a ETAObject based on currentWeatherInformation
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
				({ arrivalTimeInSecond, departureTimeInSecond, isDelayed, isScheduled }) =>
					moment().add(arrivalTimeInSecond || departureTimeInSecond, 'seconds'
				)
			)
		}
	},
});

/* global ETAProvider, ETAObject */

/* Magic Mirror
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

HKTransportETAProvider.register("lrt", {
	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "LRT",

	// Set the default config properties that is specific to this provider
	defaults: {
		apiBase: " https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule",
		lrtLines: "/modules/MMM-HK-Transport-ETA/telegram-hketa/data/station-lrt.json",
		allRoutesData: {},
		stationInfo: {}
	},

	// Overwrite the fetchETA method.
	async fetchETA() {
		if (Object.entries(this.config.stationInfo).length === 0) {
			this.config.stationInfo = await this.fetchStationInfo();
		}

		this.fetchData(this.getUrl(this.config.stationInfo))
			.then(data => {
				const currentETAArray = this.generateETAObject(data).flat();
				this.setCurrentETA(currentETAArray);
			})
			.catch(request => {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvailable());
	},

	fetchStationInfo() {
		return this.fetchData(this.config.lrtLines)
			.then(data => {
				this.config.allRoutesData = data;
				const stations = data.map(zones => zones.stations.map(data => data)).flat()
				const targetStation = stations.find(stop => ([stop.eng_name, stop.chi_name].includes(this.config.sta)));
				return {
					station_id: targetStation.station_id,
					station: this.config.lang.startsWith("zh") ? targetStation.chi_name : targetStation.eng_name,
				}
			})
			.catch(request => {
				Log.error("Could not load data ... ", request);
			});
	},

	/*
	 * Generate a ETAObject based on currentETAData
	 */
	generateETAObject(currentETAData) {
		return currentETAData.platform_list.map(routeLists => {
			const groupedRouteList = routeLists.route_list.reduce((group, product) => {
				const { route_no } = product;
				group[route_no] = group[route_no] ?? [];
				group[route_no].push(product);
				return group;
			}, {});
			return Object.keys(groupedRouteList).map((key) => {
				const dataList = groupedRouteList[key];
				const destination = this.config.lang.startsWith("zh") ? dataList[0].dest_ch : dataList[0].dest_en;
				return {
					line: key,
					station: this.config.stationInfo.station,
					etas: [{
						dest: destination,
						time: dataList.map(schedule => {
							const arrivingMinute = (schedule.time_en == "Arriving") ? 0 : parseInt(schedule.time_en);
							return moment().add(arrivingMinute, 'minutes');
						})
					}]
				};
			});
		});
	},

	/** LRT Specific Methods - These are not part of the default provider methods */
	/*
	 * Gets the complete url for the request
	 */
	getUrl(stationInfo) {
		return this.config.apiBase + this.getParams(stationInfo);
	},

	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams(stationInfo) {
		let params = "?";

		params += "&station_id=" + stationInfo.station_id;

		return params;
	}
});

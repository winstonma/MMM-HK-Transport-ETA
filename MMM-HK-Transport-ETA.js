/* global WeatherProvider */

/* Magic Mirror
 * Module: Weather
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 */
Module.register("MMM-HK-Transport-ETA", {
	// Default module config.
	defaults: {
		transportETAProvider: "KMB",
		type: "current", // current, forecast, daily (equivalent to forecast), hourly (only with OpenWeatherMap /onecall endpoint)
		useKmh: false,
		updateInterval: 10 * 60 * 1000, // every 10 minutes
		animationSpeed: 1000,
		timeFormat: config.timeFormat,
		showPeriod: true,
		showPeriodUpper: false,
		useBeaufort: true,
		lang: config.language,
		maxNumberOfDays: 5,
		maxEntries: 5,
		ignoreToday: false,
		fade: true,
		fadePoint: 0.25, // Start on 1/4th of the list.
		initialLoadDelay: 0, // 0 seconds delay
		appendLocationNameToHeader: true,
		calendarClass: "calendar",
		tableClass: "small",
		colored: false,
	},

	// Module properties.
	transportETAProvider: null,

	// Can be used by the provider to display location of event if nothing else is specified
	firstEvent: null,

	// Define required scripts.
	getStyles: function () {
		return ["font-awesome.css", "weather-icons.css", "MMM-HK-Transport-ETA.css"];
	},

	// Return the scripts that are necessary for the weather module.
	getScripts: function () {
		return ["moment.js", "hktransportetaprovider.js", "etaobject.js", "suncalc.js", this.file("providers/" + this.config.transportETAProvider.toLowerCase() + ".js")];
	},

	// Override getHeader method.
	getHeader: function () {
		if (this.config.appendLocationNameToHeader && this.config.sta) {
			if (this.data.header) return this.data.header + " " + this.config.sta;
			else return this.config.sta;
		}

		return this.data.header ? this.data.header : "";
	},

	// Start the weather module.
	start: function () {
		moment.locale(this.config.lang);

		// Initialize the weather provider.
		this.transportETAProvider = HKTransportETAProvider.initialize(this.config.transportETAProvider, this);

		// Let the weather provider know we are starting.
		this.transportETAProvider.start();

		// Add custom filters
		this.addFilters();

		// Schedule the first update.
		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	// Override notification handler.
	notificationReceived: function (notification, payload, sender) {
	},

	// Select the template depending on the display type.
	getTemplate: function () {
		return "eta.njk";
	},

	// Add all the data to the template.
	getTemplateData: function () {
		return {
			config: this.config,
			currentETA: this.transportETAProvider.currentETA(),
		};
	},

	// What to do when the HK Transport ETA provider has new information available?
	updateAvailable: function () {
		Log.log("New ETA information available.");
		this.updateDom(0);
		this.scheduleUpdate();

		if (this.transportETAProvider.currentETA()) {
			this.sendNotification("CURRENTWEATHER_TYPE", { type: this.transportETAProvider.currentETA() });
		}
	},

	scheduleUpdate: function (delay = null) {
		let nextLoad = this.config.updateInterval;
		if (delay !== null && delay >= 0) {
			nextLoad = delay;
		}

		setTimeout(() => {
			this.transportETAProvider.fetchETA();
		}, nextLoad);
	},

	addFilters() {
		this.nunjucksEnvironment().addFilter(
			"formatTime",
			function (date) {
				if (Array.isArray(date)) {
					const retArray = date.map(singleDate => {
						singleDate = moment(singleDate);

						if (this.config.timeFormat !== 24) {
							if (this.config.showPeriod) {
								if (this.config.showPeriodUpper) {
									return singleDate.format("h:mm A");
								} else {
									return singleDate.format("h:mm a");
								}
							} else {
								return singleDate.format("h:mm");
							}
						}

						return singleDate.format("HH:mm");
					});
					return retArray.toString();
				} else {
					date = moment(date);

					if (this.config.timeFormat !== 24) {
						if (this.config.showPeriod) {
							if (this.config.showPeriodUpper) {
								return date.format("h:mm A");
							} else {
								return date.format("h:mm a");
							}
						} else {
							return date.format("h:mm");
						}
					}

					return date.format("HH:mm");
				}
			}.bind(this)
		);

		this.nunjucksEnvironment().addFilter(
			"fromNow",
			function (dateArray) {
				const retArray = dateArray.map(date => {
					date = moment(date);
					return date.endOf('minute').fromNow();
				});
				return retArray.toString();
			}.bind(this)
		);

		this.nunjucksEnvironment().addFilter(
			'json',
			function (value, spaces) {
				if (value instanceof nunjucks.runtime.SafeString) {
					value = value.toString()
				}
				const jsonString = JSON.stringify(value, null, spaces).replace(/</g, '\\u003c')
				return nunjucks.runtime.markSafe(jsonString)
			}.bind(this)
		);

		this.nunjucksEnvironment().addFilter(
			"calcNumSteps",
			function (forecast) {
				return Math.min(forecast.length, this.config.maxNumberOfDays);
			}.bind(this)
		);

		this.nunjucksEnvironment().addFilter(
			"calcNumEntries",
			function (dataArray) {
				return Math.min(dataArray.length, this.config.maxEntries);
			}.bind(this)
		);

		this.nunjucksEnvironment().addFilter(
			"opacity",
			function (currentStep, numSteps) {
				if (this.config.fade && this.config.fadePoint < 1) {
					if (this.config.fadePoint < 0) {
						this.config.fadePoint = 0;
					}
					const startingPoint = numSteps * this.config.fadePoint;
					const numFadesteps = numSteps - startingPoint;
					if (currentStep >= startingPoint) {
						return 1 - (currentStep - startingPoint) / numFadesteps;
					} else {
						return 1;
					}
				} else {
					return 1;
				}
			}.bind(this)
		);

		this.nunjucksEnvironment().addFilter(
			"json",
			function (value, spaces) {
				if (value instanceof nunjucks.runtime.SafeString) {
					value = value.toString()
				}
				const jsonString = JSON.stringify(value, null, spaces).replace(/</g, '\\u003c')
				return nunjucks.runtime.markSafe(jsonString)
			}.bind(this)
		);
	}
});

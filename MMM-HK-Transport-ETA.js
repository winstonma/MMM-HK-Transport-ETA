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
		reloadInterval: 1 * 60 * 1000, // every 1 minute
		updateInterval: 5 * 1000,  // every 5 seconds
		animationSpeed: 2500,
		timeFormat: config.timeFormat,
		lang: config.language,
		initialLoadDelay: 0, // 0 seconds delay
		tableClass: "small",
		colored: false,
	},

	// Module properties.
	transportETAProvider: null,

	// Can be used by the provider to display location of event if nothing else is specified
	firstEvent: null,

	// Define required scripts.
	getStyles: function () {
		return ["font-awesome.css", "MMM-HK-Transport-ETA.css"];
	},

	// Return the scripts that are necessary for the weather module.
	getScripts: function () {
		return ["moment.js", "hktransportetaprovider.js", "etaobject.js", this.file("providers/" + this.config.transportETAProvider.toLowerCase() + ".js")];
	},

	// Override getHeader method.
	getHeader: function () {
		return this.transportETAProvider.currentETA() ?
			this.transportETAProvider.currentETA()[0].station : `${this.data.classes}-${this.config.transportETAProvider}`;
	},

	getTranslations() {
		return {
			en: "translations/en.json",
			"zh-tw": "translations/zh-tw.json",
		};
	},

	// Start the weather module.
	start: function () {
		this.loaded = false;
		this.displayRelativeTime = false;
		this.error = null;

		// Moment.js config
		moment.locale(this.config.lang);
		moment.relativeTimeThreshold('m', 60);

		const momentLanguageConfigData = {
			"en": {
				relativeTime: {
					s: "just now",
					ss: "just now",
					m: '%dm',
					mm: '%dm',
					h: '%dh',
					hh: '%dh',
				}
			},
			"zh-tw": {
				relativeTime: {
					s: "現在",
					ss: "現在",
					m: '%d分',
					mm: '%d分',
					h: '%d小時',
					hh: '%d小時',
				}
			},
		};

		const lang = this.config.lang.startsWith("zh") ? "zh-tw" : "en";

		moment.updateLocale(lang, momentLanguageConfigData[lang]);

		// Initialize the weather provider.
		this.transportETAProvider = HKTransportETAProvider.initialize(this.config.transportETAProvider, this);

		// Add custom filters
		this.addFilters();

		if (this.config.transportETAProvider === "kmb") {
			this.sendSocketNotification("ADD_KMB_STOP", this.config.sta);
		} else {
			// Let the weather provider know we are starting.
			this.transportETAProvider.start();

			// Schedule the first update.
			this.scheduleUpdate(this.config.initialLoadDelay);
		}
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "KMB_STOP_ITEM") {
			this.config.stops = payload;

			const config = Object.assign({}, this.transportETAProvider.defaults, this.config);
			this.transportETAProvider.setConfig(config);

			// Let the weather provider know we are starting.
			this.transportETAProvider.start();

			// Schedule the first update.
			this.scheduleUpdate(this.config.initialLoadDelay);
		}
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
		if (this.error) {
			return {
				error: this.error
			};
		}
		return {
			config: this.config,
			currentETA: this.transportETAProvider.currentETA()
		};
	},

	// What to do when the HK Transport ETA provider has new information available?
	updateAvailable: function () {
		Log.log("New ETA information available.");

		if (this.config.updateInterval !== 0 && !this.loaded) {
			this.scheduleUpdateInterval();
		} else {
			this.updateDom(this.config.animationSpeed);
		}

		this.scheduleUpdate();
		this.loaded = true;
	},

	/**
	 * Schedule visual update.
	 */
	scheduleUpdateInterval: function () {
		this.updateDom(this.config.animationSpeed);

		const currentTime = Date.now();
		const nextLoad = this.config.updateInterval - (currentTime % this.config.updateInterval);
		this.config.displayRelativeTime = Math.round(currentTime / this.config.updateInterval) % 2;

		if (this.timer) clearTimeout(this.timer);

		this.timer = setTimeout(() => {
			this.scheduleUpdateInterval();
		}, nextLoad);
	},

	scheduleUpdate: function (delay = null) {
		let nextLoad = this.config.reloadInterval;
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
							return singleDate.format("h:mm")
						}
						return singleDate.format("HH:mm");
					});
					return retArray.toString();
				} else {
					date = moment(date);

					if (this.config.timeFormat !== 24) {
						return date.format("h:mm");
					}

					return date.format("HH:mm");
				}
			}.bind(this)
		);

		this.nunjucksEnvironment().addFilter(
			"fromNow",
			function (dateArray) {
				return dateArray.map(date => moment(date).fromNow(true)).toString();
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

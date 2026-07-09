/* MagicMirror²
 * Module: MMM-HK-Transport-ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */
Module.register("MMM-HK-Transport-ETA", {
	// Default module config.
	defaults: {
		transportETAProvider: "mtr",
		sta: "Hong Kong",
		reloadInterval: 1 * 60 * 1000, // every 1 minute
		updateInterval: 5 * 1000, // every 5 seconds
		animationSpeed: 2500,
		timeFormat: config.timeFormat,
		lang: config.language,
		initialLoadDelay: 0, // 0 seconds delay
		tableClass: "small",
		colored: false,
		showHeader: false,
	},

	// Module properties.
	transportETAProvider: null,

	// Can be used by the provider to display location of event if nothing else is specified
	firstEvent: null,

	// Define required scripts.
	getStyles() {
		return ["font-awesome.css", "MMM-HK-Transport-ETA.css"];
	},

	// Return the scripts that are necessary for the ETA module.
	getScripts() {
		return [
			"moment.js",
			"hktransportetaprovider.js",
			this.file(
				`providers/${this.config.transportETAProvider.toLowerCase()}.js`,
			),
		];
	},

	// Override getHeader method.
	getHeader() {
		if (typeof this.transportETAProvider.getHeader === "function") {
			return this.transportETAProvider.getHeader();
		}
		const currentETA = this.transportETAProvider.currentETA();
		return (
			currentETA?.[0]?.station ??
			`${this.data.classes}-${this.config.transportETAProvider}`
		);
	},

	getTranslations() {
		return {
			en: "translations/en.json",
			"zh-tw": "translations/zh-tw.json",
		};
	},

	// Start the ETA module.
	async start() {
		this.loaded = false;
		this.displayRelativeTime = false;
		this.error = null;

		// Moment.js config
		moment.locale(this.config.lang);
		moment.relativeTimeThreshold("m", 60);

		const momentLanguageConfigData = {
			en: {
				relativeTime: {
					s: "just now",
					ss: "just now",
					m: "%dm",
					mm: "%dm",
					h: "%dh",
					hh: "%dh",
				},
			},
			"zh-tw": {
				relativeTime: {
					s: "現在",
					ss: "現在",
					m: "%d分",
					mm: "%d分",
					h: "%d小時",
					hh: "%d小時",
				},
			},
		};

		const lang = this.config.lang.startsWith("zh") ? "zh-tw" : "en";

		moment.updateLocale(lang, momentLanguageConfigData[lang]);

		// Initialize the ETA provider.
		this.transportETAProvider = HKTransportETAProvider.initialize(
			this.config.transportETAProvider,
			this,
		);

		// Add custom filters
		this.addFilters();

		if (
			this.config.transportETAProvider === "kmb" &&
			this.config.sta.includes("-")
		) {
			try {
				const stoppings = await this.transportETAProvider.getKmbStoppings(
					this.config.sta,
				);

				// Update the provider's config with the fetched stoppings
				// Directly mutate to preserve the searchApiCache in the provider's config
				this.transportETAProvider.config.stops = stoppings;

				// Let the ETA provider know we are starting.
				this.transportETAProvider.start();

				// Schedule the first update.
				this.scheduleUpdate(this.config.initialLoadDelay);
			} catch (error) {
				Log.error("Failed to fetch KMB stop data:", error);
				this.error = error.message;
				this.updateDom();
			}
		} else {
			// Let the ETA provider know we are starting.
			this.transportETAProvider.start();

			// Schedule the first update.
			this.scheduleUpdate(this.config.initialLoadDelay);
		}
	},

	// Override notification handler.
	notificationReceived(notification, payload, sender) {},

	// Select the template depending on the display type.
	getTemplate() {
		return "eta.njk";
	},

	// Add all the data to the template.
	getTemplateData() {
		if (this.error) {
			return {
				error: this.error,
			};
		}
		return {
			config: this.config,
			currentETA: this.transportETAProvider.currentETA(),
		};
	},

	// What to do when the HK Transport ETA provider has new information available?
	updateAvailable() {
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
	scheduleUpdateInterval() {
		this.updateDom(this.config.animationSpeed);

		const currentTime = Date.now();
		const nextLoad =
			this.config.updateInterval -
			(currentTime % this.config.updateInterval);
		this.config.displayRelativeTime =
			Math.round(currentTime / this.config.updateInterval) % 2;

		if (this.timer) clearTimeout(this.timer);

		this.timer = setTimeout(() => {
			this.scheduleUpdateInterval();
		}, nextLoad);
	},

	scheduleUpdate(delay = null) {
		const nextLoad =
			delay !== null && delay >= 0 ? delay : this.config.reloadInterval;

		setTimeout(() => {
			this.transportETAProvider.fetchETA();
		}, nextLoad);
	},

	addFilters() {
		this.nunjucksEnvironment().addFilter("formatTime", (date) => {
			const format = this.config.timeFormat !== 24 ? "h:mm" : "HH:mm";

			if (Array.isArray(date)) {
				return date
					.map((singleDate) => {
						// Log invalid dates for CTB debugging
						const m = moment(singleDate);
						if (!m.isValid()) {
							Log.warn(
								`[CTB] formatTime received invalid date:`,
								singleDate,
							);
						}
						return m.format(format);
					})
					.join(", ");
			}

			const m = moment(date);
			if (!m.isValid()) {
				Log.warn(`[CTB] formatTime received invalid date:`, date);
			}
			return m.format(format);
		});

		this.nunjucksEnvironment().addFilter("fromNow", (dateArray) => {
			return dateArray
				.map((date) => {
					const m = moment(date);
					if (!m.isValid()) {
						Log.warn(`[CTB] fromNow received invalid date:`, date);
						return "N/A";
					}
					return m.fromNow(true);
				})
				.join(", ");
		});

		this.nunjucksEnvironment().addFilter("json", (value, spaces) => {
			const normalizedValue =
				value instanceof nunjucks.runtime.SafeString
					? value.toString()
					: value;
			const jsonString = JSON.stringify(
				normalizedValue,
				null,
				spaces,
			).replace(/</g, "\\u003c");
			return nunjucks.runtime.markSafe(jsonString);
		});
	},
});

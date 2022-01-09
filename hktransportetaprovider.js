/* global Class */

/* Magic Mirror
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */
const HKTransportETAProvider = Class.extend({
	// ETA Provider Properties
	providerName: null,
	defaults: {},

	// The following properties have accessor methods.
	// Try to not access them directly.
	currentETAArray: null,

	// The following properties will be set automatically.
	// You do not need to overwrite these properties.
	config: null,
	delegate: null,
	providerIdentifier: null,

	// ETA Provider Methods
	// All the following methods can be overwritten, although most are good as they are.

	// Called when a HK Transport ETA provider is initialized.
	init: function (config) {
		this.config = config;
		Log.info(`HK Transport ETA provider: ${this.providerName} initialized.`);
	},

	// Called to set the config, this config is the same as the ETA module's config.
	setConfig: function (config) {
		this.config = config;
		Log.info(`HK Transport ETA provider: ${this.providerName} config set.`, this.config);
	},

	// Called when the HK Transport ETA provider is about to start.
	start: function () {
		Log.info(`HK Transport ETA provider: ${this.providerName} started.`);
	},

	// This method should start the API request to fetch the current ETA.
	// This method should definitely be overwritten in the provider.
	fetchETA: function () {
		Log.warn(`HK Transport ETA provider: ${this.providerName} does not subclass the fetchETA method.`);
	},

	// This returns the current ETA object for the current ETA.
	currentETA: function () {
		return this.currentETAArray;
	},

	// Set the currentETA and notify the delegate that new information is available.
	setCurrentETA: function (currentETAArray) {
		// We should check here if we are passing a ETA
		this.currentETAArray = currentETAArray;
	},

	// Notify the delegate that new ETA is available.
	updateAvailable: function () {
		this.delegate.updateAvailable(this);
	},

	// A convenience function to make requests. It returns a promise.
	fetchData: function (url, method = "GET", data = null) {
		const getData = function (mockData) {
			return new Promise(function (resolve, reject) {
				if (mockData) {
					let mdata = mockData;
					mdata = mdata.substring(1, mdata.length - 1);
					resolve(JSON.parse(mdata));
				} else {
					const request = new XMLHttpRequest();
					request.open(method, url, true);
					request.onreadystatechange = function () {
						if (this.readyState === 4) {
							if (this.status === 200) {
								resolve(JSON.parse(this.response));
							} else {
								reject(request);
							}
						}
					};
					if (data) {
						request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
						request.send(JSON.stringify(data));
					} else {
						request.send();
					}
				}
			});
		};

		return getData(this.config.mockData);
	}
});

/**
 * Collection of registered ETA providers.
 */
HKTransportETAProvider.providers = [];

/**
 * Static method to register a new HK Transport ETA provider.
 *
 * @param {string} providerIdentifier The name of the HK Transport ETA provider
 * @param {object} providerDetails The details of the HK Transport ETA provider
 */
HKTransportETAProvider.register = function (providerIdentifier, providerDetails) {
	HKTransportETAProvider.providers[providerIdentifier.toLowerCase()] = HKTransportETAProvider.extend(providerDetails);
};

/**
 * Static method to initialize a new HK Transport ETA provider.
 *
 * @param {string} providerIdentifier The name of the HK Transport ETA provider
 * @param {object} delegate The ETA module
 * @returns {object} The new HK Transport ETA provider
 */
HKTransportETAProvider.initialize = function (providerIdentifier, delegate) {
	providerIdentifier = providerIdentifier.toLowerCase();

	const provider = new HKTransportETAProvider.providers[providerIdentifier]();
	const config = Object.assign({}, provider.defaults, delegate.config);

	provider.delegate = delegate;
	provider.setConfig(config);

	provider.providerIdentifier = providerIdentifier;
	if (!provider.providerName) {
		provider.providerName = providerIdentifier;
	}

	return provider;
};

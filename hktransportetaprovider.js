/* MagicMirror²
 * Module: ETA
 *
 * By Winston Ma https://github.com/winstonma
 * AGPL-3.0 Licensed.
 *
 * This class is the blueprint for a HK Transport ETA provider.
 */

class HKTransportETAProvider {
	// ETA data with enforced access via accessor methods.
	#currentETAArray = null;

	// Collection of registered ETA providers.
	static providers = Object.create(null);

	constructor() {
		// ETA Provider Properties
		this.providerName = null;
		this.defaults = {};

		// The following properties will be set automatically.
		// You do not need to overwrite these properties.
		this.config = null;
		this.delegate = null;
		this.providerIdentifier = null;
	}

	// ETA Provider Methods
	// All the following methods can be overwritten, although most are good as they are.

	// Called when a HK Transport ETA provider is initialized.
	init(config) {
		this.config = config;
		Log.info(
			`HK Transport ETA provider: ${this.providerName} initialized.`,
		);
	}

	// Called to set the config, this config is the same as the ETA module's config.
	setConfig(config) {
		this.config = config;
		Log.info(
			`HK Transport ETA provider: ${this.providerName} config set.`,
			this.config,
		);
	}

	// Called when the HK Transport ETA provider is about to start.
	start() {
		Log.info(`HK Transport ETA provider: ${this.providerName} started.`);
	}

	// This method should start the API request to fetch the current ETA.
	// This method should definitely be overwritten in the provider.
	fetchETA() {
		Log.warn(
			`HK Transport ETA provider: ${this.providerName} does not subclass the fetchETA method.`,
		);
	}

	// This returns the current ETA object for the current ETA.
	currentETA() {
		return this.#currentETAArray;
	}

	// Set the currentETA and notify the delegate that new information is available.
	setCurrentETA(currentETAArray) {
		// We should check here if we are passing a ETA
		this.#currentETAArray = currentETAArray;
	}

	// Notify the delegate that new ETA is available.
	updateAvailable() {
		this.delegate.updateAvailable(this);
	}

	/**
	 * A convenience function to make requests.
	 *
	 * @param {string} url the url to fetch from
	 * @param {string} type what contenttype to expect in the response, can be "json" or "xml"
	 * @param {Array.<{name: string, value:string}>} requestHeaders the HTTP headers to send
	 * @param {Array.<string>} expectedResponseHeaders the expected HTTP headers to recieve
	 * @returns {Promise} resolved when the fetch is done
	 */
	async fetchData(
		url,
		type = "json",
		requestHeaders = undefined,
		expectedResponseHeaders = undefined,
	) {
		const mockData = this.config.mockData;
		if (mockData) {
			const data = mockData.substring(1, mockData.length - 1);
			return JSON.parse(data);
		}
		const headers = {};
		if (requestHeaders) {
			requestHeaders.forEach((h) => {
				headers[h.name] = h.value;
			});
		}
		const response = await fetch(url, { headers });
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		if (type === "xml") {
			const text = await response.text();
			return new DOMParser().parseFromString(text, "text/xml");
		}
		return response.json();
	}

	/**
	 * Static method to register a new HK Transport ETA provider.
	 *
	 * @param {string} providerIdentifier The name of the HK Transport ETA provider
	 * @param {Function} ProviderClass A class extending HKTransportETAProvider
	 */
	static register(providerIdentifier, ProviderClass) {
		HKTransportETAProvider.providers[providerIdentifier.toLowerCase()] =
			ProviderClass;
	}

	/**
	 * Static method to initialize a new HK Transport ETA provider.
	 *
	 * @param {string} providerIdentifier The name of the HK Transport ETA provider
	 * @param {object} delegate The ETA module
	 * @returns {HKTransportETAProvider} The new HK Transport ETA provider instance
	 */
	static initialize(providerIdentifier, delegate) {
		providerIdentifier = providerIdentifier.toLowerCase();

		const ProviderClass = HKTransportETAProvider.providers[providerIdentifier];

		if (typeof ProviderClass !== "function") {
			throw new Error(
				`HK Transport ETA provider "${providerIdentifier}" is not a valid provider class. ` +
					"Make sure the provider file exports a class extending HKTransportETAProvider.",
			);
		}

		const provider = new ProviderClass();
		const config = { ...provider.defaults, ...delegate.config };

		provider.delegate = delegate;
		provider.setConfig(config);

		provider.providerIdentifier = providerIdentifier;
		if (!provider.providerName) {
			provider.providerName = providerIdentifier;
		}

		return provider;
	}
}

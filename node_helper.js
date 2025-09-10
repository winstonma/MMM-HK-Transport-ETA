/* MagicMirror²
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

const NodeHelper = require("node_helper");
const Log = require("../../js/logger");

// Dependencies for ADD_KMB_STOP logic
const Kmb = require("js-kmb-api").default;
const StorageShim = require("node-storage-shim");

module.exports = NodeHelper.create({
	// Override start method.
	start: function () {
		Log.log("Starting node helper for: " + this.name);
		this.localStorage = new StorageShim(); // Initialize localStorage here
	},

	// Override socketNotificationReceived received.
	socketNotificationReceived: async function (notification, payload) {
		if (notification === "ADD_KMB_STOP") {
			this.kmb = new Kmb("en", this.localStorage);
			const stop = payload ? new this.kmb.Stop(payload) : null;
			stop.getStoppings()
				.then((data) => {
					const retVal = { station: payload, data: data };
					this.broadcastETAs(retVal);
				})
				.catch((error) => {
					Log.error("Error fetching KMB stop data:", error.message);
					// Optionally send an error notification back to the module
					this.sendSocketNotification("KMB_STOP_ITEM", {
						error: error.message,
						station: payload,
					});
				});
		}
	},

	/*
	 * Creates an object with all feed items of the different registered ETAs,
	 * and broadcasts these using sendSocketNotification.
	 */
	broadcastETAs: function (data) {
		Log.log("Sending KMB Stop Info");
		this.sendSocketNotification("KMB_STOP_ITEM", data);
	},
});

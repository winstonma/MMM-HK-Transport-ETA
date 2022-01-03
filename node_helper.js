/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

const NodeHelper = require("node_helper");
const Kmb = require('js-kmb-api').default;
const StorageShim = require('node-storage-shim');
const Log = require("../../js/logger");

module.exports = NodeHelper.create({
  // Override start method.
  start: function () {
    Log.log("Starting node helper for: " + this.name);
    this.localStorage = new StorageShim();
  },

  // Override socketNotificationReceived received.
  socketNotificationReceived: function (notification, payload) {
    if (notification === "ADD_KMB_STOP") {
      this.kmb = new Kmb('en', this.localStorage);
      const stop = payload ? new this.kmb.Stop(payload) : null;
      stop.getStoppings()
        .then(data => {
          this.broadcastETAs(data);
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

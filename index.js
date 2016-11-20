'use strict'

const Plugin = require('lisa-plugin')
//const tinycolor = require("tinycolor2")

module.exports = class HuePlugin extends Plugin {

  /**
   * Initialisation of your plugin
   * Called once, when plugin is loaded
   * @returns Promise
   */
  init() {
    return this.services.HUEService.init()
  }

  /**
   * Called automatically to search for new devices
   * @return Promise
   */
  searchDevices() {
    return this.services.HUEService.searchLights()
  }

  /**
   * Called when
   * @param action to execute
   * @param infos context of the action
   * @return Promise
   */
  interact(action, infos) {
    return Promise.resolve()
  }

  constructor(app) {
    super(app, {
      config: require('./config'),
      api: require('./api'),
      pkg: require('./package'),
      bots: require('./bots')
    })
  }
}

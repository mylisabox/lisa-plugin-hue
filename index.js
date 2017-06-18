'use strict'

const Plugin = require('lisa-plugin')

module.exports = class HuePlugin extends Plugin {

  setDeviceValue(device, key, newValue) {
    const options = {}
    options[key] = newValue
    return this.services.HUEService.setLightState(device, options)
  }

  setDevicesValue(devices, key, newValue) {
    const options = {}
    options[key] = newValue
    const values = []
    for (let device of devices) {
      values.push(this.services.HUEService.setLightState(device, options))
    }
    return Promise.all(values)
  }

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
    searchDevices() {
    return this.services.HUEService.searchLights()
  }*/

  /**
   * Called when
   * @param action to execute
   * @param infos context of the action
   * @return Promise
   */
  interact(action, infos) {
    return this.services.ChatBotService.interact(action, infos)
  }

  constructor(app) {
    super(app, {
      api: require('./api'),
      config: require('./config'),
      pkg: require('./package')
    })
  }
}

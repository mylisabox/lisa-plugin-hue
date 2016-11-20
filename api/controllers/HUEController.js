'use strict'

const Controller = require('lisa-plugin').Controller

/**
 * @module HUEController
 * @description Generated Trails.js Controller.
 */
module.exports = class HUEController extends Controller {
  setLightState(device, key, newValue) {
    return this.plugin.services.HUEService.setLightState(device, key, newValue)
  }

  linkClicked() {
    return this.plugin.services.HUEService.linkClicked()
  }
}


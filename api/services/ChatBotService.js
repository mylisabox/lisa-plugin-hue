'use strict'

const Service = require('lisa-plugin').Service
const hue = require('node-hue-api')
const HueApi = hue.HueApi
const tinycolor = require('tinycolor2')
const _ = require('lodash')

/**
 * @module ChatBotService
 * @description ChatBot service
 */
module.exports = class ChatBotService extends Service {
  interact(action, infos) {
    const room = infos.fields.room
    const options = {}
    switch (action) {
      case 'LIGHT_ALL':
        options['onoff'] = 'on'
        options['dim'] = infos.fields.number
        options['hue'] = infos.fields.color.value
        break
      case 'LIGHT_TURN_ON':
        options['onoff'] = 'on'
        break
      case 'LIGHT_TURN_OFF':
      case 'LIGHT_TURN_OFF':
        options['onoff'] = 'off'
        break
      case 'LIGHT_BRIGHTNESS':
        options['dim'] = infos.fields.number
        break
      case 'LIGHT_COLOR':
        options['hue'] = infos.fields.color.value
        break
    }

    const criteria = {}
    if (room) {
      criteria.roomId = room.id

      return this.lisa.findDevices(criteria).then(devices => {
        const setStates = []
        let promise = Promise.resolve()
        let nextPromise = promise
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        devices.forEach(device => {
          const p = this.plugin.services.HUEService.setLightState(device, options)
          promise = nextPromise.then(() => delay(30000).then(() => p))
          nextPromise = p
        })
        return promise
      })
    }
    else {
      return this.plugin.services.HUEService.setLightState(null, options)
    }
  }

}


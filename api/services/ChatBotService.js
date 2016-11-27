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
      case 'HUE_ALL':
        options['state'] = 'on'
        options['bri'] = infos.fields.number
        options['color'] = infos.fields.color.value
        break
      case 'HUE_TURN_ON':
        options['state'] = 'on'
        break
      case 'HUE_TURN_OFF':
        options['state'] = 'off'
        break
      case 'HUE_BRIGHTNESS':
        options['bri'] = infos.fields.number
        break
      case 'HUE_COLOR':
        options['color'] = infos.fields.color.value
        break
    }
    return this.lisa.findDevices({
      roomId: room.id
    }).then(devices => {
      const setStates = []
      devices.forEach(device => {
        setStates.push(this.plugin.services.HUEService.setLightState(device, options))
      })
      return Promise.all(setStates)
    })
  }

}


'use strict'

const Plugin = require('lisa-plugin')
const BridgesManager = require('./lib').BridgesManager

module.exports = class HuePlugin extends Plugin {

  /**
   * Initialisation of your plugin
   * Called once, when plugin is loaded
   * @returns Promise
   */
  init() {
    this.bridgesManager = new BridgesManager(this.lisa)
    return super.init().then(() => this.bridgesManager.search())
      .catch(err => {
        this.log.error(err)
      })
  }

  /**
   * Called when
   * @param action to execute
   * @param infos context of the action
   * @return Promise
   */
  interact(action, infos) {
    let room = infos.fields.room || infos.context.room
    const device = infos.fields.device
    if (device && device.pluginName !== this.fullName) {
      return Promise.resolve()
    }
    const options = {}
    switch (action) {
      case 'LIGHT_ALL_TURN_OFF':
        options['onoff'] = 'off'
        room = null
        break
      case 'LIGHT_TURN_ON':
      case 'DEVICE_TURN_ON':
        options['onoff'] = 'on'
        if (infos.fields.number) {
          options['dim'] = infos.fields.number
        }
        if (infos.fields.color) {
          options['hue'] = infos.fields.color.value
        }
        break
      case 'LIGHT_TURN_OFF':
      case 'DEVICE_TURN_OFF':
        options['onoff'] = 'off'
        break
      case 'LIGHT_BRIGHTNESS':
        options['dim'] = infos.fields.number
        break
      default:
        return Promise.resolve()
    }

    const criteria = {}
    if (room) {
      criteria.roomId = room.id

      return this.lisa.findDevices(criteria).then(devices => {
        return this.drivers['light'].setDevicesValues(devices, options)
      })
    }
    else if (device) {
      return this.drivers['light'].setDevicesValues([device], options)
    }
    else {
      return this.drivers['light'].setDevicesValues(null, options)
    }
  }

  constructor(app) {
    super(app, {
      drivers: require('./drivers'),
      config: require('./config'),
      pkg: require('./package')
    })
  }
}

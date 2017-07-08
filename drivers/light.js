'use strict'

const Driver = require('lisa-plugin').Driver
const huejay = require('huejay')
const tinycolor = require('tinycolor2')
const _ = require('lodash')

module.exports = class LightDriver extends Driver {
  constructor(lisa, plugin) {
    super(lisa, plugin)
    this.type = 'light'
  }

  init() {

  }

  saveDevice(deviceData) {
    return this.lisa.createOrUpdateDevices(deviceData)
  }

  pairing(data) {
    let results = {
      devices: [],
      step: 'done'
    }
    const bridgeManager = this.plugin.bridgesManager

    if (!data['bridges_list'] || !data['bridges_list'].id) {
      const ids = Object.keys(bridgeManager.bridges)
      for (const id of ids) {
        results.devices.push({
          name: `Philips HUE (${id} - ${bridgeManager.bridges[id].address})`,
          image: '',
          id: id
        })
      }
      results.step = 'bridges_list'
      results.singleChoice = true
    }
    else if (!data['devices_list'] && data['bridges_list'].id) {
      const bridgeId = data['bridges_list'].id
      const bridge = bridgeManager.bridges[bridgeId]
      results = bridge.register().then(() => {
        return {
          devices: bridge.lights.map(light => {
            return {
              id: light.uniqueId,
              name: light.name,
              image: light.model + '.svg',
              privateData: {
                bridgeId: bridgeId
              }
            }
          }),
          state: 'devices_list'
        }
      }).catch(err => {
        return Promise.reject({
          step: 'image',
          image: 'pairing.png'
        })
      })
    }
    return results instanceof Promise ? results : Promise.resolve(results)
  }

  _sortByBridges(devices) {
    const bridges = {}
    for (let device of devices) {
      const bridgeId = device.privateData.bridgeId
      if (!bridges[bridgeId]) {
        bridges[bridgeId] = []
      }
      bridges[bridgeId].push(device)
    }
    return bridges
  }

  _prepareLightData(light, roomId, existingLisaLight = {}) {
    const hue = Math.round(light.hue / 182.5487)
    const sat = Math.round(light.saturation * 100 / 255)
    const bri = Math.round(light.brightness * 100 / 255)
    const color = tinycolor('hsv(' + (hue) + ', ' + sat + '%, ' + bri + '%)').toHexString()

    const data = {
      internalId: light.id,
      images: { 'off': '/images/widgets/light_off.png', 'on': '/images/widgets/light_on.png' },
      onoff: light.on ? 'on' : 'off',
      dim: bri,
      type: light.type,
      model: light.model.id
    }
    const template = light.type.toLowerCase().indexOf('color') != -1 ?
      require('../widgets/hue_color.json') : require('../widgets/hue_white.json')

    if (light.type.toLowerCase().indexOf('color') != -1) {
      data.hue = color
    }

    const newDevice = {
      roomId: roomId,
      data: data,
      privateData: {
        bridgeId: this.id
      },
      type: this.lisa.DEVICE_TYPE.LIGHT,
      name: light.name,
      template: template
    }
    if (existingLisaLight) {
      newDevice.id = existingLisaLight.id
      newDevice.roomId = existingLisaLight.roomId
      newDevice.name = existingLisaLight.name // don't overide name each time there an update
    }
    return _.defaults(existingLisaLight, newDevice)
  }

  getDevicesData(devices) {
    const data = []
    const sortedDevices = this._sortByBridges(devices)
    const bridgeManager = this.plugin.bridgesManager
    for (let bridgeId in sortedDevices) {
      const bridge = bridgeManager.bridges[bridgeId]
      data.push(bridge.getDevices().then(() => {
        const devicesData = []
        for (let device of devices) {
          devicesData.push(this._prepareLightData(bridge.getLightById(device.data.internalId), device.roomId, device))
        }
        return Promise.resolve(devicesData)
      }))
    }
    return Promise.all(data).then(lights => {
      let finalDevices = []
      for (let bridgeLights of lights) {
        finalDevices = finalDevices.concat(bridgeLights)
      }
      return finalDevices
    })
  }

  setDeviceValue(device, key, newValue) {
    const options = {}
    options[key] = newValue
    return this.setLightState(device, options)
  }

  setDevicesValue(devices, key, newValue) {
    const options = {}
    options[key] = newValue
    return this.setDevicesValues(devices, options)
  }

  setDevicesValues(devices, values) {
    const data = []
    if (devices == null) {
      const bridgeActions = []
      const bridgeManager = this.plugin.bridgesManager
      _.each(bridgeManager.bridges, (bridge, key) => {
        bridgeActions.push(bridge.getRootGroup().then(group => {
          this._setLightValues(group, values)
          return bridge.saveGroup(group)
        }))
      })
      return Promise.all(bridgeActions)
    }
    else {
      for (const device of devices) {
        data.push(this.setLightState(device, values))
      }
      return Promise.all(data)
    }
  }

  unload() {
    return Promise.resolve()
  }

  setLightState(device, options) {
    const bridgeManager = this.plugin.bridgesManager
    const bridge = bridgeManager.bridges[device.privateData.bridgeId]
    const light = bridge.getLightById(device.data.internalId)
    light.name = device.name
    this._setLightValues(light, options)
    return bridge.saveLight(light)
  }

  _setLightValues(item, options) {
    _.each(options, (newValue, key) => {
      if (key === 'onoff') {
        item.on = newValue === 'on'
      } else if (key === 'dim') {
        item.on = true
        item.brightness = Math.round(newValue * 254 / 100)
      } else if (key === 'hue') {
        item.on = true
        const hsl = tinycolor(newValue).toHsl()
        item.brightness = device.data.dim * 254 / 100
        item.hue = Math.round(hsl.h * 182.5487)
        item.saturation = (hsl.s * 100) * 254 / 100
      }
    })
  }

}

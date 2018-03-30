'use strict'

const Driver = require('lisa-plugin').Driver
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
        return this.lisa.findDevices().then(devices => {
          return this._findNewLights(devices, bridge.lights).then(lights => Promise.resolve(
            {
              devices: lights.map(light => {
                const lightWithData = bridge.prepareLightData(light)
                lightWithData.image = light.modelId + '.svg'
                lightWithData.id = lightWithData.privateData.uniqueId
                return lightWithData
              }),
              step: 'devices_list'
            }
          ))
        })
      }).catch(err => {
        return Promise.reject({
          step: 'image',
          image: 'pairing.png'
        })
      })
    }
    else if (data['devices_list']) {
      results = this.lisa.createOrUpdateDevices(data['devices_list'].map(device => {
        delete device.id
        return device
      })).then(() => Promise.resolve({
        step: 'done'
      }))
    }
    return results instanceof Promise ? results : Promise.resolve(results)
  }

  _findNewLights(lisaLights, hueLights) {
    const lights = []
    for (const hueLight of hueLights) {
      const lisaLight = lisaLights.filter(light => hueLight.uniqueId === light.privateData.uniqueId)
      if (lisaLight.length === 0) {
        lights.push(hueLight)
      }
    }
    return Promise.resolve(lights)
  }

  _sortByBridges(devices) {
    const bridges = {}
    for (const device of devices) {
      const bridgeId = device.privateData.bridgeId
      if (!bridges[bridgeId]) {
        bridges[bridgeId] = []
      }
      bridges[bridgeId].push(device)
    }
    return bridges
  }

  getDevicesData(devices) {
    const data = []
    const sortedDevices = this._sortByBridges(devices)
    const bridgeManager = this.plugin.bridgesManager
    for (const bridgeId in sortedDevices) {
      const bridge = bridgeManager.bridges[bridgeId]
      const todo = bridge.lights.length === 0 ? bridge.getDevices() : Promise.resolve(bridge.lights)
      data.push(todo.then(() => {
        const devicesData = []
        for (const device of devices) {
          devicesData.push(bridge.prepareLightData(bridge.getLightById(device.privateData.uniqueId), device.roomId, device))
        }
        return Promise.resolve(devicesData)
      }))
    }
    return Promise.all(data).then(lights => {
      let finalDevices = []
      for (const bridgeLights of lights) {
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
    if (devices === null) {
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
    const light = bridge.getLightById(device.privateData.uniqueId)
    light.name = device.name
    this._setLightValues(light, options)
    return bridge.saveLight(light)
  }

  _setLightValues(item, options) {
    _.each(options, (newValue, key) => {
      if (key === 'onoff') {
        item.on = newValue === 'on'
      }
      else if (key === 'dim') {
        item.on = true
        item.brightness = Math.round(newValue * 254 / 100)
      }
      else if (key === 'hue' && item.hue !== undefined) {
        item.on = true
        const hsl = tinycolor(newValue).toHsl()
        //item.brightness = Math.round(hsl.l * 254 / 100)
        item.hue = Math.round(hsl.h * 182.5487)
        item.saturation = (hsl.s * 100) * 254 / 100
      }
    })
  }
}

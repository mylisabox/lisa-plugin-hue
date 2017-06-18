'use strict'

const Service = require('lisa-plugin').Service
const hue = require('node-hue-api')
const HueApi = hue.HueApi
const tinycolor = require('tinycolor2')
const _ = require('lodash')

/**
 * @module HUEService
 * @description HUE light service
 */
module.exports = class HUEService extends Service {
  _config(hostname, user) {
    this.api = new HueApi(hostname, user)
    if (this.api) {
      return this.api.config()
    }
    else {
      return Promise.reject(new Error('hue_error_not_found'))
    }
  }

  _prepareLightData(light, roomId, existingLisaLight) {
    const hue = Math.round(light.state.hue / 182.5487)
    const sat = Math.round(light.state.sat * 100 / 255)
    const bri = Math.round(light.state.bri * 100 / 255)
    const color = tinycolor('hsv(' + (hue) + ', ' + sat + '%, ' + bri + '%)').toHexString()

    const data = {
      internalId: light.id,
      images: {'off': '/images/widgets/light_off.png', 'on': '/images/widgets/light_on.png'},
      onoff: light.state.on ? 'on' : 'off',
      dim: bri,
      type: light.type
    }
    const template = light.type.toLowerCase().indexOf('color') != -1 ?
      require('../../widgets/hue_color.json') : require('../../widgets/hue_white.json')

    if (light.type.toLowerCase().indexOf('color') != -1) {
      data.hue = color
    }

    const newDevice = {
      roomId: roomId,
      data: data,
      type: this.lisa.DEVICE_TYPE.LIGHT,
      name: light.name,
      template: template
    }
    if (existingLisaLight) {
      newDevice.id = existingLisaLight.id
      newDevice.roomId = existingLisaLight.roomId
      newDevice.name = existingLisaLight.name // don't overide name each time there an update
    }
    return newDevice
  }

  _manageLights(lights) {
    return this.lisa.findDevices().then(devices => {
      const newLights = []
      lights.forEach(light => {
        const lightExist = devices.find(device => device.data.internalId === light.id)
        if (lightExist) {
          delete lightExist.createdAt
          delete lightExist.updatedAt
          delete lightExist.pluginName
        }
        const newDevice = this._prepareLightData(light, lightExist ? lightExist.roomId : null, lightExist)
        if (!_.isEqual(newDevice, lightExist)) {
          newLights.push(this.lisa.createOrUpdateDevices(newDevice))
        }
      })
      return Promise.all(newLights)
    })
  }

  _addRoomsAndLights(rooms, lights) {
    const newRooms = []
    rooms.forEach(room => {
      newRooms.push(this.lisa.createRoom(room.name))
    })
    return Promise.all(newRooms).then(results => {
      const newDevices = []
      results.forEach(room => {
        const hueRoom = rooms.find(item => item.name === room.name)
        const roomLigths = lights.filter(item => hueRoom.lights.indexOf(item.id) != -1)
        roomLigths.forEach(light => {
          const newDevice = this._prepareLightData(light, room.id)
          newDevices.push(this.lisa.createOrUpdateDevices(newDevice))
        })
      })
      return Promise.all(newDevices)
    })
  }

  searchLights() {
    if (!this.api) {
      return Promise.resolve()
    }
    return this.lisa.getRooms().then(rooms => {
      const todos = [this.api.lights()]
      let manageGroups = false
      if (rooms.length === 0) {
        todos.push(this.api.groups())
        manageGroups = true
      }
      return Promise.all(todos).then(results => {
        const lights = results[0].lights
        if (manageGroups) {
          const groups = results[1].filter(item => item.type.toLowerCase() == 'room')
          return this._addRoomsAndLights(groups, lights)
        }
        else {
          return this._manageLights(lights)
        }
      })
    })
  }

  _manageBridge(bridge, preferences = {bridges: {}}) {
    const hostname = bridge.ipaddress
    //FIXME remove when trailpack-cache is working
    preferences = {
      bridges: {}
    }
    preferences.bridges[bridge.id] = 'ty76iZ7rxg-6BWPEZhUoMYcfIhjiigTV0cowkBUq'
    //END FIXME
    if (preferences && preferences.bridges && preferences.bridges[bridge.id]) {
      return this._config(hostname, preferences.bridges[bridge.id])
    }
    else {
      const api = new HueApi()
      return api.createUser(hostname, null, null).then(userToken => {
        preferences.bridges[bridge.id] = userToken
        return this.lisa.setPreferences(preferences).then(preferences => {
          return this._config(hostname, preferences)
        })
      })
    }
  }

  _searchBridges() {
    return hue.nupnpSearch().then(bridges => {
      this.bridges = bridges
      if (!this.bridges || this.bridges.length === 0) {
        return Promise.reject(new Error('hue_error_not_found'))
      }
      else {
        return this.lisa.getPreferences().then(preferences => {
          const nextActionsPromise = []
          for (let i = 0; i < this.bridges.length; i++) {
            const bridge = this.bridges[i]
            nextActionsPromise.push(this._manageBridge(bridge, preferences))

          }
          return Promise.all(nextActionsPromise)
        }).catch(err => {
          if (err.name == 'Api Error') {
            if (err.message == 'link button not pressed') {
              this.lisa.sendNotification(null, 'link_button', 'link_button_desc', null, null, 'HUEService.linkClicked', 'fr')
            }
          }
          return Promise.reject(err)
        })
      }
    })
  }

  linkClicked() {
    return this._searchBridges()
  }

  setLightState(device, values) {
    const lightState = hue.lightState.create()
    _.each(values, (newValue, key) => {
      let hsl = null
      if (key == 'onoff' && newValue == 'on') {
        lightState.on()
      }
      if (key == 'onoff' && newValue == 'off') {
        lightState.off()
      }
      if (key == 'hue') {
        lightState.on()
        hsl = tinycolor(newValue).toHsl()
      }
      if (key == 'colorRGB') {
        lightState.on()
        hsl = tinycolor({
          r: newValue.r || newValue[0],
          g: newValue.g || newValue[1],
          b: newValue.b || newValue[2]
        }).toHsl()
      }
      if (key == 'colorHSL') {
        lightState.on()
        lightState.hsl(
          newValue.h || newValue[0],
          newValue.s || newValue[1],
          newValue.l || newValue[2]
        )
      }
      if (key == 'dim') {
        lightState.on()
        lightState.brightness(newValue)
      }
      if (hsl) {
        if (values.dim) {
          lightState.hsb(hsl.h, hsl.s * 100, +values.dim)
        }
        else {
          lightState.hsl(hsl.h, hsl.s * 100, hsl.l * 100)
        }
      }
      if (device) {
        device.data[key] = newValue
      }
    })

    if (this.api) {
      if (lightState._values.on && device) {
        device.data.onoff = 'on'
      }
      if (device) {
        return this.api.setLightState(device.data.internalId, lightState).then(result => {
          return this.lisa.createOrUpdateDevices(device)
        })
      }
      else {
        return this.api.setGroupLightState(0, lightState).then(() => this.searchLights())
      }
    }
    else {
      return this._searchBridges().catch(err => {
        return Promise.reject(new Error('hue_error_not_found'))
      })
    }
  }

  init() {
    setInterval(() => {
      this.searchLights()
    }, 60000)
    return this._searchBridges()
  }
}


'use strict'

const Service = require('lisa-plugin').Service
const hue = require('node-hue-api')
const HueApi = hue.HueApi
const tinycolor = require('tinycolor2')

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

    const newDevice = {
      roomId: roomId,
      internalId: light.id,
      values: {'off': '/images/widgets/light_off.png', 'on': '/images/widgets/light_on.png'},
      value: light.state.on ? 'on' : 'off',
      bri: light.state.bri,
      color: color,
      name: light.name,
      type: light.type,
      template: `<lisa-vbox>
                  <lisa-hbox>
                    <lisa-color-picker (onChange)="onValueChange($event)"
                                       [value]="device.data.color" 
                                       name="color"
                                       path="HUEController.setLightState"
                                       [flex]="0.6"></lisa-color-picker>
                    <lisa-image-button (onChange)="onValueChange($event)"
                                       name="state"
                                       [value]="device.data.value" 
                                       [values]="device.data.values" 
                                       path="HUEController.setLightState"
                                       ></lisa-image-button>
                    <lisa-space [flex]="0.6"></lisa-space>
                  </lisa-hbox>
                  <lisa-slider (onChange)="onValueChange($event)"
                               [value]="device.data.bri" 
                               name="bri"
                               path="HUEController.setLightState"
                               [flex]="0.4"></lisa-slider>
                </lisa-vbox>`
    }
    if (existingLisaLight) {
      newDevice.id = existingLisaLight.id
      newDevice.name = existingLisaLight.name // don't overide name each time there an update
    }
    return newDevice
  }

  _manageLights(lights) {
    return this.lisa.findDevices().then(devices => {
      const newLights = []
      lights.forEach(light => {
        const lightExist = devices.find(device => device.internalId === light.id)
        const newDevice = this._prepareLightData(light, lightExist ? lightExist.roomId : null, lightExist)
        newLights.push(this.lisa.createOrUpdateDevices(newDevice))
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
          const groups = results[1].filter(item => item.type.toLowerCase() === 'room')
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

  setLightState(device, key, newValue) {
    const lightState = hue.lightState.create()
    if (key == 'state' && newValue == 'on') {
      lightState.on()
    }
    if (key == 'state' && newValue == 'off') {
      lightState.off()
    }
    if (key == 'color') {
      const hsl = tinycolor(newValue).toHsl()
      lightState.hsl(hsl.h, hsl.s * 100, hsl.l * 100)
    }
    if (key == 'colorRGB') {
      const hsl = tinycolor({
        r: newValue.r || newValue[0],
        g: newValue.g || newValue[1],
        b: newValue.b || newValue[2]
      }).toHsl()
      lightState.hsl(hsl.h, hsl.s * 100, hsl.l * 100)
    }
    if (key == 'colorHSL') {
      lightState.hsl(
        newValue.h || newValue[0],
        newValue.s || newValue[1],
        newValue.l || newValue[2]
      )
    }
    if (key == 'bri') {
      lightState.brightness(newValue)
    }

    if (this.api) {
      device[key] = newValue
      return this.api.setLightState(device.internalId, lightState).then(result => {
        return this.lisa.createOrUpdateDevices(device)
      })
    }
    else {
      return Promise.reject(new Error('hue_error_not_found'))
    }
  }


  init() {
    return this._searchBridges()
  }
}


'use strict'

const Service = require('lisa-plugin').Service
const hue = require('node-hue-api')
const HueApi = hue.HueApi
const fs = require('fs')

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

  _searchBridge() {
    return hue.nupnpSearch().then(bridges => {
      this.bridges = bridges
      if (!this.bridges || this.bridges.length === 0) {
        return Promise.reject(new Error('hue_error_not_found'))
      }
      else {
        return this.lisa.getPreferences().then(preferences => {
          const nextActionsPromise = []
          for (let i = 0; i < this.bridges.length; i++) {
            const bridge = this.bridges[i];
            const hostname = bridge.ipaddress

            if (preferences && preferences.bridges && preferences.bridges[bridge.id]) {
              this._config(hostname, preferences.bridges[bridge.id]).then(()=> {
                this.log.debug('ok')
              }).catch(err => {
                this.log.debug(err)
              })
            }
            else {
              const api = new HueApi()
              nextActionsPromise.push(api.createUser(hostname, null, null))
            }
          }
          return Promise.all(nextActionsPromise).then(results => {
            return this.lisa.setPreferences(results).then(preferences => {
              return this._config(hostname, preferences)
            })
          })
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
    return this._searchBridge()
  }


  init() {
    return this._searchBridge()
  }
}


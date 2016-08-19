'use strict'

const Plugin = require('lisa-plugin')
const hue = require("node-hue-api");
const HueApi = hue.HueApi;
const fs = require("fs");
const tinycolor = require("tinycolor2");

module.exports = class HuePlugin extends Plugin {
  _negotiateError(err, next) {
    if (err.name == "Api Error") {
      if (err.message == "link button not pressed") {
        //TODO
      }
      else if (err.message == "unauthorized user") {
        //TODO
      }
      this.log.debug("Need " + err.message)
      next()
    }
    else {
      if (next) {
        next(err)
      }
      else {
        this.log.debug("Need " + err.message)
      }
    }
  }

  _config(hostname, user, next) {
    this.api = new HueApi(hostname, user)
    if (this.api) {
      this.api.config((err, config) => {
        if (err) {
          this._negotiateError(err, next)
        }
        else {
          this.deviceSearch()
        }
      })
    }
    else {
      next(new Error("hue_error_not_found"))
    }
  }

  /**
   * Initialisation of your plugin
   * Called once, when plugin is loaded
   * @returns Promise
   */
  init() {
    return new Promise((resolve, reject) => {
      hue.nupnpSearch((err, result) => {
        if (err) {
          this._negotiateError(err, next)
        }
        else if (result.length == 0) {
          reject(new Error("hue_error_not_found"))
        }
        else {
          const hostname = result[0].ipaddress//First bridge

          if (fs.existsSync(__dirname + "/infos")) {
            const userInfos = fs.readFileSync(__dirname + "/infos", "utf8")
            this._config(hostname, userInfos)
          }
          else {
            const api = new HueApi()
            api.createUser(hostname, null, null, (err, user) => {
              if (err) {
                this._negotiateError(err, next);
              }
              else {
                fs.writeFile(__dirname + "/infos", user, err => {
                  if (err) {
                    reject(err)
                  }
                  else {
                    this._config(hostname, user)
                  }
                })
              }
            })
          }
        }
      })
    })
  }

  /**
   * Called automatically to search for new devices
   * @return Promise
   */
  searchDevices() {
    return Promise.resolve()
  }

  /**
   * Called when
   * @param action to execute
   * @param infos context of the action
   * @return Promise
   */
  interact(action, infos) {
    return Promise.resolve()
  }

  constructor(app) {
    super(app, {
      config: require('./config'),
      api: require('./api'),
      pkg: require('./package')
    })
  }
}

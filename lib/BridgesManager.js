'use strict'
const huejay = require('huejay')
const EventEmitter = require('events')
const Bridge = require('./Bridge')

module.exports = class BridgesManager extends EventEmitter {
  constructor(lisa) {
    super()

    this._lisa = lisa
    this.bridges = {}
  }

  search() {
    return huejay.discover()
      .then(bridges => {
        const actions = []
        bridges.forEach(bridge => {
          actions.push(this._initBridge(bridge))
        })
        return Promise.all(actions)
      })
      .catch(this.emitError.bind(this))
  }

  _initBridge(bridge) {
    bridge.id = bridge.id.toLowerCase()

    // skip if already found but update ip address if changed
    if (this.bridges[bridge.id]) {
      if (this.bridges[bridge.id].address !== bridge.ip) {
        this.bridges[bridge.id].setAddress(bridge.ip)
      }
      return
    }

    this.bridges[bridge.id] = new Bridge(this._lisa, bridge.id, bridge.ip)
    return this.bridges[bridge.id].init()
  }

  emitError(error) {
    this.emit('error', error)
  }
}

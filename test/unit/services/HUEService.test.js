'use strict'
/* global describe, it */

const assert = require('assert')
const HUEService = require('../../../api/services/HUEService')

describe('HUEService', () => {
  let service
  before(() => {
    service = global.app.packs.pluginsManager['hue'].services.HUEService
  })

  it('should exist', () => {
    assert(service)
  })

  it('should initialize correctly', done => {
    service.init().then(result => {
      assert(result)
    }).catch(done)
  })
})

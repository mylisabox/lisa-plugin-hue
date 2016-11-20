'use strict'
/* global describe, it */

const assert = require('assert')

describe('HUEController', () => {
  it('should exist', () => {
    assert(global.app.packs.pluginsManager.plugins['hue'].controllers['HUEController'])
  })
})

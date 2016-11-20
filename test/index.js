'use strict'

const TrailsApp = require('trails')
const lisa = require('lisa-box')
const smokesignals = require('smokesignals')
const _ = require('lodash')
const app = _.defaultsDeep(lisa, smokesignals.FailsafeConfig)

before(() => {
  lisa.config.main.packs.push(require('../'))
  lisa.config.database.models.migrate = 'drop'
  lisa.config.pluginManager = {
    dist: `${process.cwd()}/..`
  }
  global.app = new TrailsApp(app)
  return global.app.start().then(() => {
    return global.app.services.PluginService._addPlugin('lisa-plugin-hue') // eslint-disable-line no-underscore-dangle
  })
})

after(() => {
  return global.app.stop()
})

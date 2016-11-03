'use strict'
/* global describe, it */
const assert = require('assert')

describe.skip('ChatBo HUE', () => {
  let ChatBotService
  before(() => {
    ChatBotService = global.app.services.ChatBotService
  })

  const dataExample = require('../../../bots/hue.json')
  //TODO
  it('should return the correct command with chatbot id', done => {
    ChatBotService.interact(1, 'fr', 'augmente le son', 'tv').then(result => {
      assert(result)
      assert.equal(result.action, 'TV_SOUND_UP')
      done()
    }).catch(done)
  })

  it('should return the correct command without chatbot id', done => {
    ChatBotService.interact(1, 'fr', 'augmente le son').then(result => {
      assert(result)
      assert.equal(result.action, 'TV_SOUND_UP')
      done()
    }).catch(done)
  })

  it('should return the correct command with field', done => {
    ChatBotService.interact(1, 'fr', 'augmente le son de 5').then(result => {
      assert(result)
      assert.equal(result.action, 'TV_SOUND_UP')
      assert(result.fields)
      assert.equal(result.fields.number, '5')
      done()
    }).catch(done)
  })

  it('should return the correct command with field named', done => {
    ChatBotService.interact(1, 'fr', 'baisse le son de 5').then(result => {
      assert(result)
      assert.equal(result.action, 'TV_SOUND_DOWN')
      assert(result.fields)
      assert.equal(result.fields.volume, '5')
      done()
    }).catch(done)
  })

  it('should return the correct nested command', done => {
    ChatBotService.interact(1, 'fr', 'oui').then(result => {
      assert(result)
      assert.equal(result.action, 'TV_SOUND_DOWN_AGAIN')
      assert(result.fields)
      done()
    }).catch(done)
  })

  it('should return the unknow response on wrong command', done => {
    const sentence = 'coucou comment va ?'
    ChatBotService.interact(1, 'fr', sentence).then(result => {
      assert(result)
      assert.equal(result.action, 'UNKNOWN')
      assert.equal(result.lang, 'fr')
      assert.equal(result.userId, 1)
      assert.equal(result.userSentence, sentence)
      done()
    }).catch(done)
  })

  it('should return the correct command with hook executed', done => {
    ChatBotService.interact(1, 'en', 'set channel 3').then(result => {
      assert(result)
      assert.equal(result.action, 'TV_CHANNEL')
      assert.equal(result.lang, 'en')
      assert.equal(result.myAddition, 'ok')
      assert.equal(result.fields.chaine, 3)
      done()
    }).catch(done)
  })
})

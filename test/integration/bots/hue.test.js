'use strict'
/* global describe, it */

const assert = require('assert')

describe('HUE bot', () => {
  let service, ChatBot
  before(() => {
    service = global.app.services.ChatBotService
    ChatBot = global.app.orm.ChatBot
  })

  it('should exist', () => {
    return ChatBot.find({
      where: {
        name: 'hue'
      }
    }).then(chatbot => {
      assert(chatbot)
      assert.equal(chatbot.name, 'hue')
      assert.equal(chatbot.displayName, 'Philips HUE lights')
      assert(chatbot.data)
    })
  })

  it.skip('should return correct answer', () => {
    return service.interact(1, 'fr', 'lumière').then(infos => {
      assert(infos)
      assert.equal(infos.action, 'HUE_TURN_ON')
      assert.equal(infos.botId, 'hue')
      assert.equal(infos.lang, 'fr')
      assert.equal(infos.userSentence, 'lumière')
    })
  })

  it('should return correct answer with params', () => {
    return service.interact(1, 'fr', 'allume le salon').then(infos => {
      assert(infos)
      assert.equal(infos.action, 'HUE_TURN_ON')
      assert.equal(infos.botId, 'hue')
      assert.equal(infos.lang, 'fr')
      assert.equal(infos.fields.room, 'salon')
      assert.equal(infos.userSentence, 'allume le salon')
    })
  })
})

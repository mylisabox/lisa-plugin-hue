import {Plugin} from 'lisa-plugin';
import {createRequire} from 'module';
import config from './config/index.js';
import drivers from './drivers/index.js';
import BridgesManager from './lib/BridgesManager.js';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

export default class HuePlugin extends Plugin {
  /**
   * Initialisation of your plugin
   * Called once, when plugin is loaded
   * @return Promise
   */
  init() {
    this.log.info('HuePlugin');
    if (!this.bridgesManager) {
      this.bridgesManager = new BridgesManager(this.lisa);
    }
    return super.init().then(() => this.bridgesManager.search())
      .catch((err) => {
        this.log.error(err.toString());
      });
  }

  /**
   * Called when
   * @param action to execute
   * @param infos context of the action
   * @return Promise
   */
  interact(action, infos) {
    let room = infos.fields.room || infos.context.room;
    const device = infos.fields.device;
    if (device && device.pluginName !== this.fullName) {
      return Promise.resolve();
    }
    const options = {};
    switch (action) {
      case 'LIGHT_ALL_TURN_ON':
        options['powered'] = true;
        room = null;
        break;
      case 'LIGHT_ALL_TURN_OFF':
        options['powered'] = false;
        room = null;
        break;
      case 'LIGHT_TURN_ON':
      case 'DEVICE_TURN_ON':
        options['powered'] = true;
        if (infos.fields.number) {
          options['intensity'] = infos.fields.number;
        }
        if (infos.fields.color) {
          options['color'] = infos.fields.color.value;
        }
        break;
      case 'LIGHT_TURN_OFF':
      case 'DEVICE_TURN_OFF':
        options['powered'] = false;
        break;
      case 'LIGHT_BRIGHTNESS':
        options['intensity'] = infos.fields.number;
        break;
      default:
        return Promise.resolve();
    }

    const criteria = {};
    if (room) {
      criteria.roomId = room.id;

      return this.lisa.findDevices(criteria).then((devices) => {
        return this.drivers['light'].setDevicesValues(devices, options);
      });
    } else if (device) {
      return this.drivers['light'].setDevicesValues([device], options);
    } else {
      return this.drivers['light'].setDevicesValues(null, options);
    }
  }

  constructor(app) {
    super(app, {
      drivers: drivers,
      config: config,
      pkg: pkg,
    });
    this.bridgesManager = null;
  }
}

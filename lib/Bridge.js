import EventEmitter from 'events';
import huejay from 'huejay';
import {Light} from 'lisa-plugin';
import {assign, isEqual} from 'lodash-es';
import tinycolor from 'tinycolor2';

const POOL_INTERVAL = 60000 * 5;
const UNAUTHORIZED_USER = 1;

export default class Bridge extends EventEmitter {
  constructor(lisa, id, address) {
    super();

    this._lisa = lisa;
    this.id = id;
    this.address = address;
    this._lights = [];
    this._sensors = [];

    this.client = new huejay.Client({
      host: this.address,
    });
  }

  get lights() {
    return this._lights;
  }

  get sensors() {
    return this._sensors;
  }

  getLightById(id) {
    for (const light of this._lights) {
      if (light.id === id || light.uniqueId === id) {
        return light;
      }
    }
  }

  getRootGroup() {
    return this.client.groups.getById(0);
  }

  saveLight(light) {
    return this.client.lights.save(light);
  }

  saveGroup(group) {
    return this.client.groups.save(group);
  }

  init() {
    return this._lisa.getPreferences().then((preferences) => {
      this._lisa.log.debug('preferences:', preferences);

      if (!preferences.bridges) {
        preferences.bridges = {};
      }
      this._token = preferences.bridges[this.id];
      this.client = new huejay.Client({
        host: this.address,
        username: this._token,
      });

      // set refresh interval
      if (this._refreshInterval) {
        clearInterval(this._refreshInterval);
        this._refreshInterval = null;
      }

      this._refreshInterval = setInterval(this.getDevices.bind(this), POOL_INTERVAL);
    }).then(() => {
      if (this._token) {
        return this.getDevices();
      }
    });
  }

  setAddress(ip) {
    this.address = ip;

    if (this.client) {
      this.client.host = ip;
    }
  }

  isAuthenticated() {
    return this._token;
  }

  register() {
    if (this._token) {
      return this._testAuthentication();
    } else {
      const user = new this.client.users.User;
      user.deviceType = 'lisa';

      return this.client.users.create(user)
          .then((user) => {
            this._token = user.username;
            return this._lisa.getPreferences().then((preferences) => {
              if (!preferences.bridges) {
                preferences.bridges = {};
              }
              preferences.bridges[this.id] = this._token;
              return this._lisa.setPreferences(preferences);
            }).then(() => this.init());
          })
          .catch(this.emitError.bind(this));
    }
  }

  _testAuthentication() {
    return this.client.bridge.isAuthenticated()
        .catch((err) => {
          this._token = undefined;
          this.emitError(err);
          this._lisa.getPreferences().then((preferences) => {
            if (!preferences.bridges) {
              preferences.bridges = {};
            }
            preferences.bridges[this.id] = undefined;
            return this._lisa.setPreferences(preferences);
          });
          return Promise.reject(err);
        });
  }

  _manageLights(lights) {
    return this._lisa.findDevices().then((devices) => {
      const newLights = [];
      lights.forEach((light) => {
        const lightExist = devices.find((device) => device.privateData.uniqueId === light.uniqueId);
        if (lightExist) {
          delete lightExist.createdAt;
          delete lightExist.updatedAt;
          delete lightExist.pluginName;
          const newDevice = this.prepareLightData(light, lightExist ? lightExist.roomId : null, lightExist);
          if (!isEqual(newDevice, lightExist)) {
            newLights.push(newDevice);
          }
        }
      });
      return newLights.length > 0 ? this._lisa.createOrUpdateDevices(newLights) : Promise.resolve();
    });
  }

  prepareLightData(light, roomId, existingLisaLight) {
    const hue = Math.round(light.hue / 182.5487);
    const sat = Math.round(light.saturation * 100 / 255);
    const bri = Math.round(light.brightness * 100 / 255);
    const color = tinycolor('hsv(' + (hue) + ', ' + sat + '%, ' + bri + '%)').toHexString();

    const privateData = {
      uniqueId: light.uniqueId,
      model: light.model.id,
      type: light.type,
      bridgeId: this.id,
    };

    const data = new Light();
    data.powered = light.on;
    data.dimmable = true;
    data.intensity = bri;
    data.color = null;

    if (light.type.toLowerCase().indexOf('color') !== -1) {
      data.colorable = true;
      data.color = color;
    }

    const newDevice = {
      roomId: roomId,
      data: data,
      powered: light.on,
      privateData: privateData,
      type: this._lisa.DEVICE_TYPE.LIGHT,
      driver: 'light',
      name: light.name,
    };
    if (existingLisaLight) {
      newDevice.id = existingLisaLight.id;
      newDevice.roomId = existingLisaLight.roomId;
      newDevice.name = existingLisaLight.name; // don't overide name each time there an update
    } else {
      existingLisaLight = {};
    }
    return assign({}, existingLisaLight, newDevice);
  }

  getDevices(type) {
    const lights = this.client.lights.getAll()
        .then((lights) => {
          this._lights = lights;
          return this._manageLights(lights).then(() => Promise.resolve(lights));
        }).catch((err) => {
        return this._lights;
      });

    const sensors = this.client.sensors.getAll()
        .then((sensors) => {
          this._sensors = sensors;
          return Promise.resolve(sensors);
        }).catch((err) => this._sensors);

    return Promise.all([lights, sensors])
        .catch(this.emitError.bind(this));
  }

  emitError(error) {
    if (error.type === UNAUTHORIZED_USER) {
      if (this._refreshInterval) clearInterval(this._refreshInterval);
    }
    this.emit('error', error);
  }
}

import ConfigStore from '../utils/config-store.js';

const config = new ConfigStore('jira-pilot');

export class ConfigService {
    static getConfig() {
        return config.all;
    }

    static saveConfig(newConfig: any) {
        config.all = newConfig;
    }

    static get(key: string) {
        return config.get(key);
    }

    static set(key: string, value: any) {
        config.set(key, value);
    }
}

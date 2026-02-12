import ConfigStore from '../utils/config-store.js';
const config = new ConfigStore('jira-pilot');
export class ConfigService {
    static getConfig() {
        return config.all;
    }
    static saveConfig(newConfig) {
        config.all = newConfig;
    }
    static get(key) {
        return config.get(key);
    }
    static set(key, value) {
        config.set(key, value);
    }
}
//# sourceMappingURL=config-service.js.map
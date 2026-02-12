import fs from 'fs';
import path from 'path';
import os from 'os';

function getAppDataPath() {
    if (process.platform === 'win32') {
        return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    }
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Preferences');
    }
    return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

class ConfigStore {
    private dir: string;
    private path: string;

    constructor(projectName: string) {
        this.dir = path.join(getAppDataPath(), projectName);
        this.path = path.join(this.dir, 'config.json');
        this.ensureDir();
    }

    ensureDir() {
        if (!fs.existsSync(this.dir)) {
            fs.mkdirSync(this.dir, { recursive: true });
        }
    }

    load() {
        try {
            if (!fs.existsSync(this.path)) return {};
            return JSON.parse(fs.readFileSync(this.path, 'utf8'));
        } catch (e) {
            return {};
        }
    }

    save(data: any) {
        this.ensureDir();
        fs.writeFileSync(this.path, JSON.stringify(data, null, 4), 'utf8');
    }

    get(key?: string): any {
        const data = this.load();
        if (!key) return data;

        // Support dot notation: profiles.work
        const parts = key.split('.');
        let current = data;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    }

    set(key: string, value: any): void {
        const data = this.load();

        const parts = key.split('.');
        const last = parts.pop();
        if (!last) return;

        let current = data;
        for (const part of parts) {
            if (typeof current[part] !== 'object' || current[part] === null) {
                current[part] = {};
            }
            current = current[part];
        }

        current[last] = value;
        this.save(data);
    }

    delete(key: string): void {
        const data = this.load();
        const parts = key.split('.');
        const last = parts.pop();
        if (!last) return; // Should not happen

        let current = data;
        for (const part of parts) {
            if (current === undefined || current === null) return; // Key doesn't exist
            current = current[part];
        }

        if (current && typeof current === 'object') {
            delete current[last];
            this.save(data);
        }
    }

    clear() {
        this.save({});
    }

    get all() {
        return this.load();
    }

    set all(data: any) {
        this.save(data);
    }
}

export default ConfigStore;

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/config-store.js', () => {
    let store = {};
    return {
        default: class MockConfigStore {
            constructor() { }
            get(key) {
                if (!key) return store;
                const parts = key.split('.');
                let current = store;
                for (const part of parts) {
                    if (current === undefined || current === null) return undefined;
                    current = current[part];
                }
                return current;
            }
            set(key, value) {
                const parts = key.split('.');
                const last = parts.pop();
                let current = store;
                for (const part of parts) {
                    if (!current[part]) current[part] = {};
                    current = current[part];
                }
                current[last] = value;
            }
            delete(key) {
                const parts = key.split('.');
                const last = parts.pop();
                let current = store;
                for (const part of parts) {
                    if (current === undefined || current === null) return;
                    current = current[part];
                }
                if (current) delete current[last];
            }
            clear() { store = {}; }
        }
    };
});

describe('config', () => {
    let config;

    beforeEach(async () => {
        vi.resetModules();
        config = await import('../../src/utils/config.js');
        // Ensure clean state
        config.clearCredentials();
    });

    it('should export getCredentials function', () => {
        expect(typeof config.getCredentials).toBe('function');
    });

    it('should export setCredentials function', () => {
        expect(typeof config.setCredentials).toBe('function');
    });

    it('should export clearCredentials function', () => {
        expect(typeof config.clearCredentials).toBe('function');
    });

    it('should export hasCredentials function', () => {
        expect(typeof config.hasCredentials).toBe('function');
    });

    it('should return credentials object from getCredentials', () => {
        const creds = config.getCredentials();
        expect(creds).toBeDefined();
        expect(typeof creds).toBe('object');
    });

    it('should manage profiles', () => {
        // Mock config state
        const { saveProfile, loadProfile, listProfiles, deleteProfile, getActiveProfile, setCredentials } = config;

        // Setup initial creds
        setCredentials({ jiraUrl: 'https://profile1.atlassian.net', email: 'p1@test.com', apiToken: 't1' });
        saveProfile('profile1');

        expect(getActiveProfile()).toBe('profile1');
        expect(listProfiles()).toContain('profile1');

        // Setup second profile
        setCredentials({ jiraUrl: 'https://profile2.atlassian.net', email: 'p2@test.com', apiToken: 't2' });
        saveProfile('profile2');

        expect(getActiveProfile()).toBe('profile2');
        expect(listProfiles()).toContain('profile1');
        expect(listProfiles()).toContain('profile2');

        // Switch back
        loadProfile('profile1');
        expect(getActiveProfile()).toBe('profile1');

        // Delete
        deleteProfile('profile1');
        expect(listProfiles()).not.toContain('profile1');
        // In our implementation, deleting the active profile clears it
        // Check implementation: 
        // if (config.get('activeProfile') === name) { config.delete('activeProfile'); }
        // We switched to profile1, so it is active. We deleted it. So active should be gone.
        expect(getActiveProfile()).toBeFalsy();
    });
});

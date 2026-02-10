import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('conf', () => {
    let store = {};
    return {
        default: class MockConf {
            constructor() { }
            get(key) {
                if (key === 'profiles') {
                    const profiles = {};
                    let found = false;
                    Object.keys(store).forEach(k => {
                        if (k.startsWith('profiles.')) {
                            const profileName = k.split('.')[1];
                            profiles[profileName] = store[k];
                            found = true;
                        }
                    });
                    return found ? profiles : undefined;
                }
                return store[key];
            }
            set(key, value) { store[key] = value; }
            delete(key) { delete store[key]; }
            has(key) { return key in store; }
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

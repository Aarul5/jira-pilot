import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('conf', () => {
    const store = {};
    return {
        default: class MockConf {
            constructor() { }
            get(key) { return store[key]; }
            set(key, value) { store[key] = value; }
            delete(key) { delete store[key]; }
            has(key) { return key in store; }
            clear() { Object.keys(store).forEach(k => delete store[k]); }
        }
    };
});

describe('config', () => {
    let config;

    beforeEach(async () => {
        vi.resetModules();
        config = await import('../../src/utils/config.js');
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
});

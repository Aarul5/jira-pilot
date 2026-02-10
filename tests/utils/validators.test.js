import { describe, it, expect } from 'vitest';
import { validateIssueKey, validateProjectKey, validateUrl, sanitizeJql } from '../../src/utils/validators.js';

describe('validateIssueKey', () => {
    it('should accept valid issue keys', () => {
        expect(validateIssueKey('PROJ-123')).toEqual({ valid: true });
        expect(validateIssueKey('AB-1')).toEqual({ valid: true });
        expect(validateIssueKey('MY_PROJECT-456')).toEqual({ valid: true });
        expect(validateIssueKey('A2B-99')).toEqual({ valid: true });
    });

    it('should reject invalid issue keys', () => {
        expect(validateIssueKey('')).toHaveProperty('valid', false);
        expect(validateIssueKey(null)).toHaveProperty('valid', false);
        expect(validateIssueKey(undefined)).toHaveProperty('valid', false);
        expect(validateIssueKey('123')).toHaveProperty('valid', false);
        expect(validateIssueKey('PROJ')).toHaveProperty('valid', false);
        expect(validateIssueKey('PROJ-')).toHaveProperty('valid', false);
        expect(validateIssueKey('-123')).toHaveProperty('valid', false);
        expect(validateIssueKey('proj-123')).toHaveProperty('valid', true); // auto-uppercased
    });

    it('should include helpful error message', () => {
        const result = validateIssueKey('bad');
        expect(result.message).toContain('Invalid issue key');
        expect(result.message).toContain('PROJ-123');
    });
});

describe('validateProjectKey', () => {
    it('should accept valid project keys', () => {
        expect(validateProjectKey('PROJ')).toEqual({ valid: true });
        expect(validateProjectKey('AB')).toEqual({ valid: true });
        expect(validateProjectKey('MY_PROJECT')).toEqual({ valid: true });
    });

    it('should reject invalid project keys', () => {
        expect(validateProjectKey('')).toHaveProperty('valid', false);
        expect(validateProjectKey(null)).toHaveProperty('valid', false);
        expect(validateProjectKey('A')).toHaveProperty('valid', false); // too short
        expect(validateProjectKey('123')).toHaveProperty('valid', false);
        expect(validateProjectKey('PROJ-123')).toHaveProperty('valid', false); // has dash
    });
});

describe('validateUrl', () => {
    it('should accept valid URLs', () => {
        expect(validateUrl('https://company.atlassian.net')).toEqual({ valid: true });
        expect(validateUrl('http://localhost:8080')).toEqual({ valid: true });
        expect(validateUrl('https://jira.example.com/rest')).toEqual({ valid: true });
    });

    it('should reject invalid URLs', () => {
        expect(validateUrl('')).toHaveProperty('valid', false);
        expect(validateUrl(null)).toHaveProperty('valid', false);
        expect(validateUrl('not a url')).toHaveProperty('valid', false);
        expect(validateUrl('ftp://wrong.protocol')).toHaveProperty('valid', false);
    });
});

describe('sanitizeJql', () => {
    it('should pass through valid JQL unchanged', () => {
        expect(sanitizeJql('project = PROJ')).toBe('project = PROJ');
        expect(sanitizeJql('status IN ("To Do", "In Progress")')).toBe('status IN ("To Do", "In Progress")');
    });

    it('should handle empty/null input', () => {
        expect(sanitizeJql('')).toBe('');
        expect(sanitizeJql(null)).toBe('');
        expect(sanitizeJql(undefined)).toBe('');
    });

    it('should strip control characters', () => {
        expect(sanitizeJql('project = PROJ\x00')).toBe('project = PROJ');
        expect(sanitizeJql('\x01\x02test')).toBe('test');
    });

    it('should trim whitespace', () => {
        expect(sanitizeJql('  project = PROJ  ')).toBe('project = PROJ');
    });
});

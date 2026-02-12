
import { describe, it, expect } from 'vitest';
import { validateIssueKey, validateProjectKey, validateUrl, sanitizeJql } from '../../src/utils/validators.js';

describe('Validators', () => {
    describe('validateIssueKey', () => {
        it('should validate correct keys', () => {
            expect(validateIssueKey('PROJ-123').valid).toBe(true);
            expect(validateIssueKey('ABC-1').valid).toBe(true);
        });

        it('should reject incorrect formats', () => {
            expect(validateIssueKey('PROJ').valid).toBe(false);
            expect(validateIssueKey('123-PROJ').valid).toBe(false);
            expect(validateIssueKey('PROJ-').valid).toBe(false);
            expect(validateIssueKey('').valid).toBe(false);
        });
    });

    describe('validateProjectKey', () => {
        it('should validate correct keys', () => {
            expect(validateProjectKey('PROJ').valid).toBe(true);
            expect(validateProjectKey('A_B').valid).toBe(true);
        });

        it('should reject incorrect formats', () => {
            expect(validateProjectKey('123').valid).toBe(false);
            expect(validateProjectKey('p-r').valid).toBe(false);
            expect(validateProjectKey('').valid).toBe(false);
        });
    });

    describe('validateUrl', () => {
        it('should validate http/https urls', () => {
            expect(validateUrl('https://example.com').valid).toBe(true);
            expect(validateUrl('http://localhost:8080').valid).toBe(true);
        });

        it('should reject invalid urls', () => {
            expect(validateUrl('ftp://example.com').valid).toBe(false);
            expect(validateUrl('not-a-url').valid).toBe(false);
        });
    });

    describe('sanitizeJql', () => {
        it('should trim and remove control chars', () => {
            expect(sanitizeJql(' project = PROJ ')).toBe('project = PROJ');
            expect(sanitizeJql('summary ~ "foo\nbar"')).toBe('summary ~ "foo\nbar"'); // Newline is allowed in JQL usually but sanitized? Validator says \x00-\x08...
            // Checking the code: \x0e-\x1f -> includes typical control chars but not \n (\x0a) or \r (\x0d)?
            // actually \x00-\x08\x0B\x0C\x0E-\x1F covers most controls except \t \n \r.
            expect(sanitizeJql('text\x00')).toBe('text');
        });
    });
});

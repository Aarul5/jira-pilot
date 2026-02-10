import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCommandError } from '../../src/utils/error-handler.js';

// Mock chalk to return plain strings
vi.mock('chalk', () => ({
    default: {
        red: (s) => s,
        yellow: (s) => s,
        grey: (s) => s
    }
}));

describe('handleCommandError', () => {
    let consoleSpy;

    beforeEach(() => {
        consoleSpy = {
            log: vi.spyOn(console, 'log').mockImplementation(() => { }),
            error: vi.spyOn(console, 'error').mockImplementation(() => { })
        };
    });

    it('should handle user cancellation (empty string error)', () => {
        const spinner = { stop: vi.fn(), fail: vi.fn() };
        handleCommandError(spinner, '', 'Test');

        expect(spinner.stop).toHaveBeenCalled();
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Cancelled'));
    });

    it('should handle user cancellation (empty message error)', () => {
        const spinner = { stop: vi.fn(), fail: vi.fn() };
        handleCommandError(spinner, new Error(''), 'Test');

        expect(spinner.stop).toHaveBeenCalled();
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Cancelled'));
    });

    it('should handle 404 errors', () => {
        const spinner = { stop: vi.fn(), fail: vi.fn() };
        const error = { message: 'Not Found', response: { status: 404, data: {} } };

        handleCommandError(spinner, error, 'Test failed');

        expect(spinner.fail).toHaveBeenCalledWith('Test failed');
        expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    it('should handle 400 errors with error messages', () => {
        const spinner = { stop: vi.fn(), fail: vi.fn() };
        const error = {
            message: 'Bad Request',
            response: {
                status: 400,
                data: { errorMessages: ['Field X is required'] }
            }
        };

        handleCommandError(spinner, error, 'Test failed');

        expect(spinner.fail).toHaveBeenCalledWith('Test failed');
        expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Field X is required'));
    });

    it('should handle generic errors without spinner', () => {
        const error = new Error('Something went wrong');

        handleCommandError(null, error, 'Operation failed');

        expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });

    it('should handle errors with response but unknown status', () => {
        const spinner = { stop: vi.fn(), fail: vi.fn() };
        const error = {
            message: 'Server Error',
            response: { status: 500, data: { message: 'Internal error' } }
        };

        handleCommandError(spinner, error, 'Test failed');

        expect(spinner.fail).toHaveBeenCalledWith('Test failed');
    });
});

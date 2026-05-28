import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, logError, logWarn, logInfo, logDebug } from '../logger';

describe('Logger Service', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log.error', () => {
    it('should log error messages', () => {
      log.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log error with metadata', () => {
      const meta = { userId: '123', action: 'test' };
      log.error('Test error', meta);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('log.warn', () => {
    it('should log warning messages', () => {
      log.warn('Test warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log warning with metadata', () => {
      const meta = { component: 'TestComponent' };
      log.warn('Test warning', meta);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('log.info', () => {
    it('should log info messages in development', () => {
      log.info('Test info message');
      // Info logs are environment-dependent
      // In test environment, they should be called
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('log.debug', () => {
    it('should log debug messages in development', () => {
      log.debug('Test debug message');
      // Debug logs are environment-dependent
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Legacy API', () => {
    it('logError should work for backward compatibility', () => {
      logError('Legacy error', new Error('test'), 'TestContext');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('logWarn should work for backward compatibility', () => {
      logWarn('Legacy warning', { data: 'test' }, 'TestContext');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('logInfo should work for backward compatibility', () => {
      logInfo('Legacy info', { data: 'test' }, 'TestContext');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('logDebug should work for backward compatibility', () => {
      logDebug('Legacy debug', { data: 'test' }, 'TestContext');
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});

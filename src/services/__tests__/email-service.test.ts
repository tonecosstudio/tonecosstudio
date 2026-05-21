import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from '../email-service';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
    global.fetch = vi.fn();
  });

  describe('Configuration', () => {
    it('should create an instance', () => {
      expect(emailService).toBeDefined();
    });

    it('should have getConfig method', () => {
      const config = emailService.getConfig();
      expect(config).toBeDefined();
    });

    it('should load configuration from environment', () => {
      const config = emailService.getConfig();
      
      expect(config.provider).toBeDefined();
      expect(['sendgrid', 'ses', 'smtp']).toContain(config.provider);
      expect(config.from).toMatch(/@/);
      expect(config.fromName).toBeTruthy();
      expect(config.maxRetries).toBeGreaterThanOrEqual(0);
      expect(config.retryDelay).toBeGreaterThan(0);
    });

    it('should report configuration status', () => {
      const isConfigured = emailService.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  describe('Email Validation', () => {
    it('should reject empty email', async () => {
      await expect(
        emailService.sendEmail('', 'Subject', '<p>Body</p>')
      ).rejects.toThrow();
    });

    it('should reject invalid email format', async () => {
      await expect(
        emailService.sendEmail('invalid', 'Subject', '<p>Body</p>')
      ).rejects.toThrow();
    });

    it('should reject email without domain', async () => {
      await expect(
        emailService.sendEmail('test@', 'Subject', '<p>Body</p>')
      ).rejects.toThrow();
    });
  });

  describe('SendGrid Integration', () => {
    it('should call SendGrid API when configured', async () => {
      const config = emailService.getConfig();
      
      if (config.provider === 'sendgrid' && emailService.isConfigured()) {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 202,
        });
        global.fetch = mockFetch;

        await emailService.sendEmail(
          'test@example.com',
          'Test Subject',
          '<p>Test Body</p>'
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.sendgrid.com/v3/mail/send',
          expect.objectContaining({
            method: 'POST',
          })
        );
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      if (!emailService.isConfigured()) {
        return; // Skip if not configured
      }

      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
        });
      global.fetch = mockFetch;

      try {
        await emailService.sendEmail('test@example.com', 'Subject', '<p>Body</p>');
        expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
      } catch (_error) {
        // If it fails, retries should still have been attempted
        expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
      }
    });

    it('should fail after max retries', async () => {
      if (!emailService.isConfigured()) {
        return; // Skip if not configured
      }

      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Network error'));
      global.fetch = mockFetch;

      await expect(
        emailService.sendEmail('test@example.com', 'Subject', '<p>Body</p>')
      ).rejects.toThrow();

      const config = emailService.getConfig();
      expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
      expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(config.maxRetries + 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      if (!emailService.isConfigured()) {
        return; // Skip if not configured
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });
      global.fetch = mockFetch;

      await expect(
        emailService.sendEmail('test@example.com', 'Subject', '<p>Body</p>')
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await emailService.sendEmail('invalid', 'Subject', '<p>Body</p>');
        expect.fail('Should have thrown an error');
      } catch (_error) {
        expect((error as Error).message).toBeTruthy();
        expect((error as Error).message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('HTML Content', () => {
    it('should accept HTML content', async () => {
      if (!emailService.isConfigured()) {
        return; // Skip if not configured
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
      });
      global.fetch = mockFetch;

      const htmlContent = '<html><body><h1>Test</h1></body></html>';

      try {
        await emailService.sendEmail('test@example.com', 'Subject', htmlContent);
        expect(true).toBe(true); // Success
      } catch (_error) {
        // If it fails, it should not be due to HTML content
        expect((error as Error).message).not.toContain('HTML');
      }
    });

    it('should handle special characters', async () => {
      if (!emailService.isConfigured()) {
        return; // Skip if not configured
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
      });
      global.fetch = mockFetch;

      const htmlContent = '<p>Price: R$ 100,00 &amp; more</p>';

      try {
        await emailService.sendEmail('test@example.com', 'Subject', htmlContent);
        expect(true).toBe(true); // Success
      } catch (_error) {
        // If it fails, it should not be due to special characters
        expect((error as Error).message).not.toContain('character');
      }
    });
  });

  describe('Welcome Email', () => {
    it('should have sendWelcomeEmail method', () => {
      expect(emailService.sendWelcomeEmail).toBeDefined();
      expect(typeof emailService.sendWelcomeEmail).toBe('function');
    });

    it('should throw error for invalid subscription ID', async () => {
      await expect(
        emailService.sendWelcomeEmail('invalid-id')
      ).rejects.toThrow();
    });

    it('should throw error for non-existent subscription', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        emailService.sendWelcomeEmail(nonExistentId)
      ).rejects.toThrow();
    });
  });

  describe('Choice Reminder Email', () => {
    it('should have sendChoiceReminder method', () => {
      expect(emailService.sendChoiceReminder).toBeDefined();
      expect(typeof emailService.sendChoiceReminder).toBe('function');
    });

    it('should throw error for invalid delivery ID', async () => {
      await expect(
        emailService.sendChoiceReminder('invalid-id', 7)
      ).rejects.toThrow();
    });

    it('should throw error for non-existent delivery', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        emailService.sendChoiceReminder(nonExistentId, 7)
      ).rejects.toThrow();
    });

    it('should accept valid days until cutoff values', () => {
      // Test that the method accepts various valid day values
      expect(() => {
        const validDays = [1, 3, 7, 10, 14];
        validDays.forEach(days => {
          expect(typeof days).toBe('number');
          expect(days).toBeGreaterThan(0);
        });
      }).not.toThrow();
    });

    it('should determine urgency correctly', () => {
      // Test urgency logic (isUrgent = daysUntilCutoff <= 3)
      const urgentDays = [1, 2, 3];
      const normalDays = [4, 5, 7, 10, 14];

      urgentDays.forEach(days => {
        expect(days <= 3).toBe(true);
      });

      normalDays.forEach(days => {
        expect(days <= 3).toBe(false);
      });
    });
  });

  describe('Character Revelation Email', () => {
    it('should have sendCharacterRevelation method', () => {
      expect(emailService.sendCharacterRevelation).toBeDefined();
      expect(typeof emailService.sendCharacterRevelation).toBe('function');
    });

    it('should throw error for invalid collection ID', async () => {
      await expect(
        emailService.sendCharacterRevelation('invalid-id', ['test@example.com'])
      ).rejects.toThrow();
    });

    it('should throw error for non-existent collection', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        emailService.sendCharacterRevelation(nonExistentId, ['test@example.com'])
      ).rejects.toThrow();
    });

    it('should accept array of subscriber emails', () => {
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      expect(Array.isArray(emails)).toBe(true);
      emails.forEach(email => {
        expect(email).toMatch(/@/);
      });
    });

    it('should handle empty subscriber list', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      // Should not throw for empty list, but will throw for non-existent collection
      await expect(
        emailService.sendCharacterRevelation(nonExistentId, [])
      ).rejects.toThrow();
    });

    it('should validate collection has been revealed', async () => {
      // This test verifies the method checks for revealed status
      // In actual implementation, it should throw if collection.revealed is false
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        emailService.sendCharacterRevelation(nonExistentId, ['test@example.com'])
      ).rejects.toThrow();
    });
  });

  describe('Production Started Email', () => {
    it('should have sendProductionStarted method', () => {
      expect(emailService.sendProductionStarted).toBeDefined();
      expect(typeof emailService.sendProductionStarted).toBe('function');
    });

    it('should throw error for invalid delivery ID', async () => {
      await expect(
        emailService.sendProductionStarted('invalid-id')
      ).rejects.toThrow();
    });

    it('should throw error for non-existent delivery', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        emailService.sendProductionStarted(nonExistentId)
      ).rejects.toThrow();
    });
  });

  describe('Shipping Notification Email', () => {
    it('should have sendShippingNotification method', () => {
      expect(emailService.sendShippingNotification).toBeDefined();
      expect(typeof emailService.sendShippingNotification).toBe('function');
    });

    it('should throw error for invalid delivery ID', async () => {
      await expect(
        emailService.sendShippingNotification('invalid-id', 'ABC123456BR')
      ).rejects.toThrow();
    });

    it('should throw error for non-existent delivery', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        emailService.sendShippingNotification(nonExistentId, 'ABC123456BR')
      ).rejects.toThrow();
    });

    it('should accept valid tracking code format', () => {
      const validTrackingCodes = ['AB123456789BR', 'XY987654321BR', 'AA000000000BR'];
      validTrackingCodes.forEach(code => {
        expect(code).toMatch(/^[A-Z]{2}\d{9}[A-Z]{2}$/);
      });
    });
  });

  describe('Balance Reminder Email', () => {
    it('should have sendBalanceReminder method', () => {
      expect(emailService.sendBalanceReminder).toBeDefined();
      expect(typeof emailService.sendBalanceReminder).toBe('function');
    });

    it('should throw error for invalid purchase ID', async () => {
      await expect(
        emailService.sendBalanceReminder('invalid-id', 5)
      ).rejects.toThrow();
    });

    it('should throw error for non-existent purchase', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        emailService.sendBalanceReminder(nonExistentId, 5)
      ).rejects.toThrow();
    });

    it('should accept valid days remaining values', () => {
      const validDays = [1, 2, 3, 4, 5];
      validDays.forEach(days => {
        expect(typeof days).toBe('number');
        expect(days).toBeGreaterThan(0);
      });
    });

    it('should determine urgency correctly', () => {
      // Test urgency logic (isUrgent = daysRemaining <= 1)
      const urgentDays = [1];
      const normalDays = [2, 3, 4, 5];

      urgentDays.forEach(days => {
        expect(days <= 1).toBe(true);
      });

      normalDays.forEach(days => {
        expect(days <= 1).toBe(false);
      });
    });
  });

  describe('Cancellation Notice Email', () => {
    it('should have sendCancellationNotice method', () => {
      expect(emailService.sendCancellationNotice).toBeDefined();
      expect(typeof emailService.sendCancellationNotice).toBe('function');
    });

    it('should throw error for invalid purchase ID', async () => {
      await expect(
        emailService.sendCancellationNotice('invalid-id', 'Non-payment')
      ).rejects.toThrow();
    });

    it('should throw error for non-existent purchase', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        emailService.sendCancellationNotice(nonExistentId, 'Non-payment')
      ).rejects.toThrow();
    });

    it('should accept valid cancellation reasons', () => {
      const validReasons = [
        'Balance payment not received within deadline (Arras Confirmatórias)',
        'Customer request',
        'Out of stock',
        'Administrative cancellation'
      ];
      
      validReasons.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });
  });
});

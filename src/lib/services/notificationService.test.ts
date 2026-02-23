/**
 * Unit tests for NotificationService
 * 
 * Tests email template generation and notification functionality
 * Requirements: 16.3, 16.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService, EmailService, EmailRecipient, EmailTemplate } from './notificationService';

// Mock email service
class MockEmailService implements EmailService {
  public sentEmails: Array<{
    to: EmailRecipient[];
    template: EmailTemplate;
    data?: Record<string, any>;
  }> = [];

  async sendEmail(
    to: EmailRecipient[],
    template: EmailTemplate,
    data?: Record<string, any>
  ): Promise<void> {
    this.sentEmails.push({ to, template, data });
  }

  reset() {
    this.sentEmails = [];
  }
}

// Mock Supabase
const mockSupabaseData = {
  profiles: {
    'user-123': {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
    },
  },
  conversations: {
    'conv-456': {
      id: 'conv-456',
      subject: 'Pedido #12345',
    },
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn((field: string, value: string) => ({
          gte: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
          single: vi.fn(() => {
            if (table === 'profiles') {
              return {
                data: mockSupabaseData.profiles[value as keyof typeof mockSupabaseData.profiles] || null,
                error: null,
              };
            }
            if (table === 'support_conversations') {
              return {
                data: mockSupabaseData.conversations[value as keyof typeof mockSupabaseData.conversations] || null,
                error: null,
              };
            }
            return { data: null, error: null };
          }),
        })),
      })),
    })),
  },
}));

describe('NotificationService - Email Templates', () => {
  let mockEmailService: MockEmailService;
  let notificationService: NotificationService;

  beforeEach(() => {
    mockEmailService = new MockEmailService();
    notificationService = new NotificationService(mockEmailService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockEmailService.reset();
  });

  describe('Requirement 16.3: Email must include message content', () => {
    it('should include single message content in email template', async () => {
      // Feature: advanced-chat-support-system, Requirement 16.3
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Olá, preciso de ajuda com meu pedido';

      // Queue notification
      notificationService.queueNotification(userId, conversationId, message);

      // Fast-forward time to trigger email sending
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      await notificationService.processNotificationQueue();

      // Verify email was sent
      expect(mockEmailService.sentEmails).toHaveLength(1);
      const sentEmail = mockEmailService.sentEmails[0];

      // Verify message content is included in HTML
      expect(sentEmail.template.html).toContain(message);

      // Verify message content is included in plain text
      expect(sentEmail.template.text).toContain(message);
    });

    it('should include multiple message contents in email template', async () => {
      // Feature: advanced-chat-support-system, Requirement 16.3
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const messages = [
        'Primeira mensagem',
        'Segunda mensagem',
        'Terceira mensagem',
      ];

      // Queue multiple notifications
      messages.forEach(msg => {
        notificationService.queueNotification(userId, conversationId, msg);
      });

      // Fast-forward time to trigger email sending
      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      // Verify email was sent
      expect(mockEmailService.sentEmails).toHaveLength(1);
      const sentEmail = mockEmailService.sentEmails[0];

      // Verify all messages are included in HTML
      messages.forEach(msg => {
        expect(sentEmail.template.html).toContain(msg);
      });

      // Verify all messages are included in plain text
      messages.forEach(msg => {
        expect(sentEmail.template.text).toContain(msg);
      });
    });

    it('should escape HTML in message content to prevent XSS', async () => {
      // Feature: advanced-chat-support-system, Requirement 16.3 + Security
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const maliciousMessage = '<script>alert("XSS")</script>';

      notificationService.queueNotification(userId, conversationId, maliciousMessage);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify HTML is escaped
      expect(sentEmail.template.html).not.toContain('<script>');
      expect(sentEmail.template.html).toContain('&lt;script&gt;');
    });

    it('should preserve line breaks in message content', async () => {
      // Feature: advanced-chat-support-system, Requirement 16.3
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const messageWithLineBreaks = 'Linha 1\nLinha 2\nLinha 3';

      notificationService.queueNotification(userId, conversationId, messageWithLineBreaks);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify line breaks are preserved in plain text
      expect(sentEmail.template.text).toContain('Linha 1');
      expect(sentEmail.template.text).toContain('Linha 2');
      expect(sentEmail.template.text).toContain('Linha 3');
    });
  });

  describe('Requirement 16.4: Email must include link to conversation', () => {
    it('should include conversation link in HTML template', async () => {
      // Feature: advanced-chat-support-system, Requirement 16.4
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Test message';

      notificationService.queueNotification(userId, conversationId, message);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify HTML contains a link (href attribute)
      expect(sentEmail.template.html).toMatch(/href="[^"]*\/chat"/);
      
      // Verify link text is present
      expect(sentEmail.template.html).toContain('Ver Conversa');
    });

    it('should include conversation link in plain text template', async () => {
      // Feature: advanced-chat-support-system, Requirement 16.4
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Test message';

      notificationService.queueNotification(userId, conversationId, message);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify plain text contains URL
      expect(sentEmail.template.text).toMatch(/https?:\/\/[^\s]+\/chat/);
    });

    it('should include conversation link as clickable button in HTML', async () => {
      // Feature: advanced-chat-support-system, Requirement 16.4
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Test message';

      notificationService.queueNotification(userId, conversationId, message);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify button styling is present
      expect(sentEmail.template.html).toContain('class="button"');
      
      // Verify it's an anchor tag with href
      expect(sentEmail.template.html).toMatch(/<a[^>]*href="[^"]*\/chat"[^>]*>/);
    });
  });

  describe('Email Template Structure', () => {
    it('should have proper HTML structure with DOCTYPE and meta tags', async () => {
      // Feature: advanced-chat-support-system, Email template quality
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Test message';

      notificationService.queueNotification(userId, conversationId, message);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify HTML structure
      expect(sentEmail.template.html).toContain('<!DOCTYPE html>');
      expect(sentEmail.template.html).toContain('<html');
      expect(sentEmail.template.html).toContain('<head>');
      expect(sentEmail.template.html).toContain('<meta charset="utf-8">');
      expect(sentEmail.template.html).toContain('</html>');
    });

    it('should include conversation subject in email', async () => {
      // Feature: advanced-chat-support-system, Email template quality
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Test message';

      notificationService.queueNotification(userId, conversationId, message);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Subject should be in the email subject line
      expect(sentEmail.template.subject).toBeTruthy();
      expect(sentEmail.template.subject.length).toBeGreaterThan(0);
    });

    it('should have different subject for single vs multiple messages', async () => {
      // Feature: advanced-chat-support-system, Email template quality
      const userId = 'user-123';
      const conversationId = 'conv-456';

      // Single message
      notificationService.queueNotification(userId, conversationId, 'Message 1');
      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const singleMessageEmail = mockEmailService.sentEmails[0];
      mockEmailService.reset();

      // Multiple messages
      notificationService.queueNotification(userId, conversationId, 'Message 1');
      notificationService.queueNotification(userId, conversationId, 'Message 2');
      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const multipleMessagesEmail = mockEmailService.sentEmails[0];

      // Subjects should be different
      expect(singleMessageEmail.template.subject).not.toBe(multipleMessagesEmail.template.subject);
      
      // Multiple messages subject should indicate count
      expect(multipleMessagesEmail.template.subject).toMatch(/2.*mensagens/i);
    });

    it('should include professional styling in HTML template', async () => {
      // Feature: advanced-chat-support-system, Email template quality
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Test message';

      notificationService.queueNotification(userId, conversationId, message);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify CSS styling is present
      expect(sentEmail.template.html).toContain('<style>');
      expect(sentEmail.template.html).toContain('background-color');
      expect(sentEmail.template.html).toContain('font-family');
    });

    it('should include footer with instructions', async () => {
      // Feature: advanced-chat-support-system, Email template quality
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Test message';

      notificationService.queueNotification(userId, conversationId, message);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify footer is present
      expect(sentEmail.template.html).toContain('footer');
      expect(sentEmail.template.html).toMatch(/não responda/i);
    });
  });

  describe('Email Template Data', () => {
    it('should include conversation ID in email data', async () => {
      // Feature: advanced-chat-support-system, Email template data
      const userId = 'user-123';
      const conversationId = 'conv-456';
      const message = 'Test message';

      notificationService.queueNotification(userId, conversationId, message);

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify data includes conversation ID
      expect(sentEmail.data).toBeDefined();
      expect(sentEmail.data?.conversationId).toBe(conversationId);
    });

    it('should include message count in email data', async () => {
      // Feature: advanced-chat-support-system, Email template data
      const userId = 'user-123';
      const conversationId = 'conv-456';

      notificationService.queueNotification(userId, conversationId, 'Message 1');
      notificationService.queueNotification(userId, conversationId, 'Message 2');
      notificationService.queueNotification(userId, conversationId, 'Message 3');

      vi.advanceTimersByTime(6 * 60 * 1000);
      await notificationService.processNotificationQueue();

      const sentEmail = mockEmailService.sentEmails[0];

      // Verify data includes message count
      expect(sentEmail.data?.messageCount).toBe(3);
    });
  });
});

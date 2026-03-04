# Email Templates - Character Choice Reminders

This directory contains reusable HTML email templates for the Production Management System's character choice reminder workflow.

## Overview

These templates are used by the character choice reminder system to notify customers about upcoming deadlines and alert admins when choices expire.

## Templates

### 1. First Reminder (5 days before deadline)
**File:** `character-choice-reminder-first.html`

**Subject:** "Escolha seu Personagem - {Collection Name}"

**Visual Design:**
- Blue gradient header (#3b82f6 to #2563eb)
- Friendly, informative tone
- Large countdown display showing "5 dias restantes"
- Clear CTA button: "Fazer Minha Escolha"

**When Sent:** 5 days before the character choice deadline

**Purpose:** Initial friendly reminder to choose a character

---

### 2. Second Reminder (2 days before deadline)
**File:** `character-choice-reminder-second.html`

**Subject:** "⏰ Lembrete: Escolha seu Personagem - {Collection Name}"

**Visual Design:**
- Orange gradient header (#f59e0b to #d97706)
- More urgent tone with ⏰ emoji
- Large countdown display showing "2 dias restantes"
- Clear CTA button: "Fazer Minha Escolha"

**When Sent:** 2 days before the character choice deadline

**Purpose:** Increased urgency reminder for customers who haven't chosen yet

---

### 3. Final Reminder (1 day before deadline)
**File:** `character-choice-reminder-final.html`

**Subject:** "🚨 URGENTE: Último Dia para Escolher - {Collection Name}"

**Visual Design:**
- Red gradient header (#dc2626 to #991b1b)
- High urgency tone with 🚨 emoji
- Large countdown display showing "1 dia restante"
- Prominent warning box about auto-assignment
- Clear CTA button: "Escolher Agora!"

**When Sent:** 1 day before the character choice deadline

**Purpose:** Final urgent warning before automatic character assignment

**Special Features:**
- Warning box explaining consequences of not choosing
- More urgent CTA text
- Maximum visual urgency (red color scheme)

---

### 4. Admin Expiration Notice
**File:** `admin-expiration-notice.html`

**Subject:** "⚠️ Escolha de Personagem Expirada - {Collection Name}"

**Recipient:** Admin email (configured via `ADMIN_EMAIL` environment variable)

**Visual Design:**
- Red gradient header (#dc2626 to #991b1b)
- Professional admin-focused layout
- Detailed information box with all order details
- Yellow action-required box
- Clear CTA button: "Gerenciar Escolhas"

**When Sent:** When a character choice deadline expires without customer selection

**Purpose:** Alert admin to manually assign a character to the order

**Information Included:**
- Customer name and email
- Collection name
- Order ID and type
- Expired deadline (formatted)
- Days expired count
- Action steps for admin

---

## Template Variables

All templates use the following variable syntax: `{{variableName}}`

### Common Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{userName}}` | Customer's name | "João Silva" |
| `{{collectionName}}` | Name of the collection | "Marvel Legends" |
| `{{deadline}}` | Formatted deadline date | "15/01/2024" |
| `{{choiceUrl}}` | URL to character selection page | "https://ordax.com.br/assinatura/123" |
| `{{year}}` | Current year for copyright | "2024" |

### Admin Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{customerName}}` | Customer's full name | "João Silva" |
| `{{customerEmail}}` | Customer's email address | "joao@example.com" |
| `{{orderId}}` | Order identifier | "abc-123-def" |
| `{{orderType}}` | Type of order | "Assinatura" or "Compra Avulsa" |
| `{{daysExpired}}` | Days since deadline expired | "2" |
| `{{adminUrl}}` | URL to admin management panel | "https://ordax.com.br/admin/character-choices" |

---

## Usage

### In Cron Jobs

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

// Load template
const templatePath = join(__dirname, 'email-templates', 'character-choice-reminder-first.html');
const template = readFileSync(templatePath, 'utf-8');

// Replace variables
const html = template
  .replace(/{{userName}}/g, userName)
  .replace(/{{collectionName}}/g, collectionName)
  .replace(/{{deadline}}/g, formattedDeadline)
  .replace(/{{choiceUrl}}/g, choiceUrl)
  .replace(/{{year}}/g, new Date().getFullYear().toString());

// Send email
await sendEmail({
  to: customerEmail,
  subject: `Escolha seu Personagem - ${collectionName}`,
  html: html,
});
```

### In Notification Service

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

class EmailTemplateService {
  private loadTemplate(templateName: string): string {
    const templatePath = join(__dirname, 'email-templates', `${templateName}.html`);
    return readFileSync(templatePath, 'utf-8');
  }

  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  public generateReminderEmail(type: 'first' | 'second' | 'final', data: ReminderData): string {
    const templateName = `character-choice-reminder-${type}`;
    const template = this.loadTemplate(templateName);
    
    return this.replaceVariables(template, {
      userName: data.userName,
      collectionName: data.collectionName,
      deadline: data.deadline,
      choiceUrl: data.choiceUrl,
      year: new Date().getFullYear().toString(),
    });
  }

  public generateAdminExpirationEmail(data: AdminNotificationData): string {
    const template = this.loadTemplate('admin-expiration-notice');
    
    return this.replaceVariables(template, {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      collectionName: data.collectionName,
      orderId: data.orderId,
      orderType: data.orderType,
      deadline: data.deadline,
      daysExpired: data.daysExpired.toString(),
      adminUrl: data.adminUrl,
      year: new Date().getFullYear().toString(),
    });
  }
}
```

---

## Design Specifications

### Color Schemes by Urgency

| Urgency Level | Header Gradient | Info Box | Border Color |
|---------------|----------------|----------|--------------|
| Low (5 days)  | Blue (#3b82f6 → #2563eb) | #eff6ff → #dbeafe | #3b82f6 |
| Medium (2 days) | Orange (#f59e0b → #d97706) | #fffbeb → #fef3c7 | #f59e0b |
| High (1 day)  | Red (#dc2626 → #991b1b) | #fef2f2 → #fee2e2 | #dc2626 |

### Typography

- **Font Family:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
- **Header Title:** 28px, bold (700)
- **Countdown Number:** 48px, bold (700)
- **Body Text:** 16px, regular
- **Small Text:** 14px, regular

### Responsive Design

All templates are mobile-responsive with:
- Max-width: 600px
- Flexible padding and margins
- Readable font sizes on mobile
- Touch-friendly button sizes (14px padding)

---

## Testing

### Manual Testing

1. Load template file
2. Replace all variables with test data
3. Send test email to your own address
4. Verify:
   - All variables are replaced correctly
   - No `{{variableName}}` placeholders remain
   - Colors and styling render correctly
   - Links work properly
   - Mobile responsive design works
   - Email displays correctly in multiple clients (Gmail, Outlook, etc.)

### Automated Testing

```typescript
describe('Email Templates', () => {
  it('should replace all variables in first reminder template', () => {
    const template = loadTemplate('character-choice-reminder-first');
    const html = replaceVariables(template, {
      userName: 'Test User',
      collectionName: 'Test Collection',
      deadline: '01/01/2024',
      choiceUrl: 'https://example.com',
      year: '2024',
    });
    
    expect(html).not.toContain('{{');
    expect(html).toContain('Test User');
    expect(html).toContain('Test Collection');
  });
});
```

---

## Maintenance

### Updating Templates

1. Edit the HTML file directly
2. Test changes with sample data
3. Verify mobile responsiveness
4. Check email client compatibility
5. Update this README if variables change

### Adding New Templates

1. Create new `.html` file in this directory
2. Follow existing template structure
3. Use consistent variable naming: `{{variableName}}`
4. Add documentation to this README
5. Update usage examples

---

## Integration Points

### Cron Jobs
- `supabase/functions/cron-send-character-choice-reminders/index.ts` - Sends customer reminders
- `supabase/functions/cron-expire-character-choices/index.ts` - Sends admin expiration notices

### Services
- `src/services/notifications/production-notification-service.ts` - Main notification service

### Database
- `character_choices` table - Tracks reminder status
- `production_queue` table - Manages production workflow

---

## Localization

All templates are currently in Portuguese (pt-BR). To add additional languages:

1. Create language-specific subdirectories: `pt-BR/`, `en-US/`, etc.
2. Duplicate templates in each language directory
3. Update template loading logic to select based on user language preference
4. Maintain consistent variable names across all languages

---

## Email Provider Compatibility

These templates have been tested with:
- ✅ Gmail
- ✅ Outlook
- ✅ Apple Mail
- ✅ Yahoo Mail
- ✅ Resend
- ✅ SendGrid

**Note:** Some email clients may strip certain CSS properties. The templates use inline styles and table-based layouts for maximum compatibility.

---

## Related Documentation

- [Production Management System Requirements](../../../.kiro/specs/production-management-system/requirements.md)
- [Production Management System Design](../../../.kiro/specs/production-management-system/design.md)
- [Email Templates Documentation](../../../.kiro/specs/production-management-system/EMAIL_TEMPLATES_DOCUMENTATION.md)
- [Task 3.3.4 Completion](../../../.kiro/specs/production-management-system/tasks.md#334-create-reminder-email-templates)

---

## Support

For questions or issues with email templates:
1. Check the [EMAIL_TEMPLATES_DOCUMENTATION.md](../../../.kiro/specs/production-management-system/EMAIL_TEMPLATES_DOCUMENTATION.md)
2. Review cron job implementations for usage examples
3. Test templates with sample data before deploying

---

**Last Updated:** 2024  
**Task:** 3.3.4 Create reminder email templates  
**Status:** ✅ Complete

// @ts-nocheck
/**
 * Email Template Usage Examples
 * 
 * This file demonstrates how to use the email templates in different scenarios.
 * These examples can be used as a reference or adapted for testing.
 */

import {
  EmailTemplateLoader,
  getReminderSubject,
  getAdminExpirationSubject,
  type ReminderType,
  type ReminderTemplateData,
  type AdminExpirationTemplateData,
} from './template-loader';

// ============================================================================
// Example 1: Loading a First Reminder Template
// ============================================================================

export function exampleFirstReminder() {
  const loader = new EmailTemplateLoader();
  
  const data: ReminderTemplateData = {
    userName: 'João Silva',
    collectionName: 'Marvel Legends',
    deadline: '15/01/2024',
    choiceUrl: 'https://ordax.com.br/assinatura/abc-123',
  };
  
  const html = loader.loadReminderTemplate('first', data);
  const subject = getReminderSubject('first', data.collectionName);
  
  console.log('Subject:', subject);
  console.log('HTML:', html);
  
  return { subject, html };
}

// ============================================================================
// Example 2: Loading a Second Reminder Template
// ============================================================================

export function exampleSecondReminder() {
  const loader = new EmailTemplateLoader();
  
  const data: ReminderTemplateData = {
    userName: 'Maria Santos',
    collectionName: 'DC Comics',
    deadline: '20/01/2024',
    choiceUrl: 'https://ordax.com.br/compra-avulsa/def-456',
  };
  
  const html = loader.loadReminderTemplate('second', data);
  const subject = getReminderSubject('second', data.collectionName);
  
  return { subject, html };
}

// ============================================================================
// Example 3: Loading a Final Reminder Template
// ============================================================================

export function exampleFinalReminder() {
  const loader = new EmailTemplateLoader();
  
  const data: ReminderTemplateData = {
    userName: 'Pedro Oliveira',
    collectionName: 'Star Wars',
    deadline: '25/01/2024',
    choiceUrl: 'https://ordax.com.br/assinatura/ghi-789',
  };
  
  const html = loader.loadReminderTemplate('final', data);
  const subject = getReminderSubject('final', data.collectionName);
  
  return { subject, html };
}

// ============================================================================
// Example 4: Loading Admin Expiration Notice
// ============================================================================

export function exampleAdminExpiration() {
  const loader = new EmailTemplateLoader();
  
  const data: AdminExpirationTemplateData = {
    customerName: 'Carlos Mendes',
    customerEmail: 'carlos@example.com',
    collectionName: 'Anime Figures',
    orderId: 'jkl-012',
    orderType: 'Assinatura',
    deadline: '10/01/2024 23:59',
    daysExpired: 2,
    adminUrl: 'https://ordax.com.br/admin/character-choices',
  };
  
  const html = loader.loadAdminExpirationTemplate(data);
  const subject = getAdminExpirationSubject(data.collectionName);
  
  return { subject, html };
}

// ============================================================================
// Example 5: Dynamic Reminder Type Selection
// ============================================================================

export function exampleDynamicReminder(daysUntilDeadline: number) {
  const loader = new EmailTemplateLoader();
  
  // Determine reminder type based on days until deadline
  let reminderType: ReminderType;
  if (daysUntilDeadline === 5) {
    reminderType = 'first';
  } else if (daysUntilDeadline === 2) {
    reminderType = 'second';
  } else if (daysUntilDeadline === 1) {
    reminderType = 'final';
  } else {
    throw new Error(`Invalid days until deadline: ${daysUntilDeadline}`);
  }
  
  const data: ReminderTemplateData = {
    userName: 'Ana Costa',
    collectionName: 'Pokemon',
    deadline: new Date(Date.now() + daysUntilDeadline * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    choiceUrl: 'https://ordax.com.br/assinatura/mno-345',
  };
  
  const html = loader.loadReminderTemplate(reminderType, data);
  const subject = getReminderSubject(reminderType, data.collectionName);
  
  return { subject, html, reminderType };
}

// ============================================================================
// Example 6: Validating Template Variables
// ============================================================================

export function exampleValidateVariables() {
  const loader = new EmailTemplateLoader();
  
  // This would normally load the actual template content
  const mockTemplate = `
    <html>
      <body>
        <h1>Hello {{userName}}</h1>
        <p>Collection: {{collectionName}}</p>
        <p>Deadline: {{deadline}}</p>
      </body>
    </html>
  `;
  
  // Complete variables
  const completeVars = {
    userName: 'Test User',
    collectionName: 'Test Collection',
    deadline: '01/01/2024',
  };
  
  const validation1 = loader.validateVariables(mockTemplate, completeVars);
  console.log('Complete validation:', validation1);
  // Output: { valid: true, missing: [] }
  
  // Incomplete variables
  const incompleteVars = {
    userName: 'Test User',
  };
  
  const validation2 = loader.validateVariables(mockTemplate, incompleteVars);
  console.log('Incomplete validation:', validation2);
  // Output: { valid: false, missing: ['collectionName', 'deadline'] }
  
  return { validation1, validation2 };
}

// ============================================================================
// Example 7: Batch Processing Multiple Reminders
// ============================================================================

export function exampleBatchReminders() {
  const loader = new EmailTemplateLoader();
  
  const customers = [
    {
      userName: 'Cliente 1',
      collectionName: 'Coleção A',
      deadline: '15/01/2024',
      choiceUrl: 'https://ordax.com.br/assinatura/1',
      daysUntilDeadline: 5,
    },
    {
      userName: 'Cliente 2',
      collectionName: 'Coleção B',
      deadline: '16/01/2024',
      choiceUrl: 'https://ordax.com.br/assinatura/2',
      daysUntilDeadline: 2,
    },
    {
      userName: 'Cliente 3',
      collectionName: 'Coleção C',
      deadline: '17/01/2024',
      choiceUrl: 'https://ordax.com.br/assinatura/3',
      daysUntilDeadline: 1,
    },
  ];
  
  const emails = customers.map(customer => {
    let reminderType: ReminderType;
    if (customer.daysUntilDeadline === 5) reminderType = 'first';
    else if (customer.daysUntilDeadline === 2) reminderType = 'second';
    else reminderType = 'final';
    
    const data: ReminderTemplateData = {
      userName: customer.userName,
      collectionName: customer.collectionName,
      deadline: customer.deadline,
      choiceUrl: customer.choiceUrl,
    };
    
    return {
      to: `${customer.userName.toLowerCase().replace(' ', '.')}@example.com`,
      subject: getReminderSubject(reminderType, customer.collectionName),
      html: loader.loadReminderTemplate(reminderType, data),
      reminderType,
    };
  });
  
  console.log(`Generated ${emails.length} reminder emails`);
  return emails;
}

// ============================================================================
// Example 8: Error Handling
// ============================================================================

export function exampleErrorHandling() {
  const loader = new EmailTemplateLoader();
  
  try {
    // This will throw an error because template loading is not implemented
    const html = loader.loadReminderTemplate('first', {
      userName: 'Test',
      collectionName: 'Test',
      deadline: '01/01/2024',
      choiceUrl: 'https://example.com',
    });
    
    return { success: true, html };
  } catch (error) {
    console.error('Error loading template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Example 9: Integration with Email Service
// ============================================================================

export async function exampleSendEmail() {
  const loader = new EmailTemplateLoader();
  
  const data: ReminderTemplateData = {
    userName: 'Test User',
    collectionName: 'Test Collection',
    deadline: '01/01/2024',
    choiceUrl: 'https://ordax.com.br/assinatura/test',
  };
  
  const html = loader.loadReminderTemplate('first', data);
  const subject = getReminderSubject('first', data.collectionName);
  
  // This would integrate with your actual email service
  // Example with a hypothetical email service:
  /*
  await emailService.sendEmail({
    to: 'customer@example.com',
    from: 'noreply@ordax.com.br',
    subject: subject,
    html: html,
  });
  */
  
  console.log('Email would be sent with:');
  console.log('Subject:', subject);
  console.log('HTML length:', html.length);
  
  return { subject, htmlLength: html.length };
}

// ============================================================================
// Example 10: Testing All Templates
// ============================================================================

export function exampleTestAllTemplates() {
  const results = {
    firstReminder: exampleFirstReminder(),
    secondReminder: exampleSecondReminder(),
    finalReminder: exampleFinalReminder(),
    adminExpiration: exampleAdminExpiration(),
  };
  
  console.log('All templates tested successfully');
  return results;
}

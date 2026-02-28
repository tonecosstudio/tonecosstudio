/**
 * Tests for MySubscriptions Page - Auto-Maintained Indicator
 * 
 * Requirements: 6.5, 28.9
 * 
 * Note: These tests verify that the auto-maintained indicator code exists
 * and is properly structured in the MySubscriptions component.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('MySubscriptions - Auto-Maintained Indicator Code Verification', () => {
  const componentPath = join(__dirname, 'MySubscriptions.tsx');
  const componentCode = readFileSync(componentPath, 'utf-8');

  it('should have auto_maintained conditional rendering', () => {
    // Verify the code contains the conditional check for auto_maintained
    expect(componentCode).toContain('delivery.auto_maintained');
    expect(componentCode).toContain('{delivery.auto_maintained &&');
  });

  it('should render Auto-mantida badge with RefreshCw icon', () => {
    // Verify the badge text and icon are present
    expect(componentCode).toContain('Auto-mantida');
    expect(componentCode).toContain('<RefreshCw');
    expect(componentCode).toContain('Badge');
  });

  it('should have tooltip explaining auto-maintenance', () => {
    // Verify tooltip components are used
    expect(componentCode).toContain('TooltipProvider');
    expect(componentCode).toContain('Tooltip');
    expect(componentCode).toContain('TooltipTrigger');
    expect(componentCode).toContain('TooltipContent');
    
    // Verify the explanation text is present
    expect(componentCode).toContain('mantida automaticamente');
    expect(componentCode).toContain('escolha anterior');
    expect(componentCode).toContain('até o dia 15');
  });

  it('should import required components', () => {
    // Verify all necessary imports are present
    expect(componentCode).toContain("@/components/ui/tooltip");
    expect(componentCode).toContain("@/components/ui/badge");
    expect(componentCode).toContain('RefreshCw');
    expect(componentCode).toContain("lucide-react");
  });

  it('should have proper badge styling', () => {
    // Verify badge has proper variant
    expect(componentCode).toContain('variant="secondary"');
  });

  it('should display badge in delivery card context', () => {
    // Verify the badge is within the DeliveryCard function
    const deliveryCardMatch = componentCode.match(/function DeliveryCard[\s\S]*?^}/m);
    expect(deliveryCardMatch).toBeTruthy();
    
    if (deliveryCardMatch) {
      const deliveryCardCode = deliveryCardMatch[0];
      expect(deliveryCardCode).toContain('auto_maintained');
      expect(deliveryCardCode).toContain('Auto-mantida');
    }
  });
});

describe('MySubscriptions - Pause Button Verification', () => {
  const componentPath = join(__dirname, 'MySubscriptions.tsx');
  const componentCode = readFileSync(componentPath, 'utf-8');

  it('should have pause button in SubscriptionCard', () => {
    // Verify pause button exists
    expect(componentCode).toContain('Pausar');
    expect(componentCode).toContain('setIsPausing');
  });

  it('should display pause count remaining (2 - pause_count)', () => {
    // Verify pause count calculation
    expect(componentCode).toContain('2 - (subscription.pause_count || 0)');
    expect(componentCode).toContain('Pausas disponíveis');
  });

  it('should disable pause button if pause_count >= 2', () => {
    // Verify disable condition
    expect(componentCode).toContain('(subscription.pause_count || 0) >= 2');
  });

  it('should disable pause button after cutoff', () => {
    // Verify cutoff check
    expect(componentCode).toContain('!isBeforeCutoff');
  });

  it('should have PauseSubscriptionDialog component', () => {
    // Verify dialog component exists
    expect(componentCode).toContain('function PauseSubscriptionDialog');
    expect(componentCode).toContain('pause-subscription');
  });

  it('should show confirmation dialog with consequences', () => {
    // Verify dialog shows consequences
    expect(componentCode).toContain('O que acontece ao pausar');
    expect(componentCode).toContain('Sua próxima entrega será cancelada');
    expect(componentCode).toContain('Todas as entregas seguintes serão adiadas em 1 mês');
    expect(componentCode).toContain('Esta ação não pode ser desfeita');
  });

  it('should show warning for last pause', () => {
    // Verify last pause warning
    expect(componentCode).toContain('pausesRemaining === 1');
    expect(componentCode).toContain('última pausa disponível');
  });

  it('should have tooltip explaining pause restrictions', () => {
    // Verify tooltip for pause button
    expect(componentCode).toContain('Não é possível pausar após o prazo limite');
    expect(componentCode).toContain('Limite de pausas atingido');
    expect(componentCode).toContain('Pausar próxima entrega');
  });

  it('should call pause-subscription endpoint', () => {
    // Verify API call
    expect(componentCode).toContain('supabase.functions.invoke("pause-subscription"');
    expect(componentCode).toContain('subscriptionId: subscription.id');
  });

  it('should show success message with pauses remaining', () => {
    // Verify success toast
    expect(componentCode).toContain('Assinatura pausada');
    expect(componentCode).toContain('pauses_remaining');
  });

  it('should handle CUTOFF_PASSED error with specific message', () => {
    // Requirement 23.7: Verify cutoff error handling
    expect(componentCode).toContain('CUTOFF_PASSED');
    expect(componentCode).toContain('Prazo limite ultrapassado');
    expect(componentCode).toContain('Não é possível pausar após o dia 15 às 23:59:59');
  });

  it('should handle PAUSE_LIMIT_EXCEEDED error', () => {
    // Verify pause limit error handling
    expect(componentCode).toContain('PAUSE_LIMIT_EXCEEDED');
    expect(componentCode).toContain('Limite de pausas atingido');
  });
});

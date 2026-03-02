/**
 * Unit tests for Subscription Plan Service
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { getPrismaClient } from '../config/database';
import { getSubscriptionPlans, calculateCreditsForPlan } from './subscription-plan.service';
import { PlanType } from '../models/types';

const prisma = getPrismaClient();

describe('Subscription Plan Service', () => {
  beforeAll(async () => {
    // Limpa dados de teste
    await prisma.subscriptionPlan.deleteMany({});
    
    // Cria planos de teste
    await prisma.subscriptionPlan.createMany({
      data: [
        {
          planType: 'trimestral',
          name: 'Plano Trimestral',
          durationMonths: 3,
          price: 99.90,
          baseCredits: 600,
          bonusCredits: 0,
          isActive: true
        },
        {
          planType: 'semestral',
          name: 'Plano Semestral',
          durationMonths: 6,
          price: 189.90,
          baseCredits: 1200,
          bonusCredits: 200,
          isActive: true
        }
      ]
    });
  });

  afterAll(async () => {
    // Limpa dados de teste
    await prisma.subscriptionPlan.deleteMany({});
    await prisma.$disconnect();
  });

  describe('getSubscriptionPlans', () => {
    it('should return all active subscription plans', async () => {
      const plans = await getSubscriptionPlans();

      expect(plans).toHaveLength(2);
      expect(plans[0]?.planType).toBe('trimestral');
      expect(plans[1]?.planType).toBe('semestral');
    });

    it('should return plans ordered by duration', async () => {
      const plans = await getSubscriptionPlans();

      expect(plans[0]?.durationMonths).toBe(3);
      expect(plans[1]?.durationMonths).toBe(6);
    });

    it('should include all plan details', async () => {
      const plans = await getSubscriptionPlans();
      const trimestralPlan = plans.find(p => p.planType === 'trimestral');

      expect(trimestralPlan).toBeDefined();
      expect(trimestralPlan?.name).toBe('Plano Trimestral');
      expect(trimestralPlan?.price).toBe(99.90);
      expect(trimestralPlan?.baseCredits).toBe(600);
      expect(trimestralPlan?.bonusCredits).toBe(0);
      expect(trimestralPlan?.isActive).toBe(true);
    });

    it('should not return inactive plans', async () => {
      // Desativa plano trimestral
      await prisma.subscriptionPlan.update({
        where: { planType: 'trimestral' },
        data: { isActive: false }
      });

      const plans = await getSubscriptionPlans();

      expect(plans).toHaveLength(1);
      expect(plans[0]?.planType).toBe('semestral');

      // Reativa para outros testes
      await prisma.subscriptionPlan.update({
        where: { planType: 'trimestral' },
        data: { isActive: true }
      });
    });
  });

  describe('calculateCreditsForPlan', () => {
    it('should calculate credits for trimestral plan correctly', async () => {
      const result = await calculateCreditsForPlan('trimestral');

      expect(result.planType).toBe('trimestral');
      expect(result.baseCredits).toBe(600);
      expect(result.bonusCredits).toBe(0);
      expect(result.totalCredits).toBe(600);
    });

    it('should calculate credits for semestral plan correctly', async () => {
      const result = await calculateCreditsForPlan('semestral');

      expect(result.planType).toBe('semestral');
      expect(result.baseCredits).toBe(1200);
      expect(result.bonusCredits).toBe(200);
      expect(result.totalCredits).toBe(1400);
    });

    it('should throw error for non-existent plan type', async () => {
      await expect(
        calculateCreditsForPlan('invalid' as PlanType)
      ).rejects.toThrow("Plan type 'invalid' not found");
    });

    it('should throw error for inactive plan', async () => {
      // Desativa plano trimestral
      await prisma.subscriptionPlan.update({
        where: { planType: 'trimestral' },
        data: { isActive: false }
      });

      await expect(
        calculateCreditsForPlan('trimestral')
      ).rejects.toThrow("Plan type 'trimestral' is not active");

      // Reativa para outros testes
      await prisma.subscriptionPlan.update({
        where: { planType: 'trimestral' },
        data: { isActive: true }
      });
    });

    it('should correctly sum base and bonus credits', async () => {
      const trimestral = await calculateCreditsForPlan('trimestral');
      const semestral = await calculateCreditsForPlan('semestral');

      expect(trimestral.totalCredits).toBe(
        trimestral.baseCredits + trimestral.bonusCredits
      );
      expect(semestral.totalCredits).toBe(
        semestral.baseCredits + semestral.bonusCredits
      );
    });
  });
});

/**
 * Unit tests for Credit Service
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import {
  allocateCredits,
  debitCredits,
  getUserCredits,
  expireCredits
} from './credit.service';
import { getPrismaClient, disconnectPrisma } from '../config/database';

const prisma = getPrismaClient();

describe('Credit Service', () => {
  // Limpa dados de teste após cada teste
  beforeEach(async () => {
    await prisma.creditTransaction.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.userCredit.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('allocateCredits', () => {
    it('should create new credit record for user', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          nextBillingDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      // Act
      const result = await allocateCredits(
        Number(user.id),
        Number(subscription.id),
        600
      );

      // Assert
      expect(result.userId).toBe(Number(user.id));
      expect(result.subscriptionId).toBe(Number(subscription.id));
      expect(result.totalCredits).toBe(600);
      expect(result.availableCredits).toBe(600);
      expect(result.creditsAllocated).toBe(600);

      // Verify in database
      const credits = await getUserCredits(Number(user.id));
      expect(credits).not.toBeNull();
      expect(credits!.totalCredits).toBe(600);
      expect(credits!.usedCredits).toBe(0);
      expect(credits!.availableCredits).toBe(600);
    });

    it('should add credits to existing balance (not reset)', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test2@example.com',
          name: 'Test User 2'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      // First allocation
      await allocateCredits(Number(user.id), Number(subscription.id), 600);

      // Act - Second allocation (renewal)
      const result = await allocateCredits(
        Number(user.id),
        Number(subscription.id),
        600
      );

      // Assert - Credits should be summed
      expect(result.totalCredits).toBe(1200);
      expect(result.availableCredits).toBe(1200);
      expect(result.creditsAllocated).toBe(600);
    });

    it('should throw error for negative amount', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test3@example.com',
          name: 'Test User 3'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      // Act & Assert
      await expect(
        allocateCredits(Number(user.id), Number(subscription.id), -100)
      ).rejects.toThrow('Amount must be positive');
    });

    it('should throw error for zero amount', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test4@example.com',
          name: 'Test User 4'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      // Act & Assert
      await expect(
        allocateCredits(Number(user.id), Number(subscription.id), 0)
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('debitCredits', () => {
    it('should debit credits when balance is sufficient', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test5@example.com',
          name: 'Test User 5'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      await allocateCredits(Number(user.id), Number(subscription.id), 600);

      // Act
      const result = await debitCredits(Number(user.id), 200);

      // Assert
      expect(result.userId).toBe(Number(user.id));
      expect(result.previousAvailable).toBe(600);
      expect(result.debited).toBe(200);
      expect(result.newAvailable).toBe(400);

      // Verify invariant: available = total - used
      const credits = await getUserCredits(Number(user.id));
      expect(credits!.availableCredits).toBe(
        credits!.totalCredits - credits!.usedCredits
      );
    });

    it('should reject debit when balance is insufficient', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test6@example.com',
          name: 'Test User 6'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      await allocateCredits(Number(user.id), Number(subscription.id), 100);

      // Act & Assert
      await expect(
        debitCredits(Number(user.id), 200)
      ).rejects.toThrow('Insufficient credits');
    });

    it('should throw error for negative amount', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test7@example.com',
          name: 'Test User 7'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      await allocateCredits(Number(user.id), Number(subscription.id), 600);

      // Act & Assert
      await expect(
        debitCredits(Number(user.id), -50)
      ).rejects.toThrow('Amount must be positive');
    });

    it('should throw error when user has no credits', async () => {
      // Act & Assert
      await expect(
        debitCredits(99999, 100)
      ).rejects.toThrow('No credits found for user');
    });
  });

  describe('getUserCredits', () => {
    it('should return user credits', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test8@example.com',
          name: 'Test User 8'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'semestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }
      });

      await allocateCredits(Number(user.id), Number(subscription.id), 1400);
      await debitCredits(Number(user.id), 300);

      // Act
      const credits = await getUserCredits(Number(user.id));

      // Assert
      expect(credits).not.toBeNull();
      expect(credits!.userId).toBe(Number(user.id));
      expect(credits!.totalCredits).toBe(1400);
      expect(credits!.usedCredits).toBe(300);
      expect(credits!.availableCredits).toBe(1100);
      expect(credits!.expiredCredits).toBe(0);
    });

    it('should return null for non-existent user', async () => {
      // Act
      const credits = await getUserCredits(99999);

      // Assert
      expect(credits).toBeNull();
    });
  });

  describe('expireCredits', () => {
    it('should expire all available credits', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test9@example.com',
          name: 'Test User 9'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      await allocateCredits(Number(user.id), Number(subscription.id), 600);
      await debitCredits(Number(user.id), 100);

      // Act
      const result = await expireCredits(Number(user.id));

      // Assert
      expect(result.userId).toBe(Number(user.id));
      expect(result.creditsExpired).toBe(500);
      expect(result.newAvailableCredits).toBe(0);

      // Verify in database
      const credits = await getUserCredits(Number(user.id));
      expect(credits!.availableCredits).toBe(0);
      expect(credits!.expiredCredits).toBe(500);
      expect(credits!.usedCredits).toBe(100);
    });

    it('should handle expiration when no credits available', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test10@example.com',
          name: 'Test User 10'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      await allocateCredits(Number(user.id), Number(subscription.id), 600);
      await debitCredits(Number(user.id), 600);

      // Act
      const result = await expireCredits(Number(user.id));

      // Assert
      expect(result.creditsExpired).toBe(0);
      expect(result.newAvailableCredits).toBe(0);
    });

    it('should throw error when user has no credits record', async () => {
      // Act & Assert
      await expect(
        expireCredits(99999)
      ).rejects.toThrow('No credits found for user');
    });
  });

  describe('Credit Invariant', () => {
    it('should maintain invariant: available = total - used', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          email: 'test11@example.com',
          name: 'Test User 11'
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'semestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }
      });

      // Act - Multiple operations
      await allocateCredits(Number(user.id), Number(subscription.id), 1400);
      await debitCredits(Number(user.id), 200);
      await debitCredits(Number(user.id), 150);
      await allocateCredits(Number(user.id), Number(subscription.id), 600);
      await debitCredits(Number(user.id), 300);

      // Assert - Verify invariant
      const credits = await getUserCredits(Number(user.id));
      expect(credits!.availableCredits).toBe(
        credits!.totalCredits - credits!.usedCredits
      );
      expect(credits!.totalCredits).toBe(2000);
      expect(credits!.usedCredits).toBe(650);
      expect(credits!.availableCredits).toBe(1350);
    });
  });
});

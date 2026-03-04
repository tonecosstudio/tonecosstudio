// @ts-nocheck
/**
 * Testes para Full-Text Search no PostgreSQL
 * 
 * Este arquivo contém testes para validar a funcionalidade de busca
 * full-text implementada na task 11.2
 * 
 * Requisitos: 4.2, 11.5
 * Task: 11.2 Implementar full-text search no PostgreSQL
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Full-Text Search - PostgreSQL', () => {
  // Skip tests if not in integration test environment
  const isIntegrationTest = process.env.VITEST_INTEGRATION === 'true';
  
  describe('Migration Validation', () => {
    it('should have created idx_profiles_fulltext_search index', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('pg_indexes', {
        tablename: 'profiles',
        indexname: 'idx_profiles_fulltext_search'
      });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
    
    it('should have created idx_subscription_deliveries_fulltext_search index', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('pg_indexes', {
        tablename: 'subscription_deliveries',
        indexname: 'idx_subscription_deliveries_fulltext_search'
      });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
    
    it('should have created idx_standalone_purchases_fulltext_search index', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('pg_indexes', {
        tablename: 'standalone_purchases',
        indexname: 'idx_standalone_purchases_fulltext_search'
      });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
    
    it('should have created search_unified_orders function', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      // Try to call the function with empty query to verify it exists
      const { error } = await supabase.rpc('search_unified_orders', {
        search_query: '',
        order_type_filter: 'all'
      });
      
      // Function should exist (error might be about empty query, but not about missing function)
      expect(error?.message).not.toContain('function');
    });
  });
  
  describe('Search Functionality', () => {
    it('should search by customer name', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: 'João',
        order_type_filter: 'all'
      });
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
    
    it('should search by customer email', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: 'example.com',
        order_type_filter: 'all'
      });
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
    
    it('should search by tracking code', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: 'BR123',
        order_type_filter: 'all'
      });
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
    
    it('should filter by order type - subscription_delivery', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: 'test',
        order_type_filter: 'subscription_delivery'
      });
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      
      // All results should be subscription_delivery type
      if (data && data.length > 0) {
        data.forEach((result: any) => {
          expect(result.order_type).toBe('subscription_delivery');
        });
      }
    });
    
    it('should filter by order type - standalone_purchase', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: 'test',
        order_type_filter: 'standalone_purchase'
      });
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      
      // All results should be standalone_purchase type
      if (data && data.length > 0) {
        data.forEach((result: any) => {
          expect(result.order_type).toBe('standalone_purchase');
        });
      }
    });
    
    it('should return results with relevance ranking', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: 'test',
        order_type_filter: 'all'
      });
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      
      // Each result should have order_id, order_type, and rank
      if (data && data.length > 0) {
        data.forEach((result: any) => {
          expect(result).toHaveProperty('order_id');
          expect(result).toHaveProperty('order_type');
          expect(result).toHaveProperty('rank');
          expect(typeof result.rank).toBe('number');
        });
      }
    });
    
    it('should handle empty search query gracefully', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: '',
        order_type_filter: 'all'
      });
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0); // Empty query should return no results
    });
    
    it('should handle special characters in search query', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: 'test@example.com',
        order_type_filter: 'all'
      });
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
  
  describe('Performance', () => {
    it('should complete search in reasonable time', async () => {
      if (!isIntegrationTest) {
        console.log('Skipping integration test - set VITEST_INTEGRATION=true to run');
        return;
      }
      
      const startTime = Date.now();
      
      const { data, error } = await supabase.rpc('search_unified_orders', {
        search_query: 'test',
        order_type_filter: 'all'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});

/**
 * MANUAL TESTING INSTRUCTIONS
 * 
 * To run these tests against a real Supabase instance:
 * 
 * 1. Set up environment variables:
 *    export VITEST_INTEGRATION=true
 *    export VITE_SUPABASE_URL=your-supabase-url
 *    export VITE_SUPABASE_ANON_KEY=your-anon-key
 * 
 * 2. Apply the migration:
 *    npx supabase db push
 * 
 * 3. Run the tests:
 *    npm run test -- orders-service.test.fulltext.ts
 * 
 * 4. Verify the indexes were created:
 *    SELECT indexname, tablename 
 *    FROM pg_indexes 
 *    WHERE indexname LIKE '%fulltext%';
 * 
 * 5. Test the search function manually:
 *    SELECT * FROM search_unified_orders('João', 'all');
 */

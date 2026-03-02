/**
 * Testes Unitários para Validação de Endereço de Entrega
 * 
 * Testa a função validateDeliveryAddress() para garantir que
 * a validação de campos obrigatórios funciona corretamente.
 * 
 * Requisitos: 8.3, 8.4
 */

import { describe, it, expect } from 'vitest';
import { validateDeliveryAddress, isValidDeliveryAddress } from './orders-validator';
import type { DeliveryAddress } from '@/types/admin/orders';

describe('validateDeliveryAddress', () => {
  describe('endereços válidos', () => {
    it('deve retornar null para endereço completo', () => {
      const address: DeliveryAddress = {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brasil'
      };

      const result = validateDeliveryAddress(address);
      expect(result).toBeNull();
    });

    it('deve retornar null para endereço sem campos opcionais', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      };

      const result = validateDeliveryAddress(address);
      expect(result).toBeNull();
    });

    it('deve aceitar endereço com espaços nos campos obrigatórios', () => {
      const address: Partial<DeliveryAddress> = {
        street: '  Rua das Flores  ',
        number: '  123  ',
        city: '  São Paulo  ',
        state: '  SP  ',
        zipCode: '  01234-567  '
      };

      const result = validateDeliveryAddress(address);
      expect(result).toBeNull();
    });
  });

  describe('endereços inválidos', () => {
    it('deve retornar erro quando endereço é null', () => {
      const result = validateDeliveryAddress(null);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('address_validation_error');
      expect(result?.missingFields).toEqual(['rua', 'número', 'cidade', 'estado', 'CEP']);
      expect(result?.message).toContain('Endereço de entrega incompleto');
    });

    it('deve retornar erro quando endereço é undefined', () => {
      const result = validateDeliveryAddress(undefined);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('address_validation_error');
      expect(result?.missingFields).toEqual(['rua', 'número', 'cidade', 'estado', 'CEP']);
    });

    it('deve retornar erro quando falta rua', () => {
      const address: Partial<DeliveryAddress> = {
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      };

      const result = validateDeliveryAddress(address);
      
      expect(result).not.toBeNull();
      expect(result?.missingFields).toContain('rua');
      expect(result?.message).toContain('rua');
    });

    it('deve retornar erro quando falta número', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      };

      const result = validateDeliveryAddress(address);
      
      expect(result).not.toBeNull();
      expect(result?.missingFields).toContain('número');
    });

    it('deve retornar erro quando falta cidade', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores',
        number: '123',
        state: 'SP',
        zipCode: '01234-567'
      };

      const result = validateDeliveryAddress(address);
      
      expect(result).not.toBeNull();
      expect(result?.missingFields).toContain('cidade');
    });

    it('deve retornar erro quando falta estado', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores',
        number: '123',
        city: 'São Paulo',
        zipCode: '01234-567'
      };

      const result = validateDeliveryAddress(address);
      
      expect(result).not.toBeNull();
      expect(result?.missingFields).toContain('estado');
    });

    it('deve retornar erro quando falta CEP', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores',
        number: '123',
        city: 'São Paulo',
        state: 'SP'
      };

      const result = validateDeliveryAddress(address);
      
      expect(result).not.toBeNull();
      expect(result?.missingFields).toContain('CEP');
    });

    it('deve retornar erro quando múltiplos campos estão faltando', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores'
      };

      const result = validateDeliveryAddress(address);
      
      expect(result).not.toBeNull();
      expect(result?.missingFields).toHaveLength(4);
      expect(result?.missingFields).toContain('número');
      expect(result?.missingFields).toContain('cidade');
      expect(result?.missingFields).toContain('estado');
      expect(result?.missingFields).toContain('CEP');
    });

    it('deve rejeitar campos com strings vazias', () => {
      const address: Partial<DeliveryAddress> = {
        street: '',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      };

      const result = validateDeliveryAddress(address);
      
      expect(result).not.toBeNull();
      expect(result?.missingFields).toContain('rua');
    });

    it('deve rejeitar campos com apenas espaços em branco', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores',
        number: '   ',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      };

      const result = validateDeliveryAddress(address);
      
      expect(result).not.toBeNull();
      expect(result?.missingFields).toContain('número');
    });
  });

  describe('isValidDeliveryAddress', () => {
    it('deve retornar true para endereço válido', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      };

      expect(isValidDeliveryAddress(address)).toBe(true);
    });

    it('deve retornar false para endereço inválido', () => {
      const address: Partial<DeliveryAddress> = {
        street: 'Rua das Flores',
        city: 'São Paulo'
      };

      expect(isValidDeliveryAddress(address)).toBe(false);
    });

    it('deve retornar false para endereço null', () => {
      expect(isValidDeliveryAddress(null)).toBe(false);
    });

    it('deve retornar false para endereço undefined', () => {
      expect(isValidDeliveryAddress(undefined)).toBe(false);
    });
  });
});

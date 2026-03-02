/**
 * Testes para o módulo de sanitização de inputs
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchInput,
  validateSanitizedInput,
  sanitizeMultipleInputs,
  escapeRegexCharacters,
  sanitizeForSearch,
  sanitizeWithOptions,
} from './sanitizer';

describe('sanitizeSearchInput', () => {
  it('deve remover tags HTML', () => {
    const input = '<script>alert("xss")</script>João';
    const result = sanitizeSearchInput(input);
    expect(result).toBe('João');
  });

  it('deve remover padrões de SQL injection - SELECT', () => {
    const input = "João'; SELECT * FROM users--";
    const result = sanitizeSearchInput(input);
    expect(result).not.toContain('SELECT');
    expect(result).not.toContain('--');
  });

  it('deve remover padrões de SQL injection - DROP TABLE', () => {
    const input = "'; DROP TABLE users--";
    const result = sanitizeSearchInput(input);
    expect(result).not.toContain('DROP');
    expect(result).not.toContain('TABLE');
  });

  it('deve remover padrões de SQL injection - UNION', () => {
    const input = "' UNION SELECT password FROM users--";
    const result = sanitizeSearchInput(input);
    expect(result).not.toContain('UNION');
    expect(result).not.toContain('SELECT');
  });

  it('deve remover comentários SQL', () => {
    const input = 'João -- comentário';
    const result = sanitizeSearchInput(input);
    expect(result).not.toContain('--');
  });

  it('deve remover aspas simples e duplas', () => {
    const input = `João "Silva" 'Santos'`;
    const result = sanitizeSearchInput(input);
    expect(result).not.toContain('"');
    expect(result).not.toContain("'");
  });

  it('deve normalizar espaços em branco', () => {
    const input = '  João    Silva  ';
    const result = sanitizeSearchInput(input);
    expect(result).toBe('João Silva');
  });

  it('deve limitar o comprimento a 100 caracteres', () => {
    const input = 'a'.repeat(150);
    const result = sanitizeSearchInput(input);
    expect(result.length).toBe(100);
  });

  it('deve retornar string vazia para input vazio', () => {
    expect(sanitizeSearchInput('')).toBe('');
  });

  it('deve retornar string vazia para input null/undefined', () => {
    expect(sanitizeSearchInput(null as any)).toBe('');
    expect(sanitizeSearchInput(undefined as any)).toBe('');
  });

  it('deve preservar texto normal', () => {
    const input = 'João Silva';
    const result = sanitizeSearchInput(input);
    expect(result).toBe('João Silva');
  });

  it('deve preservar emails', () => {
    const input = 'joao@example.com';
    const result = sanitizeSearchInput(input);
    expect(result).toContain('joao');
    expect(result).toContain('example.com');
  });

  it('deve preservar números', () => {
    const input = '12345';
    const result = sanitizeSearchInput(input);
    expect(result).toBe('12345');
  });

  it('deve remover múltiplos padrões perigosos', () => {
    const input = '<script>alert(1)</script>; DROP TABLE users; SELECT * FROM passwords--';
    const result = sanitizeSearchInput(input);
    expect(result).not.toContain('script');
    expect(result).not.toContain('DROP');
    expect(result).not.toContain('SELECT');
    expect(result).not.toContain('--');
  });
});

describe('validateSanitizedInput', () => {
  it('deve detectar quando input foi completamente removido', () => {
    const input = '<script>alert(1)</script>';
    const sanitized = '';
    const result = validateSanitizedInput(input, sanitized);
    expect(result.safe).toBe(false);
    expect(result.modified).toBe(true);
    expect(result.reason).toContain('apenas caracteres não permitidos');
  });

  it('deve detectar quando input foi significativamente modificado', () => {
    const input = 'João<script>alert(1)</script><script>alert(2)</script>';
    const sanitized = 'João';
    const result = validateSanitizedInput(input, sanitized);
    expect(result.safe).toBe(true);
    expect(result.modified).toBe(true);
    expect(result.reason).toContain('significativamente modificado');
  });

  it('deve retornar safe para input não modificado', () => {
    const input = 'João Silva';
    const sanitized = 'João Silva';
    const result = validateSanitizedInput(input, sanitized);
    expect(result.safe).toBe(true);
    expect(result.modified).toBe(false);
    expect(result.reason).toBeUndefined();
  });
});

describe('sanitizeMultipleInputs', () => {
  it('deve sanitizar múltiplos inputs', () => {
    const inputs = [
      'João',
      '<script>alert(1)</script>',
      "'; DROP TABLE users--",
      'Maria',
    ];
    const results = sanitizeMultipleInputs(inputs);
    expect(results[0]).toBe('João');
    expect(results[1]).toBe('');
    expect(results[2]).not.toContain('DROP');
    expect(results[3]).toBe('Maria');
  });
});

describe('escapeRegexCharacters', () => {
  it('deve escapar caracteres especiais de regex', () => {
    const input = 'user@example.com';
    const result = escapeRegexCharacters(input);
    // @ não precisa ser escapado em regex, mas . sim
    expect(result).toContain('\\.');
    expect(result).toContain('@'); // @ não é escapado
  });

  it('deve escapar parênteses', () => {
    const input = 'test(123)';
    const result = escapeRegexCharacters(input);
    expect(result).toContain('\\(');
    expect(result).toContain('\\)');
  });

  it('deve escapar colchetes', () => {
    const input = 'test[123]';
    const result = escapeRegexCharacters(input);
    expect(result).toContain('\\[');
    expect(result).toContain('\\]');
  });
});

describe('sanitizeForSearch', () => {
  it('deve sanitizar e converter para lowercase', () => {
    const input = '  JOÃO  Silva  ';
    const result = sanitizeForSearch(input);
    expect(result).toBe('joão silva');
  });

  it('deve remover padrões perigosos e converter para lowercase', () => {
    const input = "João'; DROP TABLE users--";
    const result = sanitizeForSearch(input);
    expect(result).not.toContain('drop');
    expect(result).not.toContain('table');
  });
});

describe('sanitizeWithOptions', () => {
  it('deve respeitar maxLength customizado', () => {
    const input = 'a'.repeat(100);
    const result = sanitizeWithOptions(input, { maxLength: 50 });
    expect(result.length).toBe(50);
  });

  it('deve permitir desabilitar remoção de SQL patterns', () => {
    const input = 'SELECT João';
    const result = sanitizeWithOptions(input, { removeSQLPatterns: false });
    expect(result).toContain('SELECT');
  });

  it('deve permitir desabilitar remoção de HTML', () => {
    const input = '<b>João</b>';
    const result = sanitizeWithOptions(input, { removeHTML: false });
    // Nota: DOMPurify ainda pode processar, mas não removerá completamente
    expect(result).toContain('João');
  });

  it('deve permitir desabilitar normalização de whitespace', () => {
    const input = '  João  Silva  ';
    const result = sanitizeWithOptions(input, { normalizeWhitespace: false });
    expect(result).toContain('  ');
  });

  it('deve usar valores padrão quando opções não são fornecidas', () => {
    const input = '<script>alert(1)</script>João';
    const result = sanitizeWithOptions(input);
    expect(result).toBe('João');
  });
});

describe('Casos de teste de segurança', () => {
  it('deve prevenir SQL injection básico', () => {
    const attacks = [
      "' OR '1'='1",
      "admin'--",
      "' OR 1=1--",
      "'; DROP TABLE users--",
      "1' UNION SELECT NULL--",
    ];

    attacks.forEach(attack => {
      const result = sanitizeSearchInput(attack);
      expect(result).not.toContain('OR');
      expect(result).not.toContain('UNION');
      expect(result).not.toContain('DROP');
      expect(result).not.toContain('--');
    });
  });

  it('deve prevenir XSS básico', () => {
    const attacks = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
    ];

    attacks.forEach(attack => {
      const result = sanitizeSearchInput(attack);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('<svg');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('javascript:');
    });
  });

  it('deve prevenir ataques de timing (SLEEP, BENCHMARK)', () => {
    const attacks = [
      "'; SLEEP(5)--",
      "'; BENCHMARK(1000000,MD5('test'))--",
    ];

    attacks.forEach(attack => {
      const result = sanitizeSearchInput(attack);
      expect(result).not.toContain('SLEEP');
      expect(result).not.toContain('BENCHMARK');
    });
  });
});

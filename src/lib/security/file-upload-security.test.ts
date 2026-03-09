/**
 * File Upload Security Tests
 * 
 * Tests that dangerous file types are rejected, oversized files are blocked,
 * and MIME type mismatches are caught.
 */

import { describe, it, expect } from 'vitest';
import {
  validateFileUpload,
  sanitizeFilename,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  DANGEROUS_EXTENSIONS,
} from './input-sanitizer';

// Helper to create a mock File
function createMockFile(name: string, size: number, type: string): File {
  const content = new Uint8Array(Math.min(size, 64)); // Don't allocate huge buffers
  const file = new File([content], name, { type });
  // Override size for testing
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('File Upload Security', () => {
  // ─── Dangerous File Type Rejection ──────────────────────────────

  describe('Dangerous file type rejection', () => {
    const dangerousFiles = [
      { name: 'malware.exe', type: 'application/x-msdownload' },
      { name: 'script.js', type: 'application/javascript' },
      { name: 'page.html', type: 'text/html' },
      { name: 'vector.svg', type: 'image/svg+xml' },
      { name: 'macro.docm', type: 'application/vnd.ms-word.document.macroEnabled.12' },
      { name: 'shell.sh', type: 'application/x-sh' },
      { name: 'batch.bat', type: 'application/x-bat' },
      { name: 'python.py', type: 'text/x-python' },
      { name: 'php.php', type: 'application/x-php' },
      { name: 'app.hta', type: 'application/hta' },
    ];

    dangerousFiles.forEach(({ name, type }) => {
      it(`rejects ${name} (.${name.split('.').pop()})`, () => {
        const file = createMockFile(name, 1024, type);
        const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('perigoso');
      });
    });
  });

  // ─── Renamed Dangerous Files (Double Extension) ─────────────────

  describe('Double extension attacks', () => {
    it('rejects image.jpg.exe', () => {
      const file = createMockFile('image.jpg.exe', 1024, 'image/jpeg');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
    });

    it('rejects photo.png.html', () => {
      const file = createMockFile('photo.png.html', 1024, 'image/png');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
    });

    it('rejects document.pdf.php', () => {
      const file = createMockFile('document.pdf.php', 1024, 'application/pdf');
      const result = validateFileUpload(file, ['application/pdf'], MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
    });

    it('rejects file.jpg.svg', () => {
      const file = createMockFile('file.jpg.svg', 1024, 'image/jpeg');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
    });
  });

  // ─── MIME Type Mismatch ─────────────────────────────────────────

  describe('MIME type / extension mismatch', () => {
    it('rejects .png file claiming to be image/jpeg', () => {
      const file = createMockFile('photo.png', 1024, 'image/jpeg');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('MIME');
    });

    it('rejects .jpg file claiming to be image/png', () => {
      const file = createMockFile('photo.jpg', 1024, 'image/png');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
    });
  });

  // ─── File Size Limits ───────────────────────────────────────────

  describe('File size limits', () => {
    it('rejects files exceeding max size', () => {
      const file = createMockFile('huge.jpg', 15 * 1024 * 1024, 'image/jpeg');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('grande');
    });

    it('rejects empty files (0 bytes)', () => {
      const file = createMockFile('empty.jpg', 0, 'image/jpeg');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('vazio');
    });

    it('accepts files within size limit', () => {
      const file = createMockFile('ok.jpg', 1024, 'image/jpeg');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(true);
    });
  });

  // ─── Files Without Extension ────────────────────────────────────

  describe('Files without extension', () => {
    it('rejects files with no extension', () => {
      const file = createMockFile('noextension', 1024, 'image/jpeg');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(false);
    });
  });

  // ─── Valid Files ────────────────────────────────────────────────

  describe('Valid files accepted', () => {
    it('accepts valid JPEG', () => {
      const file = createMockFile('photo.jpg', 2048, 'image/jpeg');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(true);
    });

    it('accepts valid PNG', () => {
      const file = createMockFile('image.png', 4096, 'image/png');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(true);
    });

    it('accepts valid WebP', () => {
      const file = createMockFile('pic.webp', 1024, 'image/webp');
      const result = validateFileUpload(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
      expect(result.valid).toBe(true);
    });
  });

  // ─── Filename Sanitization ──────────────────────────────────────

  describe('Filename sanitization', () => {
    it('removes path traversal attempts', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
    });

    it('removes special characters', () => {
      const result = sanitizeFilename('file<script>.jpg');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('removes leading dots (hidden files)', () => {
      const result = sanitizeFilename('.htaccess');
      expect(result).not.toMatch(/^\./);
    });

    it('handles spaces by converting to underscores', () => {
      const result = sanitizeFilename('my photo file.jpg');
      expect(result).not.toContain(' ');
      expect(result).toContain('_');
    });

    it('preserves valid filenames', () => {
      expect(sanitizeFilename('valid-file_name.jpg')).toBe('valid-file_name.jpg');
    });
  });

  // ─── DANGEROUS_EXTENSIONS completeness ──────────────────────────

  describe('DANGEROUS_EXTENSIONS blocklist', () => {
    const criticalExtensions = ['exe', 'html', 'svg', 'js', 'php', 'sh', 'bat', 'hta', 'docm'];
    
    criticalExtensions.forEach(ext => {
      it(`blocklist includes .${ext}`, () => {
        expect((DANGEROUS_EXTENSIONS as readonly string[]).includes(ext)).toBe(true);
      });
    });
  });
});

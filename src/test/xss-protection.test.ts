import { describe, it, expect } from 'vitest';
import { 
  sanitizeGroupMessage, 
  sanitizeGroupName, 
  sanitizeText,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeProfile
} from '@/lib/utils/sanitize';

describe('XSS Protection - Group Messages', () => {
  it('should remove script tags from messages', () => {
    const dirty = 'Hello <script>alert("XSS")</script> world';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toBe('Hello  world');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
  });

  it('should remove img onerror from messages', () => {
    const dirty = 'Hello <img src=x onerror="alert(\'XSS\')">';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toBe('Hello ');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('alert');
  });

  it('should remove iframe tags', () => {
    const dirty = 'Hello <iframe src="javascript:alert(\'XSS\')"></iframe>';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toBe('Hello ');
    expect(clean).not.toContain('<iframe>');
  });

  it('should remove svg onload', () => {
    const dirty = 'Hello <svg onload="alert(\'XSS\')"></svg>';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toBe('Hello ');
    expect(clean).not.toContain('onload');
  });

  it('should allow safe formatting tags', () => {
    const dirty = 'Hello <b>bold</b> and <i>italic</i> and <em>emphasis</em>';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toContain('<b>bold</b>');
    expect(clean).toContain('<i>italic</i>');
    expect(clean).toContain('<em>emphasis</em>');
  });

  it('should allow br tags', () => {
    const dirty = 'Line 1<br>Line 2';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toContain('<br>');
  });

  it('should remove dangerous attributes from allowed tags', () => {
    const dirty = '<b onclick="alert(\'XSS\')">Click me</b>';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toContain('<b>Click me</b>');
    expect(clean).not.toContain('onclick');
  });

  it('should handle empty input', () => {
    expect(sanitizeGroupMessage('')).toBe('');
    expect(sanitizeGroupMessage(null as any)).toBe('');
    expect(sanitizeGroupMessage(undefined as any)).toBe('');
  });

  it('should handle nested malicious tags', () => {
    const dirty = '<b><script>alert("XSS")</script>Bold</b>';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toContain('<b>');
    expect(clean).toContain('Bold');
    expect(clean).not.toContain('<script>');
  });
});

describe('XSS Protection - Group Names', () => {
  it('should remove all HTML from group names', () => {
    const dirty = 'Group <script>alert("XSS")</script>';
    const clean = sanitizeGroupName(dirty);
    expect(clean).toBe('Group ');
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
  });

  it('should remove formatting tags from group names', () => {
    const dirty = 'Group <b>Name</b>';
    const clean = sanitizeGroupName(dirty);
    expect(clean).toBe('Group Name');
    expect(clean).not.toContain('<b>');
  });

  it('should handle special characters', () => {
    const dirty = 'Group & Company <> Test';
    const clean = sanitizeGroupName(dirty);
    expect(clean).toContain('Group');
    expect(clean).toContain('Company');
  });
});

describe('XSS Protection - URLs', () => {
  it('should block javascript: URIs', () => {
    const dirty = 'javascript:alert("XSS")';
    const clean = sanitizeUrl(dirty);
    expect(clean).toBe('');
  });

  it('should block data: URIs', () => {
    const dirty = 'data:text/html,<script>alert("XSS")</script>';
    const clean = sanitizeUrl(dirty);
    expect(clean).toBe('');
  });

  it('should block vbscript: URIs', () => {
    const dirty = 'vbscript:msgbox("XSS")';
    const clean = sanitizeUrl(dirty);
    expect(clean).toBe('');
  });

  it('should allow https URLs', () => {
    const clean = sanitizeUrl('https://example.com');
    expect(clean).toBe('https://example.com');
  });

  it('should allow http URLs', () => {
    const clean = sanitizeUrl('http://example.com');
    expect(clean).toBe('http://example.com');
  });

  it('should handle empty URLs', () => {
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl(null as any)).toBe('');
  });
});

describe('XSS Protection - Text', () => {
  it('should remove all HTML tags', () => {
    const dirty = 'Hello <b>world</b> <script>alert("XSS")</script>';
    const clean = sanitizeText(dirty);
    expect(clean).toBe('Hello world ');
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
  });

  it('should handle entities', () => {
    const dirty = 'Hello &lt;world&gt;';
    const clean = sanitizeText(dirty);
    expect(clean).toContain('Hello');
  });
});

describe('XSS Protection - HTML', () => {
  it('should allow safe HTML with links', () => {
    const dirty = '<p>Hello <a href="https://example.com">world</a></p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<p>');
    expect(clean).toContain('<a href="https://example.com">');
    expect(clean).toContain('world');
  });

  it('should remove dangerous link attributes', () => {
    const dirty = '<a href="https://example.com" onclick="alert(\'XSS\')">Click</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('href="https://example.com"');
    expect(clean).not.toContain('onclick');
  });

  it('should block javascript: in links', () => {
    const dirty = '<a href="javascript:alert(\'XSS\')">Click</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('javascript:');
  });
});

describe('XSS Protection - Profile Data', () => {
  it('should sanitize full_name', () => {
    const dirty = {
      full_name: 'John <script>alert("XSS")</script> Doe',
      bio: 'Hello <b>world</b>',
    };
    const clean = sanitizeProfile(dirty);
    expect(clean.full_name).toBe('John  Doe');
    expect(clean.full_name).not.toContain('<script>');
  });

  it('should sanitize bio with allowed formatting', () => {
    const dirty = {
      full_name: 'John Doe',
      bio: 'Hello <b>world</b> <script>alert("XSS")</script>',
    };
    const clean = sanitizeProfile(dirty);
    expect(clean.bio).toContain('<b>world</b>');
    expect(clean.bio).not.toContain('<script>');
  });

  it('should handle undefined fields', () => {
    const dirty = { other_field: 'test' };
    const clean = sanitizeProfile(dirty);
    expect(clean.full_name).toBeUndefined();
    expect(clean.bio).toBeUndefined();
    expect(clean.other_field).toBe('test');
  });
});

describe('XSS Protection - Edge Cases', () => {
  it('should handle very long input', () => {
    const dirty = '<script>' + 'A'.repeat(10000) + '</script>';
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean.length).toBeLessThan(dirty.length);
  });

  it('should handle unicode characters', () => {
    const dirty = 'Hello 世界 <script>alert("XSS")</script>';
    const clean = sanitizeText(dirty);
    expect(clean).toContain('世界');
    expect(clean).not.toContain('<script>');
  });

  it('should handle emoji', () => {
    const dirty = 'Hello 👋 <script>alert("XSS")</script>';
    const clean = sanitizeText(dirty);
    expect(clean).toContain('👋');
    expect(clean).not.toContain('<script>');
  });

  it('should handle malformed HTML', () => {
    const dirty = '<b>Bold <i>Italic</b></i>';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).not.toContain('<script>');
  });

  it('should handle case variations', () => {
    const dirty = '<SCRIPT>alert("XSS")</SCRIPT>';
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain('SCRIPT');
    expect(clean).not.toContain('alert');
  });

  it('should handle encoded scripts', () => {
    const dirty = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
    const clean = sanitizeText(dirty);
    // Encoded entities are safe - they won't execute as scripts
    // DOMPurify preserves them as text, which is correct behavior
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('</script>');
  });
});

describe('XSS Protection - Real World Payloads', () => {
  const xssPayloads = [
    '<script>alert(String.fromCharCode(88,83,83))</script>',
    '<img src=x onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>',
    '<textarea onfocus=alert(1) autofocus>',
    '<marquee onstart=alert(1)>',
    '<div style="background:url(javascript:alert(1))">',
  ];

  xssPayloads.forEach((payload, index) => {
    it(`should block XSS payload ${index + 1}`, () => {
      const clean = sanitizeText(payload);
      expect(clean).not.toContain('alert');
      expect(clean).not.toContain('javascript:');
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('onload');
      expect(clean).not.toContain('onfocus');
      expect(clean).not.toContain('onstart');
    });
  });
});

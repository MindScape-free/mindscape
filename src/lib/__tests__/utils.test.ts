import { cn, cleanCitations, formatText } from '../utils';

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });

    it('should filter falsy values', () => {
      const result = cn('foo', false, null, undefined, '', 'bar');
      expect(result).toBe('foo bar');
    });
  });

  describe('cleanCitations', () => {
    it('should remove citation brackets', () => {
      const text = 'This is a test [1] with citations [2][3].';
      const result = cleanCitations(text);
      expect(result).toBe('This is a test  with citations .');
    });

    it('should handle text without citations', () => {
      const text = 'Plain text without citations.';
      const result = cleanCitations(text);
      expect(result).toBe(text);
    });

    it('should handle empty string', () => {
      const result = cleanCitations('');
      expect(result).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(cleanCitations(null as unknown as string)).toBe('');
    });
  });

  describe('formatText', () => {
    it('should handle empty string', () => {
      const result = formatText('');
      expect(result).toBe('');
    });

    it('should escape HTML tags', () => {
      const result = formatText('<script>alert("xss")</script>');
      expect(result).toContain('&lt;');
      expect(result).not.toContain('<script>');
    });

    it('should convert markdown bold', () => {
      const result = formatText('This is **bold** text');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should handle headings', () => {
      const result = formatText('# Heading 1\n## Heading 2');
      expect(result).toContain('<h1>');
      expect(result).toContain('<h2>');
    });
  });
});

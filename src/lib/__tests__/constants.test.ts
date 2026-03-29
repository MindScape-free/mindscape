import {
  MAP_MODE,
  AI_PERSONA,
  DEPTH_LEVEL,
  FILE_TYPES,
  CHAT_ROLE,
  MESSAGE_TYPE,
  EXPLANATION_MODE,
  VIEW_MODE,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  API_ENDPOINTS
} from '../constants';

describe('Constants', () => {
  describe('MAP_MODE', () => {
    it('should have correct values', () => {
      expect(MAP_MODE.SINGLE).toBe('single');
      expect(MAP_MODE.COMPARE).toBe('compare');
      expect(MAP_MODE.MULTI).toBe('multi');
    });

    it('should have as const assertion', () => {
      expect(MAP_MODE).toEqual({
        SINGLE: 'single',
        COMPARE: 'compare',
        MULTI: 'multi'
      });
    });
  });

  describe('AI_PERSONA', () => {
    it('should have all persona types', () => {
      expect(AI_PERSONA.TEACHER).toBe('teacher');
      expect(AI_PERSONA.CONCISE).toBe('concise');
      expect(AI_PERSONA.CREATIVE).toBe('creative');
      expect(AI_PERSONA.SAGE).toBe('sage');
    });
  });

  describe('DEPTH_LEVEL', () => {
    it('should have all depth levels including auto', () => {
      expect(DEPTH_LEVEL.LOW).toBe('low');
      expect(DEPTH_LEVEL.MEDIUM).toBe('medium');
      expect(DEPTH_LEVEL.DEEP).toBe('deep');
      expect(DEPTH_LEVEL.AUTO).toBe('auto');
    });

    it('should use auto as default', () => {
      expect(DEFAULT_SETTINGS.DEPTH).toBe('auto');
    });
  });

  describe('FILE_TYPES', () => {
    it('should have all file types', () => {
      expect(FILE_TYPES.TEXT).toBe('text');
      expect(FILE_TYPES.PDF).toBe('pdf');
      expect(FILE_TYPES.IMAGE).toBe('image');
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_SETTINGS.LANGUAGE).toBe('en');
      expect(DEFAULT_SETTINGS.MAP_VIEW).toBe('accordion');
      expect(DEFAULT_SETTINGS.AUTO_SAVE_INTERVAL).toBe(30000);
      expect(DEFAULT_SETTINGS.MAX_PDF_SIZE_MB).toBe(10);
      expect(DEFAULT_SETTINGS.MAX_IMAGE_SIZE_MB).toBe(2);
    });

    it('should have storage limits', () => {
      expect(DEFAULT_SETTINGS.SESSION_STORAGE_LIMIT_MB).toBe(4);
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have all required endpoints', () => {
      expect(API_ENDPOINTS.SCRAPE_URL).toBe('/api/scrape-url');
      expect(API_ENDPOINTS.YOUTUBE_TRANSCRIPT).toBe('/api/youtube-transcript');
      expect(API_ENDPOINTS.GENERATE_IMAGE).toBe('/api/generate-image');
    });
  });
});

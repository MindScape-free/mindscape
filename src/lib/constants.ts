export const MAP_MODE = {
  SINGLE: 'single',
  COMPARE: 'compare',
  MULTI: 'multi'
} as const;

export type MapMode = typeof MAP_MODE[keyof typeof MAP_MODE];

export const AI_PERSONA = {
  TEACHER: 'teacher',
  CONCISE: 'concise',
  CREATIVE: 'creative',
  SAGE: 'sage'
} as const;

export type AIPersona = typeof AI_PERSONA[keyof typeof AI_PERSONA];

export const DEPTH_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  DEEP: 'deep',
  AUTO: 'auto'
} as const;

export type DepthLevel = typeof DEPTH_LEVEL[keyof typeof DEPTH_LEVEL];

export const FILE_TYPES = {
  TEXT: 'text',
  PDF: 'pdf',
  IMAGE: 'image'
} as const;

export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];

export const CHAT_ROLE = {
  USER: 'user',
  AI: 'ai'
} as const;

export type ChatRole = typeof CHAT_ROLE[keyof typeof CHAT_ROLE];

export const MESSAGE_TYPE = {
  TEXT: 'text',
  QUIZ: 'quiz',
  QUIZ_RESULT: 'quiz-result',
  QUIZ_SELECTOR: 'quiz-selector',
  FILE: 'file'
} as const;

export type MessageType = typeof MESSAGE_TYPE[keyof typeof MESSAGE_TYPE];

export const EXPLANATION_MODE = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  EXPERT: 'Expert'
} as const;

export type ExplanationMode = typeof EXPLANATION_MODE[keyof typeof EXPLANATION_MODE];

export const VIEW_MODE = {
  ACCORDION: 'accordion',
  RADIAL: 'radial',
  ROADMAP: 'roadmap',
  COMPARE: 'compare'
} as const;

export type ViewMode = typeof VIEW_MODE[keyof typeof VIEW_MODE];

export const DEFAULT_SETTINGS = {
  DEPTH: 'auto' as DepthLevel,
  PERSONA: 'teacher' as AIPersona,
  LANGUAGE: 'en',
  MAP_VIEW: 'accordion' as ViewMode,
  AUTO_SAVE_INTERVAL: 30000,
  MAX_PDF_SIZE_MB: 10,
  MAX_IMAGE_SIZE_MB: 2,
  SESSION_STORAGE_LIMIT_MB: 4
} as const;

export const STORAGE_KEYS = {
  SESSION_TYPE: 'session-type-',
  SESSION_CONTENT: 'session-content-',
  SESSION_PERSONA: 'session-persona-',
  WELCOME_BACK: 'welcome_back'
} as const;

export const API_ENDPOINTS = {
  SCRAPE_URL: '/api/scrape-url',
  YOUTUBE_TRANSCRIPT: '/api/youtube-transcript',
  GENERATE_IMAGE: '/api/generate-image',
  GENERATE_AUDIO: '/api/generate-audio',
  ADMIN_SYNC: '/api/admin-sync'
} as const;

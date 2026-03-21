
/**
 * Defines the structure for a language object.
 * @interface Language
 * @property {string} name - The full name of the language (e.g., "English").
 * @property {string} code - The two-letter ISO 639-1 code for the language (e.g., "en").
 */
export interface Language {
  name: string;
  code: string;
}

/**
 * A list of languages supported by the application for translation.
 * @const {Language[]}
 */
export const languages: Language[] = [
  { name: 'Arabic', code: 'ar' },
  { name: 'Chinese', code: 'zh' },
  { name: 'Dutch', code: 'nl' },
  { name: 'English', code: 'en' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Italian', code: 'it' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Korean', code: 'ko' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Russian', code: 'ru' },
  { name: 'Sanskrit', code: 'sa' },
  { name: 'Spanish', code: 'es' },
];

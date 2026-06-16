/**
 * Minimal cheerio mock for Jest environments.
 *
 * cheerio v1+ is ESM-only (uses `export` syntax), which Jest cannot parse
 * without specialized transform configuration. This mock provides just enough
 * of the cheerio API surface for modules that import it transitively.
 *
 * Used via jest.config.ts `moduleNameMapper`:
 *   '^cheerio$': '<rootDir>/src/__tests__/helpers/cheerio-mock.ts'
 */

function load(content: string, options?: any): any {
  return {
    _content: content,
    _options: options,
    find: () => ({ text: () => '', each: () => {} }),
    text: () => '',
    html: () => content,
    each: () => {},
  };
}

const cheerio = {
  load,
  /**
   * Additional static methods that may be used by transitive dependencies.
   * Add more as needed.
   */
  html: (dom: any) => dom?.html?.() || '',
  text: (dom: any) => dom?.text?.() || '',
};

export default cheerio;
export { load };

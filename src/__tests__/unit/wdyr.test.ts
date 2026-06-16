/**
 * Tests for src/lib/wdyr.ts — dev-only React render monitoring.
 *
 * The module is a side-effect-only module: it patches React with
 * why-did-you-render only when process.env.NODE_ENV === 'development'.
 * In production/staging/test it must be a complete no-op.
 */

// We need a mock factory that jest.mock can see at the top level.
// The actual mock implementation is set up per-test via __setMockWDYR.
const mockWDYR = jest.fn();
jest.mock('@welldone-software/why-did-you-render', () => mockWDYR, { virtual: true });

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

// Helper to safely set NODE_ENV in tests (TypeScript sees it as read-only)
const setNodeEnv = (value: string) => {
  (process.env as Record<string, string>).NODE_ENV = value;
};

beforeEach(() => {
  jest.resetModules();
  mockWDYR.mockClear();
});

afterAll(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe('wdyr.ts environment guards', () => {
  it('does NOT import or activate why-did-you-render when NODE_ENV is production', () => {
    setNodeEnv('production');

    // Import the module — it will evaluate immediately
    require('@/lib/wdyr');

    // wdyr should NOT have been called
    expect(mockWDYR).not.toHaveBeenCalled();
  });

  it('does NOT activate when NODE_ENV is test', () => {
    setNodeEnv('test');

    require('@/lib/wdyr');

    expect(mockWDYR).not.toHaveBeenCalled();
  });

  it('activates why-did-you-render with React and expected options when NODE_ENV is development', () => {
    setNodeEnv('development');

    // Import React so we can assert it was passed to the mock
    const React = require('react');

    require('@/lib/wdyr');

    expect(mockWDYR).toHaveBeenCalledTimes(1);
    expect(mockWDYR).toHaveBeenCalledWith(
      React,
      expect.objectContaining({
        trackAllPureComponents: true,
        logOnDifferentValues: true,
        trackHooks: true,
        logOwnerReasons: true,
        collapseGroups: true,
      })
    );
  });

  it('includes all components by default and excludes known boilerplate', () => {
    setNodeEnv('development');

    require('@/lib/wdyr');

    const config = mockWDYR.mock.calls[0][1];
    expect(config.include).toEqual([/.*/]);
    expect(config.exclude).toEqual([
      /^Toaster/,
      /^Tooltip/,
      /^Toast/,
      /^Notification/,
      /^NodeJS/,
    ]);
  });
});

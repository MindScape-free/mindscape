/**
 * Home page hero smoke test — locks in behaviors that were previously broken:
 *
 *   1. Topic input is wired to `setTopic` (typing updates the controlled value)
 *      — previously it referenced an undefined `handleTopicChange`.
 *   2. Multi-source mode renders `SourcePillList` with the active sources
 *      — previously `SourcePillList` was used but never imported.
 *   3. Depth defaults to 'auto', and auto-depth resolution calls
 *      `resolveDepthWithConfidence(topic)` before navigating to /canvas
 *      — previously that function was used but never imported.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomeClient from '@/app/HomeClient';

// ── Shared mock state (jest.mock factories may only close over vars prefixed 'mock') ──

const mockPush = jest.fn();
const mockToast = jest.fn();
const mockSources: any[] = [];
const mockBuildPayload = jest.fn();
const mockResolveDepth = jest.fn().mockReturnValue({
  depth: 'deep',
  confidence: 85,
  reasons: ['test fixture'],
  suggestedItems: { min: 10, max: 20, label: 'Deep' },
});

// ── next/navigation (overrides the jest.setup global mock with a shared push) ──

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({ get: jest.fn() }),
  usePathname: () => '/',
}));

// ── Contexts / hooks HomeClient depends on ─────────────────────────────────

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    toasts: [],
    dismiss: jest.fn(),
  }),
}));

jest.mock('@/lib/auth-context', () => ({
  useUser: () => ({ user: { id: 'user-1' }, isUserLoading: false }),
}));

jest.mock('@/contexts/ai-config-context', () => ({
  useAIConfig: () => ({
    config: {
      provider: 'pollinations',
      pollinationsApiKey: 'test-key', // makes isSetupComplete true for submit tests
      openrouterApiKey: '',
      nvidiaApiKey: '',
      temperature: 0.7,
      topP: 0.9,
      pollenBalance: null,
    },
    updateConfig: jest.fn(),
    resetConfig: jest.fn(),
    pollenBalance: null,
    isBalanceLoading: false,
    refreshBalance: jest.fn(),
  }),
}));

jest.mock('@/lib/supabase-db', () => ({
  getSupabaseClient: () => ({}),
}));

jest.mock('@/lib/tracker', () => ({
  trackGenerationStart: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  safeSetItem: jest.fn(),
}));

jest.mock('@/lib/pdf-processor', () => ({
  parsePdfContent: jest.fn(),
}));

jest.mock('@/lib/image-processor', () => ({
  resizeImage: jest.fn(),
}));

// Auto-depth resolution — return a fixed suggestion so we can assert the call
jest.mock('@/lib/depth-analysis', () => ({
  resolveDepthWithConfidence: (...args: any[]) => mockResolveDepth(...args),
}));

// ── useMultiSource — controlled source list (SourcePillList reads `sources`) ──

jest.mock('@/hooks/use-multi-source', () => ({
  useMultiSource: () => ({
    sources: mockSources,
    addSource: jest.fn(),
    addFile: jest.fn(),
    removeSource: jest.fn(),
    clearSources: jest.fn(),
    buildPayload: mockBuildPayload,
    isProcessing: false,
    canGenerate: mockSources.filter((s: any) => s.status === 'ready').length >= 1,
    contextUsage: 0,
  }),
}));

// ── Child components (mock to keep the hero focused) ───────────────────────

jest.mock('@/components/mind-map/MultiSourceInput', () => ({
  MultiSourceInput: (props: any) => (
    <div data-testid="multi-source-input">
      <button onClick={() => props.onAdd?.('https://example.com')}>Add source</button>
      <button onClick={() => props.onGenerate?.()}>Generate</button>
    </div>
  ),
}));

// SourcePillList is NOT mocked — we assert the real component renders the sources.
jest.mock('@/components/ui/select', () => {
  const ActualReact = require('react');
  // Thread each Select's onValueChange through context so SelectItem clicks
  // exercise the real wiring (selecting an option updates parent state).
  const SelectCtx = ActualReact.createContext({ onValueChange: () => {} });
  return {
    Select: ({ onValueChange, children }: any) => (
      <SelectCtx.Provider value={{ onValueChange }}>{children}</SelectCtx.Provider>
    ),
    SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ value, children }: any) => {
      const ctx = ActualReact.useContext(SelectCtx);
      return (
        <div role="option" onClick={() => ctx.onValueChange(value)}>
          {children}
        </div>
      );
    },
  };
});

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <>{children}</>,
  DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: () => null,
}));

jest.mock('@/components/onboarding-wizard', () => ({
  OnboardingWizard: () => <div data-testid="onboarding-wizard" />,
  TRIGGER_ONBOARDING_EVENT: 'mindscape:onboarding',
}));

jest.mock('@/components/error-boundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/home/section-container', () => ({
  SectionContainer: ({ children }: any) => <section>{children}</section>,
}));

jest.mock('@/components/home/process-step', () => ({
  ProcessStep: () => <div data-testid="process-step" />,
}));

jest.mock('@/components/home/quick-start-grid', () => ({
  QuickStartGrid: () => <div data-testid="quick-start" />,
}));

jest.mock('@/components/home/daily-challenge-widget', () => ({
  DailyChallengeWidget: () => <div data-testid="daily-challenge" />,
}));

jest.mock('@/components/home/recent-maps', () => ({
  RecentMaps: () => <div data-testid="recent-maps" />,
}));

jest.mock('@/components/home/stats-counter', () => ({
  StatsCounter: () => <div data-testid="stats-counter" />,
}));

jest.mock('@/components/home/source-type-cards', () => ({
  SourceTypeCards: () => <div data-testid="source-type-cards" />,
}));

jest.mock('@/components/home/faq-section', () => ({
  FAQSection: () => <div data-testid="faq" />,
}));

// ── Heavy deps ─────────────────────────────────────────────────────────────

jest.mock('framer-motion', () => {
  const ActualReact = require('react');
  // IMPORTANT: create the component ONCE and return the same identity from the
  // Proxy. A fresh forwardRef per render would make React see a different
  // element.type each render, unmounting/remounting the motion.div subtree on
  // every re-render — which detaches DOM node references captured earlier in
  // a test (causing keyDown on a stale node to silently no-op).
  const MotionComponent = ActualReact.forwardRef((props: any, ref: any) => {
    const { initial, animate, exit, whileHover, whileTap, layout, layoutId, transition, variants, viewport, ...rest } = props;
    return ActualReact.createElement('div', { ...rest, ref });
  });
  MotionComponent.displayName = 'MotionComponent';
  return {
    motion: new Proxy({}, { get: () => MotionComponent }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('lucide-react', () => {
  const iconProxy = new Proxy({}, {
    get: () => {
      const Icon = (props: any) => {
        const { size, className, ...rest } = props;
        return <svg data-testid="mock-icon" {...rest} />;
      };
      Icon.displayName = 'LucideIcon';
      return Icon;
    },
  });
  return iconProxy;
});

jest.mock('next/dynamic', () => {
  return () => {
    // ChatPanel receives isOpen/onClose/topic — don't leak them onto the DOM
    const LazyComp = ({ isOpen: _isOpen, onClose: _onClose, topic: _topic, ...rest }: any) => (
      <div data-testid="chat-panel" {...rest} />
    );
    LazyComp.displayName = 'LazyDynamic';
    return LazyComp;
  };
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('HomeClient hero — fixed behaviors', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockToast.mockClear();
    mockResolveDepth.mockClear();
    mockBuildPayload.mockReset(); // also clears any per-test return value
    mockSources.length = 0;
  });

  it('renders the topic input and the depth selector defaults to Auto', () => {
    render(<HomeClient />);
    expect(screen.getByPlaceholderText(/Enter topic or URL/)).toBeInTheDocument();
    // Stronger than getAllByText('Auto'): the depth TRIGGER renders the label
    // resolved from `depth` state (DEPTHS.find(d => d.id === depth)?.label), so
    // it shows 'Auto' only when depth is actually wired to the 'auto' option.
    // The SelectItem list renders every option unconditionally, so matching
    // that text alone could never prove the wiring.
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument();
  });

  it('selecting a depth option updates the selector (onValueChange wiring)', () => {
    render(<HomeClient />);

    // Click the 'Detailed' option in the depth Select — routes through the
    // Select's onValueChange into setDepth.
    fireEvent.click(screen.getByRole('option', { name: 'Detailed' }));

    // Trigger label re-resolves from the new depth state — proves the
    // Select → setDepth → label pipeline is wired end-to-end, and the default
    // 'Auto' trigger is gone (queryByRole: getByRole throws when absent).
    expect(screen.getByRole('button', { name: 'Detailed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Auto' })).not.toBeInTheDocument();

    // Non-auto depth skips resolveDepthWithConfidence and navigates with the
    // selected depth — end-to-end proof the selector is wired to generation.
    const input = screen.getByPlaceholderText(/Enter topic or URL/);
    fireEvent.change(input, { target: { value: 'quantum computing' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockResolveDepth).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('depth=detailed'));
  });

  it('typing in the topic input updates the controlled value (setTopic wiring)', () => {
    render(<HomeClient />);
    const input = screen.getByPlaceholderText(/Enter topic or URL/);
    fireEvent.change(input, { target: { value: 'quantum computing' } });
    expect(input).toHaveValue('quantum computing');
  });

  it('multi-source mode renders the real SourcePillList with the active sources', () => {
    mockSources.push({
      id: 's1',
      type: 'pdf',
      label: 'My PDF',
      rawValue: 'file.pdf',
      content: 'contents',
      status: 'ready',
    });

    render(<HomeClient />);

    // Switch to multi-source mode
    fireEvent.click(screen.getByText('Multi-Source'));

    // Real SourcePillList renders the source count + label pill
    expect(screen.getByText('Sources : 1')).toBeInTheDocument();
    expect(screen.getByText('My PDF')).toBeInTheDocument();
  });

  it('auto depth resolves via resolveDepthWithConfidence and navigates with the resolved depth', () => {
    render(<HomeClient />);

    const input = screen.getByPlaceholderText(/Enter topic or URL/);
    fireEvent.change(input, { target: { value: 'quantum computing' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockResolveDepth).toHaveBeenCalledWith('quantum computing');
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('depth=deep'));
  });

  it('compare mode renders two topic inputs and navigates via onCompare', () => {
    render(<HomeClient />);

    // Switch to compare mode (mode toggle button labelled 'compare')
    fireEvent.click(screen.getByText('compare'));

    // Both topic inputs render with their distinct placeholders
    const topic1Input = screen.getByPlaceholderText('First topic...');
    const topic2Input = screen.getByPlaceholderText('Second topic...');

    fireEvent.change(topic1Input, { target: { value: 'Artificial Intelligence' } });
    fireEvent.change(topic2Input, { target: { value: 'Machine Learning' } });
    fireEvent.keyDown(topic2Input, { key: 'Enter' });

    // onCompare → handleCompare: no auto-depth resolution, navigates with both
    // topics at the compare depth preset (balanced), and no validation toast.
    expect(mockResolveDepth).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('topic1=Artificial%20Intelligence');
    expect(url).toContain('topic2=Machine%20Learning');
    expect(url).toContain('depth=balanced');
  });

  it('compare mode shows a toast and does not navigate when both topics are empty', () => {
    render(<HomeClient />);

    fireEvent.click(screen.getByText('compare'));
    fireEvent.keyDown(screen.getByPlaceholderText('First topic...'), { key: 'Enter' });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', title: 'Topics Required' })
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('multi-source generate merges sources via buildPayload and navigates', async () => {
    mockSources.push({
      id: 's1',
      type: 'pdf',
      label: 'My PDF',
      rawValue: 'file.pdf',
      content: 'contents',
      status: 'ready',
    });
    mockBuildPayload.mockReturnValue('merged: contents');

    render(<HomeClient />);

    // Switch to multi-source mode, then trigger the Generate action
    fireEvent.click(screen.getByText('Multi-Source'));
    fireEvent.click(screen.getByText('Generate'));

    // onGenerate is async (awaits buildPayload) — wait for the navigation
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));

    expect(mockBuildPayload).toHaveBeenCalled();
    expect(mockResolveDepth).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('sessionId=multi-');
    expect(url).toContain('depth=detailed');
  });

  it('multi-source generate does not navigate when buildPayload is empty', async () => {
    mockSources.push({
      id: 's1',
      type: 'text',
      label: 'Note',
      rawValue: 'note text',
      content: 'note text',
      status: 'ready',
    });
    mockBuildPayload.mockReturnValue('');

    render(<HomeClient />);
    fireEvent.click(screen.getByText('Multi-Source'));
    fireEvent.click(screen.getByText('Generate'));

    // Let the async onGenerate closure run its `if (p)` guard
    await waitFor(() => expect(mockBuildPayload).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});

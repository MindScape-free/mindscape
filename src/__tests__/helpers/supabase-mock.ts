/**
 * Reusable Supabase mock factory for mind map CRUD integration tests.
 *
 * Implements the PromiseLike (thenable) pattern so that chainable APIs work:
 *   supabase.from('mindmaps').insert({...}).select('id').single()
 *   supabase.from('mindmaps').update({...}).eq('id', x).eq('user_id', y)
 *
 * Each mutation method (insert, update, delete, upsert) returns `this` (QueryBuilder),
 * which has a `.then()` method that lazily executes the operation against the in-memory store.
 */

import { mockMapId, createMockDbRow } from './test-data';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MockStore {
  mindmaps: Map<string, Record<string, any>>;
  public_mindmaps: Map<string, Record<string, any>>;
  shared_mindmaps: Map<string, Record<string, any>>;
  users: Map<string, Record<string, any>>;
  user_settings: Map<string, Record<string, any>>;
  chat_sessions: Map<string, Record<string, any>>;
  admin_activity_log: Record<string, any>[];
  ai_calls: Record<string, any>[];
}

type OperationType = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

interface PendingOp {
  type: OperationType;
  values?: Record<string, any>;
  options?: { onConflict?: string };
}

type ErrorConfig = {
  table: string;
  operation: OperationType;
  error: Record<string, any>;
  afterCalls?: number;
};

// ── CompleteFilter: a thenable builder for read operations ─────────────────
// Handles the chain: select(...).eq(...).eq(...).single() / maybeSingle() / order() / limit()

class CompleteFilter implements PromiseLike<{ data: any; error: any }> {
  private conditions: Array<{ column: string; value: any }> = [];
  private _select: string = '*';
  private _orderColumn: string = '';
  private _orderAscending: boolean = true;
  private _limitCount: number = 0;

  constructor(
    private store: any,
    private table: string,
    private pendingOp: PendingOp | null,
    private errorConfigs: ErrorConfig[],
    private callCounts: Map<string, number>
  ) {}

  eq(column: string, value: any): this {
    this.conditions.push({ column, value });
    return this;
  }

  single(): { data: any; error: any } {
    const rows = this._executeRead();
    return { data: rows.length > 0 ? rows[0] : null, error: null };
  }

  maybeSingle(): { data: any; error: any } {
    return this.single();
  }

  order(column: string, opts: { ascending: boolean }): this {
    this._orderColumn = column;
    this._orderAscending = opts.ascending;
    return this;
  }

  limit(n: number): this {
    this._limitCount = n;
    return this;
  }

  // PromiseLike — makes `await` work on this object directly
  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this._executeWrite().then(onfulfilled, onrejected);
  }

  private _getRows(): any[] {
    const store = this.store[this.table as keyof MockStore];
    if (store instanceof Map) return Array.from(store.values());
    if (Array.isArray(store)) return [...store];
    return [];
  }

  private _matchFilters(item: any): boolean {
    return this.conditions.every(c => {
      const val = item[c.column];
      if (val === null && c.value === null) return true;
      if (val === undefined && c.value === undefined) return true;
      return val == c.value;
    });
  }

  private _executeRead(): any[] {
    let rows = this._getRows();
    if (this.conditions.length > 0) {
      rows = rows.filter(r => this._matchFilters(r));
    }
    return rows;
  }

  private _checkError(op: OperationType): Record<string, any> | null {
    const key = `${this.table}::${op}`;
    const count = (this.callCounts.get(key) || 0) + 1;
    this.callCounts.set(key, count);
    for (const cfg of this.errorConfigs) {
      if (cfg.table === this.table && cfg.operation === op) {
        if (cfg.afterCalls === undefined || count > cfg.afterCalls) return cfg.error;
      }
    }
    return null;
  }

  private async _executeWrite(): Promise<{ data: any; error: any }> {
    if (!this.pendingOp) {
      // Read operation with await
      const rows = this._executeRead();
      return { data: rows, error: null };
    }

    const err = this._checkError(this.pendingOp.type);
    if (err) return { data: null, error: err };

    const store = this.store[this.table as keyof MockStore];
    const op = this.pendingOp;

    switch (op.type) {
      case 'insert': {
        if (!(store instanceof Map)) return { data: null, error: null };
        const id = op.values?.id || `auto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const row = { ...op.values, id };
        store.set(id, row);
        return { data: { id }, error: null };
      }
      case 'upsert': {
        if (!(store instanceof Map)) return { data: null, error: null };
        const conflictCol = op.options?.onConflict || 'id';
        const conflictValue = op.values?.[conflictCol];
        if (conflictValue && store.has(conflictValue)) {
          store.set(conflictValue, { ...store.get(conflictValue), ...op.values });
        } else {
          const id = op.values?.id || `auto-${Date.now()}`;
          store.set(id, { ...op.values, id });
        }
        return { data: null, error: null };
      }
      case 'update': {
        if (!(store instanceof Map)) return { data: null, error: null };
        const targets = this.conditions.length > 0
          ? Array.from(store.values()).filter(r => this._matchFilters(r))
          : Array.from(store.values());
        for (const target of targets) {
          const id = target.id || target.get?.('id');
          if (id && store.has(id)) {
            store.set(id, { ...store.get(id), ...op.values });
          }
        }
        return { data: null, error: null };
      }
      case 'delete': {
        if (!(store instanceof Map)) return { data: null, error: null };
        const targets = this.conditions.length > 0
          ? Array.from(store.values()).filter(r => this._matchFilters(r))
          : Array.from(store.values());
        for (const target of targets) {
          // Find by id entry in Map
          for (const [key, val] of store.entries()) {
            if (this.conditions.every(c => (val as any)[c.column] == c.value)) {
              store.delete(key);
              break;
            }
          }
        }
        return { data: null, error: null };
      }
      default:
        return { data: null, error: null };
    }
  }
}

// ── QueryBuilder: entry point for `from()` ─────────────────────────────────

class QueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private _select: string = '*';
  private conditions: Array<{ column: string; value: any }> = [];
  private pendingOp: PendingOp | null = null;
  private _orderColumn: string = '';
  private _orderAscending: boolean = true;
  private _limitCount: number = 0;
  private _lastInsertedId: string | null = null;

  constructor(
    private store: any,
    private table: string,
    private errorConfigs: ErrorConfig[],
    private callCounts: Map<string, number>
  ) {}

  // ── Read chaining ───────────────────────────────────────────────────────

  select(columns: string): this {
    this._select = columns || '*';
    return this;
  }

  eq(column: string, value: any): this {
    this.conditions.push({ column, value });
    return this;
  }

  order(column: string, opts: { ascending: boolean }): this {
    this._orderColumn = column;
    this._orderAscending = opts.ascending;
    return this;
  }

  limit(n: number): this {
    this._limitCount = n;
    return this;
  }

  single(): { data: any; error: any } {
    // Delegate to a CompleteFilter to evaluate
    const filter = new CompleteFilter(this.store, this.table, this.pendingOp, this.errorConfigs, this.callCounts);
    // Transfer conditions
    for (const c of this.conditions) filter.eq(c.column, c.value);
    // If there's a pending write op, execute it first via the filter
    if (this.pendingOp) {
      // Write then read
      return this._executeSingleAfterWrite(filter);
    }
    const rows = this._getFilteredRows(filter);
    return { data: rows.length > 0 ? rows[0] : null, error: null };
  }

  maybeSingle(): { data: any; error: any } {
    return this.single();
  }

  private _getFilteredRows(filter: CompleteFilter): any[] {
    let rows = this._getAllRows();
    if (this.conditions.length > 0) {
      rows = rows.filter(r =>
        this.conditions.every(c => {
          const val = (r as any)[c.column];
          if (val === null && c.value === null) return true;
          if (val === undefined && c.value === undefined) return true;
          return val == c.value;
        })
      );
    }
    return rows;
  }

  private _executeSingleAfterWrite(filter: CompleteFilter): { data: any; error: any } {
    // Check for errors BEFORE executing (e.g., error injection tests)
    if (this.pendingOp) {
      const err = this._checkError(this.pendingOp.type);
      if (err) return { data: null, error: err };
    }

    this._executeOpSync();

    // For inserts, return the specific inserted row (not the first unfiltered row)
    if (this.pendingOp?.type === 'insert' && this._lastInsertedId) {
      const row = this._getAllRows().find((r: any) => r.id === this._lastInsertedId);
      return { data: row || null, error: null };
    }

    const rows = this._getFilteredRows(filter);
    return { data: rows.length > 0 ? rows[0] : null, error: null };
  }

  private _executeOpSync(): void {
    if (!this.pendingOp) return;
    const store = this.store[this.table as keyof MockStore];
    if (!(store instanceof Map)) return;
    const op = this.pendingOp;

    switch (op.type) {
      case 'insert': {
        const id = op.values?.id || `auto-sync-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        store.set(id, { ...op.values, id });
        this._lastInsertedId = id;
        break;
      }
      case 'update': {
        for (const [key, val] of store.entries()) {
          if (this.conditions.every(c => (val as any)[c.column] == c.value)) {
            store.set(key, { ...val, ...op.values });
          }
        }
        break;
      }
      case 'delete': {
        for (const [key, val] of store.entries()) {
          if (this.conditions.length === 0 || this.conditions.every(c => (val as any)[c.column] == c.value)) {
            store.delete(key);
          }
        }
        break;
      }
      case 'upsert': {
        const conflictCol = op.options?.onConflict || 'id';
        const conflictValue = op.values?.[conflictCol];
        if (conflictValue && store.has(conflictValue)) {
          store.set(conflictValue, { ...store.get(conflictValue), ...op.values });
        } else {
          const id = op.values?.id || `auto-sync-${Date.now()}`;
          store.set(id, { ...op.values, id });
        }
        break;
      }
    }
  }

  // ── Write chaining ──────────────────────────────────────────────────────

  insert(values: Record<string, any>, options?: { onConflict?: string }): this {
    this.pendingOp = { type: 'insert', values, options };
    return this;
  }

  upsert(values: Record<string, any>, options?: { onConflict?: string }): this {
    this.pendingOp = { type: 'upsert', values, options };
    return this;
  }

  update(values: Record<string, any>): this {
    this.pendingOp = { type: 'update', values };
    return this;
  }

  delete(): this {
    this.pendingOp = { type: 'delete' };
    return this;
  }

  // ── PromiseLike — makes `await` trigger execution ───────────────────────

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this._execute().then(onfulfilled, onrejected);
  }

  private async _execute(): Promise<{ data: any; error: any }> {
    if (!this.pendingOp) {
      // Read operation — return ALL matching rows as an array
      let rows = this._getAllRows();
      if (this.conditions.length > 0) {
        rows = rows.filter(r =>
          this.conditions.every(c => {
            const val = (r as any)[c.column];
            if (val === null && c.value === null) return true;
            if (val === undefined && c.value === undefined) return true;
            return val == c.value;
          })
        );
      }
      return { data: rows, error: null };
    }

    const err = this._checkError(this.pendingOp.type);
    if (err) return { data: null, error: err };

    this._executeOpSync();
    return { data: null, error: null };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private _getAllRows(): any[] {
    const store = this.store[this.table as keyof MockStore];
    if (store instanceof Map) return Array.from(store.values());
    if (Array.isArray(store)) return [...store];
    return [];
  }

  private _checkError(op: OperationType): Record<string, any> | null {
    const key = `${this.table}::${op}`;
    const count = (this.callCounts.get(key) || 0) + 1;
    this.callCounts.set(key, count);
    for (const cfg of this.errorConfigs) {
      if (cfg.table === this.table && cfg.operation === op) {
        if (cfg.afterCalls === undefined || count > cfg.afterCalls) return cfg.error;
      }
    }
    return null;
  }
}

// ── Channel / Subscription Mock ────────────────────────────────────────────

class ChannelMock {
  private _onConfig: Record<string, Function> = {};

  on(event: string, config: any, callback: Function): this {
    const key = `${event}::${config?.event || '*'}`;
    this._onConfig[key] = callback;
    return this;
  }

  subscribe(): this {
    return this;
  }
}

// ── Supabase Client Mock ───────────────────────────────────────────────────

export function createMockSupabaseClient(
  initialStore?: Partial<MockStore>,
  errorConfigs: ErrorConfig[] = []
) {
  const callCounts = new Map<string, number>();

  const defaultStore: MockStore = {
    mindmaps: new Map(),
    public_mindmaps: new Map(),
    shared_mindmaps: new Map(),
    users: new Map(),
    user_settings: new Map(),
    chat_sessions: new Map(),
    admin_activity_log: [],
    ai_calls: [],
    ...initialStore,
  };

  // Pre-populate with a default mind map if not already present
  if (!defaultStore.mindmaps.has(mockMapId)) {
    defaultStore.mindmaps.set(mockMapId, createMockDbRow());
  }

  const mockClient = {
    from: (table: string): QueryBuilder => {
      return new QueryBuilder(defaultStore, table, errorConfigs, callCounts);
    },

    channel: (name: string): ChannelMock => new ChannelMock(),
    removeChannel: (channel: ChannelMock): void => {},

    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),

    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-abc-123' } } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },

    // Expose store for test assertions and setup
    _store: defaultStore,
  };

  return mockClient;
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;

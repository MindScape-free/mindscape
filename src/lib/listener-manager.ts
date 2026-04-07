type Unsubscribe = () => void;

interface ListenerEntry {
  id: string;
  unsubscribe: Unsubscribe;
  name: string;
  createdAt: number;
}

class ListenerManager {
  private listeners = new Map<string, ListenerEntry>();
  private counter = 0;

  register(name: string, unsubscribe: Unsubscribe): string {
    const id = `${name}-${++this.counter}-${Date.now()}`;
    this.listeners.set(id, {
      id,
      unsubscribe,
      name,
      createdAt: Date.now(),
    });
    console.log(`[ListenerManager] Registered: ${name} (id: ${id}, total: ${this.listeners.size})`);
    return id;
  }

  unregister(id: string): boolean {
    const entry = this.listeners.get(id);
    if (!entry) {
      console.warn(`[ListenerManager] Attempted to unregister unknown listener: ${id}`);
      return false;
    }
    try {
      entry.unsubscribe();
      this.listeners.delete(id);
      console.log(`[ListenerManager] Unregistered: ${entry.name} (id: ${id}, remaining: ${this.listeners.size})`);
      return true;
    } catch (err) {
      console.error(`[ListenerManager] Error unregistering ${id}:`, err);
      return false;
    }
  }

  unregisterAll(): void {
    console.log(`[ListenerManager] Unregistering all listeners (${this.listeners.size})`);
    for (const [id, entry] of this.listeners) {
      try {
        entry.unsubscribe();
      } catch (err) {
        console.error(`[ListenerManager] Error unregistering ${id}:`, err);
      }
    }
    this.listeners.clear();
  }

  getActiveCount(): number {
    return this.listeners.size;
  }

  getListeners(): { name: string; id: string; age: number }[] {
    const now = Date.now();
    return Array.from(this.listeners.values()).map(e => ({
      name: e.name,
      id: e.id,
      age: now - e.createdAt,
    }));
  }
}

export const globalListenerManager = new ListenerManager();

export function useListenerManager() {
  return globalListenerManager;
}

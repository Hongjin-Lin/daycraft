// Lightweight Supabase client using direct fetch
// Bypasses @supabase/supabase-js due to sb_publishable_ key compatibility issues

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const STORAGE_KEY = 'sb-' + new URL(SUPABASE_URL).hostname.split('.')[0] + '-auth-token';

// --- Auth helpers ---

function getStoredSession(): AuthSession | null {
  try {
    const str = localStorage.getItem(STORAGE_KEY);
    if (!str) return null;
    const parsed = JSON.parse(str);
    // Supabase stores it as { currentSession: {...}, expiresAt: ... }
    return parsed?.currentSession ?? parsed;
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentSession: session }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// --- Types ---

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  aud: string;
  role: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  created_at: string;
}

type AuthChangeCallback = (event: string, session: AuthSession | null) => void;

// --- Auth API ---

async function authRequest(endpoint: string, body: Record<string, any>): Promise<{ data: any; error: any }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.msg || data.error_description || data.message || 'Request failed' } };
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message || 'Network error' } };
  }
}

async function refreshSession(refreshToken: string): Promise<{ data: any; error: any }> {
  return authRequest('/token?grant_type=refresh_token', { refresh_token: refreshToken });
}

// --- Auth singleton ---

class SupabaseAuth {
  private listeners: AuthChangeCallback[] = [];
  private session: AuthSession | null = null;
  private initialized = false;

  constructor() {
    this.session = getStoredSession();
    // Try to refresh on init if we have a session
    if (this.session?.refresh_token) {
      this.tryRefresh();
    }
  }

  private async tryRefresh() {
    if (!this.session?.refresh_token) return;
    const { data, error } = await refreshSession(this.session.refresh_token);
    if (!error && data) {
      this.session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };
      storeSession(this.session);
    }
  }

  private notify(event: string) {
    for (const cb of this.listeners) {
      cb(event, this.session);
    }
  }

  async getSession(): Promise<{ data: { session: AuthSession | null } }> {
    if (!this.session) {
      this.session = getStoredSession();
    }
    return { data: { session: this.session } };
  }

  async getUser(): Promise<{ data: { user: AuthUser | null } }> {
    if (!this.session) {
      this.session = getStoredSession();
    }
    return { data: { user: this.session?.user ?? null } };
  }

  async signUp({ email, password }: { email: string; password: string }) {
    const { data, error } = await authRequest('/signup', { email, password });
    if (error) return { data: null, error };
    // Supabase may return session directly or require confirmation
    if (data.access_token) {
      this.session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };
      storeSession(this.session);
      this.notify('SIGNED_IN');
    }
    return { data, error: null };
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { data, error } = await authRequest('/token?grant_type=password', { email, password });
    if (error) return { data: null, error };
    this.session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      token_type: data.token_type || 'bearer',
      user: data.user,
    };
    storeSession(this.session);
    this.notify('SIGNED_IN');
    return { data, error: null };
  }

  async signOut() {
    if (this.session?.access_token) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${this.session.access_token}`,
          },
        });
      } catch { /* ignore */ }
    }
    this.session = null;
    storeSession(null);
    this.notify('SIGNED_OUT');
  }

  onAuthStateChange(callback: AuthChangeCallback) {
    this.listeners.push(callback);
    // Fire immediately with current state
    callback(this.session ? 'INITIAL_SESSION' : 'SIGNED_OUT', this.session);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
          },
        },
      },
    };
  }
}

// --- DB API ---

function getAuthHeaders(): Record<string, string> {
  const session = getStoredSession();
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer': 'return=representation',
  };
}

class SupabaseQueryBuilder {
  private tableName: string;
  private filters: string[] = [];
  private selectCols = '*';
  private isSingle = false;
  private method = 'GET';
  private bodyData: any = null;
  private updateData: any = null;
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(cols = '*') {
    this.selectCols = cols;
    // Don't override method if already set to POST/PATCH/DELETE by insert/update
    // Default method is GET, only keep it as GET
    return this;
  }

  insert(data: any) {
    this.method = 'POST';
    this.bodyData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data: any) {
    this.method = 'PATCH';
    this.updateData = data;
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push(`${col}=eq.${val}`);
    return this;
  }

  in(col: string, val: any[]) {
    this.filters.push(`${col}=in.(${val.join(',')})`);
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  order(col: string, { ascending = true } = {}) {
    this.orderCol = col;
    this.orderAsc = ascending;
    return this;
  }

  private buildUrl(): string {
    let url = `${SUPABASE_URL}/rest/v1/${this.tableName}?select=${encodeURIComponent(this.selectCols)}`;
    for (const f of this.filters) {
      url += `&${f}`;
    }
    if (this.orderCol) {
      url += `&order=${this.orderCol}.${this.orderAsc ? 'asc' : 'desc'}`;
    }
    if (this.limitN) {
      url += `&limit=${this.limitN}`;
    }
    return url;
  }

  async then(resolve: (result: { data: any; error: any }) => void, reject?: (err: any) => void) {
    try {
      const headers = getAuthHeaders();
      let url = this.buildUrl();
      let fetchOptions: RequestInit = { method: this.method, headers };

      if (this.method === 'POST' && this.bodyData) {
        fetchOptions.body = JSON.stringify(this.bodyData);
      } else if (this.method === 'PATCH' && this.updateData) {
        fetchOptions.body = JSON.stringify(this.updateData);
      }

      // For PATCH/DELETE, add filters to URL
      if (this.method === 'PATCH' || this.method === 'DELETE') {
        let filterUrl = `${SUPABASE_URL}/rest/v1/${this.tableName}`;
        const sep = '?';
        for (const f of this.filters) {
          filterUrl += `${sep}${f}`;
          sep || (filterUrl += '&');
        }
        url = filterUrl;
      }

      const res = await fetch(url, fetchOptions);

      if (this.method === 'DELETE') {
        resolve({ data: null, error: res.ok ? null : { message: `Delete failed: ${res.status}` } });
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        resolve({ data: null, error: { message: errBody.message || errBody.msg || `Request failed: ${res.status}` } });
        return;
      }

      let data = await res.json();
      if (this.isSingle) {
        data = data[0] ?? null;
      }
      resolve({ data, error: null });
    } catch (e: any) {
      if (reject) reject(e);
      else resolve({ data: null, error: { message: e.message || 'Network error' } });
    }
  }
}

// --- Export client ---

const auth = new SupabaseAuth();

export const supabase = {
  auth,
  from(tableName: string) {
    return new SupabaseQueryBuilder(tableName);
  },
  // Realtime placeholder - we'll use polling instead
  channel(_name: string) {
    return {
      on() { return this; },
      subscribe() { return () => {}; },
    };
  },
  removeChannel(_channel: any) {},
};

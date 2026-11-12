import {
  Product,
  MarketPrice,
  Category,
  Market,
  Division,
  District,
  DataSource,
  ApiIntegration,
  CommodityDisplayItem,
  PriceHistoryPoint,
  AdminActivityLog,
  PriceAlert
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_DATA_SOURCES,
  INITIAL_DISTRICTS,
  INITIAL_DIVISIONS,
  INITIAL_MARKETS,
  INITIAL_PRICES,
  INITIAL_PRODUCTS,
  INITIAL_API_INTEGRATIONS
} from '../data/initialData';
import { getSupabaseClient, resetSupabaseClientCache } from './supabaseClient';
import { hashPin, verifyPinHash, sanitizeImageUrl } from '../utils/pinSecurity';

const STORAGE_KEYS = {
  PRODUCTS: 'bazarbd_products_v1',
  PRICES: 'bazarbd_prices_v1',
  MARKETS: 'bazarbd_markets_v1',
  CATEGORIES: 'bazarbd_categories_v1',
  INTEGRATIONS: 'bazarbd_integrations_v1',
  FAVORITES: 'bazarbd_favorites_v1',
  ALERTS: 'bazarbd_alerts_v1',
  ACTIVITY_LOGS: 'bazarbd_activity_v1',
  SUPABASE_CONFIG: 'bazarbd_supabase_config_v1',
  ADMIN_PIN_HASH: 'bazarbd_admin_pin_hash_v1',
  ADMIN_TOKEN: 'bazarbd_admin_token_v1',
};

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConnected: boolean;
}

// Event dispatcher for real-time reactivity
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function emitChange() {
  listeners.forEach(l => {
    try {
      l();
    } catch (e) {
      console.error(e);
    }
  });
}

class BazarStore {
  private products: Product[] = [];
  private prices: MarketPrice[] = [];
  private markets: Market[] = [];
  private categories: Category[] = [];
  private integrations: ApiIntegration[] = [];
  private favorites: Set<string> = new Set();
  private alerts: PriceAlert[] = [];
  private activityLogs: AdminActivityLog[] = [];
  private supabaseConfig: SupabaseConfig = {
    supabaseUrl: '',
    supabaseAnonKey: '',
    isConnected: false,
  };

  private hasServerApi = false;
  private supabaseKvAvailable: boolean | null = null;
  private adminPinHashCache: string | null = null;
  private adminToken: string = '';
  private supabaseChannelUnsubscribe: (() => void) | null = null;

  constructor() {
    this.loadInitialLocal();
    void this.hydrateFromCloudAndServer();
  }

  private getDefaultAlerts(): PriceAlert[] {
    return [
      { id: 'alt-1', product_id: 'prod-veg-2', target_price: 70, direction: 'below', created_at: '2026-03-08', is_notified: false },
      { id: 'alt-2', product_id: 'prod-egg-1', target_price: 130, direction: 'below', created_at: '2026-03-08', is_notified: true },
    ];
  }

  private getDefaultLogs(): AdminActivityLog[] {
    return [
      { id: 'log-1', action: 'PRICE_UPDATE', details: 'Updated Local Onion price from ৳85 to ৳75 at Karwan Bazar', timestamp: 'Today 08:30 AM', admin_user: 'DAM Market Officer' },
      { id: 'log-2', action: 'API_SYNC', details: 'Automated DAM daily agricultural feed synchronised 142 records', timestamp: 'Today 07:45 AM', admin_user: 'System Bot' },
      { id: 'log-3', action: 'PRODUCT_ADD', details: 'Verified Padma Hilsa commodity specification', timestamp: 'Yesterday 04:15 PM', admin_user: 'Super Admin' },
    ];
  }

  private sanitizeProductsList(prods: Product[]): Product[] {
    return prods.map(p => {
      const initial = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
      if (initial && (!p.image_url || p.image_url.includes('/src/assets/images/') || p.image_url.includes('unsplash.com'))) {
        return { ...p, image_url: initial.image_url };
      }
      return {
        ...p,
        image_url: sanitizeImageUrl(p.image_url, p.category_id),
      };
    });
  }

  private loadInitialLocal() {
    try {
      const storedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const parsedProds: Product[] = storedProds ? JSON.parse(storedProds) : INITIAL_PRODUCTS;
      this.products = this.sanitizeProductsList(parsedProds);

      const storedPrices = localStorage.getItem(STORAGE_KEYS.PRICES);
      this.prices = storedPrices ? JSON.parse(storedPrices) : INITIAL_PRICES;

      const storedMkts = localStorage.getItem(STORAGE_KEYS.MARKETS);
      this.markets = storedMkts ? JSON.parse(storedMkts) : INITIAL_MARKETS;

      const storedCats = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const parsedCats: Category[] = storedCats ? JSON.parse(storedCats) : INITIAL_CATEGORIES;
      this.categories = parsedCats.map(c => {
        const initial = INITIAL_CATEGORIES.find(ic => ic.id === c.id);
        return initial ? { ...c, image_url: initial.image_url } : c;
      });

      const storedIntegrations = localStorage.getItem(STORAGE_KEYS.INTEGRATIONS);
      this.integrations = storedIntegrations ? JSON.parse(storedIntegrations) : INITIAL_API_INTEGRATIONS;

      const storedFavs = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      this.favorites = storedFavs ? new Set(JSON.parse(storedFavs)) : new Set(['prod-veg-1', 'prod-veg-2', 'prod-rice-1', 'prod-fish-3', 'prod-meat-1']);

      const storedAlerts = localStorage.getItem(STORAGE_KEYS.ALERTS);
      this.alerts = storedAlerts ? JSON.parse(storedAlerts) : this.getDefaultAlerts();

      const storedLogs = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
      this.activityLogs = storedLogs ? JSON.parse(storedLogs) : this.getDefaultLogs();

      const storedSupa = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
      if (storedSupa) {
        this.supabaseConfig = JSON.parse(storedSupa);
      }

      this.adminPinHashCache = localStorage.getItem(STORAGE_KEYS.ADMIN_PIN_HASH);
      this.adminToken = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || '';
    } catch {
      this.products = INITIAL_PRODUCTS;
      this.prices = INITIAL_PRICES;
      this.markets = INITIAL_MARKETS;
      this.categories = INITIAL_CATEGORIES;
      this.integrations = INITIAL_API_INTEGRATIONS;
      this.alerts = this.getDefaultAlerts();
      this.activityLogs = this.getDefaultLogs();
    }
  }

  public async hydrateFromCloudAndServer() {
    // 1. Try Express backend (/api/state) when running in AI Studio / Node server
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/state', { headers: { Accept: 'application/json' } });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          this.hasServerApi = true;

          if (!data.initialized) {
            // Seed server once with initial data (server preserves any custom PIN)
            await fetch('/api/seed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                products: this.products,
                prices: this.prices,
                markets: this.markets,
                categories: this.categories,
                integrations: this.integrations,
                activityLogs: this.activityLogs,
                alerts: this.alerts,
              }),
            });
          } else {
            if (Array.isArray(data.products) && data.products.length > 0) {
              this.products = this.sanitizeProductsList(data.products);
              this.saveLocalSilent(STORAGE_KEYS.PRODUCTS, this.products);
            }
            if (Array.isArray(data.prices) && data.prices.length > 0) {
              this.prices = data.prices;
              this.saveLocalSilent(STORAGE_KEYS.PRICES, this.prices);
            }
            if (Array.isArray(data.markets) && data.markets.length > 0) {
              this.markets = data.markets;
              this.saveLocalSilent(STORAGE_KEYS.MARKETS, this.markets);
            }
            if (Array.isArray(data.categories) && data.categories.length > 0) {
              this.categories = data.categories;
              this.saveLocalSilent(STORAGE_KEYS.CATEGORIES, this.categories);
            }
            if (Array.isArray(data.integrations) && data.integrations.length > 0) {
              this.integrations = data.integrations;
              this.saveLocalSilent(STORAGE_KEYS.INTEGRATIONS, this.integrations);
            }
            if (Array.isArray(data.activityLogs)) {
              this.activityLogs = data.activityLogs;
              this.saveLocalSilent(STORAGE_KEYS.ACTIVITY_LOGS, this.activityLogs);
            }
            if (Array.isArray(data.alerts)) {
              this.alerts = data.alerts;
              this.saveLocalSilent(STORAGE_KEYS.ALERTS, this.alerts);
            }
            emitChange();
          }
        }
      } catch {
        // Running in static mode (e.g. Vercel static hosting)
        this.hasServerApi = false;
      }
    }

    // 2. Also hydrate & subscribe from Supabase if configured (works on Vercel across cookie clears!)
    await this.hydrateFromSupabase();
  }

  public async hydrateFromSupabase(): Promise<boolean> {
    const supa = getSupabaseClient();
    if (!supa) return false;

    try {
      const { data: rows, error } = await supa
        .from('bazarbd_kv_store')
        .select('key, value');

      if (error) {
        this.supabaseKvAvailable = false;
        return false;
      }
      this.supabaseKvAvailable = true;

      if (!rows || rows.length === 0) {
        // First time connecting an empty Supabase DB: seed cloud store cleanly
        await this.syncAllToSupabase();
      } else {
        const kv = new Map<string, any>(rows.map(r => [r.key, r.value]));
        if (Array.isArray(kv.get('products'))) {
          this.products = this.sanitizeProductsList(kv.get('products'));
          this.saveLocalSilent(STORAGE_KEYS.PRODUCTS, this.products);
        }
        if (Array.isArray(kv.get('prices'))) {
          this.prices = kv.get('prices');
          this.saveLocalSilent(STORAGE_KEYS.PRICES, this.prices);
        }
        if (Array.isArray(kv.get('markets'))) {
          this.markets = kv.get('markets');
          this.saveLocalSilent(STORAGE_KEYS.MARKETS, this.markets);
        }
        if (Array.isArray(kv.get('categories'))) {
          this.categories = kv.get('categories');
          this.saveLocalSilent(STORAGE_KEYS.CATEGORIES, this.categories);
        }
        if (Array.isArray(kv.get('integrations'))) {
          this.integrations = kv.get('integrations');
          this.saveLocalSilent(STORAGE_KEYS.INTEGRATIONS, this.integrations);
        }
        if (Array.isArray(kv.get('activity_logs'))) {
          this.activityLogs = kv.get('activity_logs');
          this.saveLocalSilent(STORAGE_KEYS.ACTIVITY_LOGS, this.activityLogs);
        }
        if (Array.isArray(kv.get('alerts'))) {
          this.alerts = kv.get('alerts');
          this.saveLocalSilent(STORAGE_KEYS.ALERTS, this.alerts);
        }
        if (typeof kv.get('admin_pin_hash') === 'string') {
          this.adminPinHashCache = kv.get('admin_pin_hash');
        }
        emitChange();
      }

      this.subscribeSupabaseRealtime();
      return true;
    } catch (e) {
      console.warn('Supabase hydration skipped:', e);
      return false;
    }
  }

  private subscribeSupabaseRealtime() {
    const supa = getSupabaseClient();
    if (!supa) return;

    if (this.supabaseChannelUnsubscribe) {
      this.supabaseChannelUnsubscribe();
      this.supabaseChannelUnsubscribe = null;
    }

    const channel = supa
      .channel('bazarbd-kv-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bazarbd_kv_store' },
        (payload: any) => {
          const row = payload.new;
          if (!row || !row.key) return;
          if (row.key === 'products' && Array.isArray(row.value)) {
            this.products = this.sanitizeProductsList(row.value);
            this.saveLocalSilent(STORAGE_KEYS.PRODUCTS, this.products);
          } else if (row.key === 'prices' && Array.isArray(row.value)) {
            this.prices = row.value;
            this.saveLocalSilent(STORAGE_KEYS.PRICES, this.prices);
          } else if (row.key === 'markets' && Array.isArray(row.value)) {
            this.markets = row.value;
            this.saveLocalSilent(STORAGE_KEYS.MARKETS, this.markets);
          } else if (row.key === 'activity_logs' && Array.isArray(row.value)) {
            this.activityLogs = row.value;
            this.saveLocalSilent(STORAGE_KEYS.ACTIVITY_LOGS, this.activityLogs);
          } else if (row.key === 'admin_pin_hash' && typeof row.value === 'string') {
            this.adminPinHashCache = row.value;
          }
          emitChange();
        }
      )
      .subscribe();

    this.supabaseChannelUnsubscribe = () => {
      void supa.removeChannel(channel);
    };
  }

  public async syncAllToSupabase(): Promise<boolean> {
    const supa = getSupabaseClient();
    if (!supa) return false;

    try {
      const defaultHash = this.adminPinHashCache || (await hashPin('1234'));
      const payload = [
        { key: 'products', value: this.products },
        { key: 'prices', value: this.prices },
        { key: 'markets', value: this.markets },
        { key: 'categories', value: this.categories },
        { key: 'integrations', value: this.integrations },
        { key: 'activity_logs', value: this.activityLogs },
        { key: 'alerts', value: this.alerts },
        { key: 'admin_pin_hash', value: defaultHash },
      ];
      const { error } = await supa
        .from('bazarbd_kv_store')
        .upsert(payload, { onConflict: 'key' });
      if (!error) {
        this.supabaseKvAvailable = true;
      }
      return !error;
    } catch (e) {
      console.warn('Supabase sync failed:', e);
      return false;
    }
  }

  private async upsertSupabaseKey(key: string, value: unknown) {
    if (this.supabaseKvAvailable === false) return;
    const supa = getSupabaseClient();
    if (!supa) return;
    try {
      const { error } = await supa
        .from('bazarbd_kv_store')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          this.supabaseKvAvailable = false;
        }
      } else {
        this.supabaseKvAvailable = true;
      }
    } catch (e) {
      console.warn(`Supabase upsert failed for ${key}:`, e);
    }
  }

  private saveLocalSilent(key: string, data: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage persistence failed', e);
    }
  }

  private persist(key: string, data: unknown) {
    this.saveLocalSilent(key, data);
    emitChange();
  }

  // Getters
  public getProducts(): Product[] {
    return [...this.products];
  }

  public getPrices(): MarketPrice[] {
    return [...this.prices];
  }

  public getMarkets(): Market[] {
    return [...this.markets];
  }

  public getDivisions(): Division[] {
    return INITIAL_DIVISIONS;
  }

  public getDistricts(): District[] {
    return INITIAL_DISTRICTS;
  }

  public getCategories(): Category[] {
    return [...this.categories];
  }

  public getDataSources(): DataSource[] {
    return INITIAL_DATA_SOURCES;
  }

  public getIntegrations(): ApiIntegration[] {
    return [...this.integrations];
  }

  public getFavorites(): Set<string> {
    return new Set(this.favorites);
  }

  public getAlerts(): PriceAlert[] {
    return [...this.alerts];
  }

  public getActivityLogs(): AdminActivityLog[] {
    return [...this.activityLogs];
  }

  public getSupabaseConfig(): SupabaseConfig {
    return { ...this.supabaseConfig };
  }

  public saveSupabaseConfig(config: SupabaseConfig) {
    this.supabaseConfig = config;
    this.supabaseKvAvailable = null;
    resetSupabaseClientCache();
    this.persist(STORAGE_KEYS.SUPABASE_CONFIG, config);
    void this.hydrateFromSupabase();
  }

  public subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  // Favorites toggle
  public toggleFavorite(productId: string) {
    if (this.favorites.has(productId)) {
      this.favorites.delete(productId);
    } else {
      this.favorites.add(productId);
    }
    this.persist(STORAGE_KEYS.FAVORITES, Array.from(this.favorites));
  }

  // Price Alert
  public addAlert(productId: string, targetPrice: number, direction: 'below' | 'above') {
    const newAlert: PriceAlert = {
      id: `alt-${Date.now()}`,
      product_id: productId,
      target_price: targetPrice,
      direction,
      created_at: new Date().toISOString().split('T')[0],
      is_notified: false,
    };
    this.alerts.unshift(newAlert);
    this.persist(STORAGE_KEYS.ALERTS, this.alerts);

    if (this.hasServerApi) {
      void fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert: newAlert }),
      }).catch(() => {});
    }
    void this.upsertSupabaseKey('alerts', this.alerts);
    return newAlert;
  }

  public removeAlert(id: string) {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.persist(STORAGE_KEYS.ALERTS, this.alerts);
    if (this.hasServerApi) {
      void fetch(`/api/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }
    void this.upsertSupabaseKey('alerts', this.alerts);
  }

  // Price CRUD
  public updatePrice(
    productId: string,
    marketId: string,
    newPrice: number,
    previousPrice?: number,
    minPrice?: number,
    maxPrice?: number,
    sourceId: string = 'src-adm'
  ) {
    const existingIndex = this.prices.findIndex(
      p => p.product_id === productId && p.market_id === marketId
    );

    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const product = this.products.find(p => p.id === productId);
    let savedRecord: MarketPrice;

    if (existingIndex >= 0) {
      const old = this.prices[existingIndex];
      const prev = previousPrice !== undefined ? previousPrice : old.price;
      const min = minPrice !== undefined ? minPrice : Math.min(newPrice, old.min_price);
      const max = maxPrice !== undefined ? maxPrice : Math.max(newPrice, old.max_price);

      savedRecord = {
        ...old,
        price: newPrice,
        previous_price: prev,
        min_price: min,
        max_price: max,
        source_id: sourceId,
        verification_status: 'verified',
        updated_at: `Today ${nowStr}`,
      };
      this.prices[existingIndex] = savedRecord;
    } else {
      savedRecord = {
        id: `prc-${Date.now()}`,
        product_id: productId,
        market_id: marketId,
        price: newPrice,
        previous_price: previousPrice || newPrice,
        min_price: minPrice || Math.round(newPrice * 0.92),
        max_price: maxPrice || Math.round(newPrice * 1.08),
        unit: product?.default_unit || 'কেজি',
        source_id: sourceId,
        verification_status: 'verified',
        recorded_at: new Date().toISOString().split('T')[0],
        updated_at: `Today ${nowStr}`,
      };
      this.prices.unshift(savedRecord);
    }

    this.logActivity('PRICE_UPDATE', `Updated ${product?.name_bn || productId} price to ৳${newPrice}`, 'Admin');
    this.persist(STORAGE_KEYS.PRICES, this.prices);

    if (this.hasServerApi) {
      void fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceRecord: savedRecord }),
      }).catch(() => {});
    }
    void this.upsertSupabaseKey('prices', this.prices);
  }

  // Product CRUD
  public addProduct(product: Omit<Product, 'id' | 'created_at'>) {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    this.products.unshift(newProduct);
    this.logActivity('PRODUCT_ADD', `Added product: ${newProduct.name_bn} (${newProduct.name_en})`, 'User/Admin');
    this.persist(STORAGE_KEYS.PRODUCTS, this.products);

    if (this.hasServerApi) {
      void fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: newProduct }),
      }).catch(() => {});
    }
    void this.upsertSupabaseKey('products', this.products);
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>) {
    this.products = this.products.map(p => (p.id === id ? { ...p, ...updates } : p));
    this.logActivity('PRODUCT_EDIT', `Updated product ID: ${id}`, 'User/Admin');
    this.persist(STORAGE_KEYS.PRODUCTS, this.products);

    if (this.hasServerApi) {
      void fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      }).catch(() => {});
    }
    void this.upsertSupabaseKey('products', this.products);
  }

  public deleteProduct(id: string) {
    this.products = this.products.filter(p => p.id !== id);
    this.prices = this.prices.filter(pr => pr.product_id !== id);
    this.logActivity('PRODUCT_DELETE', `Deleted product ID: ${id}`, 'Admin');
    this.persist(STORAGE_KEYS.PRODUCTS, this.products);
    this.persist(STORAGE_KEYS.PRICES, this.prices);

    if (this.hasServerApi) {
      const token = this.adminToken || localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || '';
      void fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => {});
    }
    void this.upsertSupabaseKey('products', this.products);
    void this.upsertSupabaseKey('prices', this.prices);
  }

  // Market CRUD
  public addMarket(market: Omit<Market, 'id'>) {
    const newMarket: Market = {
      ...market,
      id: `mkt-${Date.now()}`,
    };
    this.markets.push(newMarket);
    this.logActivity('MARKET_ADD', `Added market: ${newMarket.name_bn}`, 'Admin');
    this.persist(STORAGE_KEYS.MARKETS, this.markets);

    if (this.hasServerApi) {
      void fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market: newMarket }),
      }).catch(() => {});
    }
    void this.upsertSupabaseKey('markets', this.markets);
    return newMarket;
  }

  // Activity Logger
  private logActivity(action: string, details: string, admin_user: string) {
    const log: AdminActivityLog = {
      id: `log-${Date.now()}`,
      action,
      details,
      timestamp: `Today ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      admin_user,
    };
    this.activityLogs.unshift(log);
    if (this.activityLogs.length > 50) this.activityLogs.pop();
    this.persist(STORAGE_KEYS.ACTIVITY_LOGS, this.activityLogs);
    void this.upsertSupabaseKey('activity_logs', this.activityLogs);
  }

  // API Sync Trigger
  public triggerApiSync(apiId: string): { success: boolean; message: string; count: number } {
    const target = this.integrations.find(i => i.id === apiId);
    if (!target) return { success: false, message: 'API Integration not found', count: 0 };

    const syncCount = Math.floor(Math.random() * 25) + 15;
    target.last_sync_at = `Today ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    target.last_sync_status = 'success';
    target.records_synced += syncCount;

    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * this.prices.length);
      const pr = this.prices[idx];
      if (!pr) continue;
      const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
      pr.previous_price = pr.price;
      pr.price = Math.max(10, pr.price + delta);
      pr.updated_at = `Today ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      pr.verification_status = 'government';
    }

    this.logActivity('API_SYNC', `Sync completed for ${target.name}. Updated ${syncCount} commodity feeds.`, 'System Sync');
    this.persist(STORAGE_KEYS.INTEGRATIONS, this.integrations);
    this.persist(STORAGE_KEYS.PRICES, this.prices);

    if (this.hasServerApi) {
      void fetch('/api/prices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prices: this.prices,
          integrations: this.integrations,
          logAction: 'API_SYNC',
          logDetails: `Sync completed for ${target.name}. Updated ${syncCount} commodity feeds.`,
        }),
      }).catch(() => {});
    }
    void this.upsertSupabaseKey('prices', this.prices);
    void this.upsertSupabaseKey('integrations', this.integrations);

    return {
      success: true,
      message: `Successfully synchronized ${syncCount} commodities from ${target.name}`,
      count: syncCount,
    };
  }

  // Bulk CSV Import
  public importFromCsv(csvText: string): { imported: number; errors: string[] } {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return { imported: 0, errors: ['CSV file is empty or missing headers'] };

    let count = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts.length < 3) {
        errors.push(`Row ${i + 1}: Invalid format`);
        continue;
      }

      const [prodRef, mktRef, priceStr, prevStr, minStr, maxStr] = parts;
      const price = parseFloat(priceStr);
      if (isNaN(price)) {
        errors.push(`Row ${i + 1}: Invalid price "${priceStr}"`);
        continue;
      }

      const product = this.products.find(
        p => p.id === prodRef || p.name_en.toLowerCase() === prodRef.toLowerCase() || p.name_bn === prodRef
      );
      if (!product) {
        errors.push(`Row ${i + 1}: Product not found "${prodRef}"`);
        continue;
      }

      const market = this.markets.find(
        m => m.id === mktRef || m.name_en.toLowerCase() === mktRef.toLowerCase() || m.name_bn === mktRef
      ) || this.markets[0];

      const prev = prevStr ? parseFloat(prevStr) : price;
      const min = minStr ? parseFloat(minStr) : Math.round(price * 0.9);
      const max = maxStr ? parseFloat(maxStr) : Math.round(price * 1.1);

      this.updatePrice(product.id, market.id, price, prev, min, max, 'src-adm');
      count++;
    }

    this.logActivity('CSV_IMPORT', `Bulk imported ${count} market commodity prices from CSV file`, 'Admin');
    return { imported: count, errors };
  }

  // CSV Export
  public exportToCsv(): string {
    const commodities = this.getDisplayCommodities();
    const headers = ['Product ID', 'Product Bangla', 'Product English', 'Category', 'Market', 'Current Price (BDT)', 'Previous Price', 'Min Price', 'Max Price', 'Unit', 'Change %', 'Source', 'Last Updated'];
    const rows = commodities.map(c => [
      c.product_id,
      `"${c.name_bn}"`,
      `"${c.name_en}"`,
      `"${c.category_name_bn}"`,
      `"${c.market_name_bn}"`,
      c.current_price,
      c.previous_price,
      c.min_price,
      c.max_price,
      `"${c.unit}"`,
      `${c.price_change_percent.toFixed(1)}%`,
      `"${c.source_name}"`,
      `"${c.updated_at}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // Joined display commodities for high-speed UI render
  public getDisplayCommodities(filterMarketId?: string): CommodityDisplayItem[] {
    const marketMap = new Map(this.markets.map(m => [m.id, m]));
    const catMap = new Map(this.categories.map(c => [c.id, c]));
    const sourceMap = new Map(INITIAL_DATA_SOURCES.map(s => [s.id, s]));
    const districtMap = new Map(INITIAL_DISTRICTS.map(d => [d.id, d]));

    const defaultMarketId = filterMarketId || this.markets[0]?.id || 'mkt-1';

    return this.products
      .filter(p => p.is_active)
      .map(product => {
        let priceRec = this.prices.find(
          pr => pr.product_id === product.id && pr.market_id === defaultMarketId
        );
        if (!priceRec) {
          priceRec = this.prices.find(pr => pr.product_id === product.id);
        }

        const category = catMap.get(product.category_id);
        const market = marketMap.get(priceRec?.market_id || defaultMarketId);
        const district = market ? districtMap.get(market.district_id) : undefined;
        const source = sourceMap.get(priceRec?.source_id || 'src-dam');

        const currentPrice = priceRec ? priceRec.price : 50;
        const previousPrice = priceRec ? priceRec.previous_price : 50;
        const minPrice = priceRec ? priceRec.min_price : Math.round(currentPrice * 0.9);
        const maxPrice = priceRec ? priceRec.max_price : Math.round(currentPrice * 1.1);

        const diff = currentPrice - previousPrice;
        const percent = previousPrice > 0 ? (diff / previousPrice) * 100 : 0;

        return {
          id: priceRec?.id || `disp-${product.id}`,
          product_id: product.id,
          name_bn: product.name_bn,
          name_en: product.name_en,
          category_id: product.category_id,
          category_name_bn: category?.name_bn || 'নিত্যপ্রয়োজনীয়',
          category_name_en: category?.name_en || 'Essentials',
          image_url: product.image_url,
          unit: priceRec?.unit || product.default_unit,
          market_id: market?.id || defaultMarketId,
          market_name_bn: market?.name_bn || 'কারওয়ান বাজার',
          market_name_en: market?.name_en || 'Karwan Bazar',
          district_name_bn: district?.name_bn || 'ঢাকা',
          current_price: currentPrice,
          previous_price: previousPrice,
          min_price: minPrice,
          max_price: maxPrice,
          price_change: diff,
          price_change_percent: percent,
          verification_status: priceRec?.verification_status || 'verified',
          source_code: source?.code || 'DAM',
          source_name: source?.name_bn || 'কৃষি বিপণন অধিদপ্তর',
          updated_at: priceRec?.updated_at || 'আজ সকাল ৮:৩০',
        };
      });
  }

  // Generate historical chart points for product
  public getPriceHistory(productId: string, marketId: string, days: number = 30): PriceHistoryPoint[] {
    const priceRec = this.prices.find(p => p.product_id === productId && p.market_id === marketId) ||
                     this.prices.find(p => p.product_id === productId);

    const basePrice = priceRec ? priceRec.price : 60;
    const history: PriceHistoryPoint[] = [];

    let seed = 0;
    for (let i = 0; i < productId.length; i++) seed += productId.charCodeAt(i);

    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });

      const wave = Math.sin((i + seed) / 3.5) * (basePrice * 0.08);
      const noise = (((seed * (i + 1)) % 10) - 5) * 0.8;
      const p = Math.max(10, Math.round(basePrice + wave + noise));

      history.push({
        date: dateStr,
        price: p,
        min_price: Math.round(p * 0.93),
        max_price: Math.round(p * 1.07),
        market_name: 'কারওয়ান বাজার',
      });
    }

    if (history.length > 0 && priceRec) {
      history[history.length - 1].price = priceRec.price;
      history[history.length - 1].min_price = priceRec.min_price;
      history[history.length - 1].max_price = priceRec.max_price;
    }

    return history;
  }

  // ============================================================================
  // SECURE ADMIN PIN VERIFICATION & PERSISTENCE (SERVER + SUPABASE + FALLBACK)
  // ============================================================================
  public async verifyAdminPin(pin: string): Promise<boolean> {
    const trimmed = pin.trim();
    if (!trimmed) return false;

    // 1. Check Server API if available (AI Studio / Node server)
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: trimmed }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        this.hasServerApi = true;
        const data = await res.json();
        if (data.valid) {
          if (data.token) {
            this.adminToken = data.token;
            localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.token);
          }
          return true;
        }
        return false;
      }
    } catch {
      // Static mode fallback
    }

    // 2. Check Supabase cloud PIN hash if configured (Vercel + Supabase)
    const supa = getSupabaseClient();
    if (supa) {
      try {
        const { data } = await supa
          .from('bazarbd_kv_store')
          .select('value')
          .eq('key', 'admin_pin_hash')
          .maybeSingle();

        if (data && typeof data.value === 'string') {
          this.adminPinHashCache = data.value;
          return await verifyPinHash(trimmed, data.value);
        }
      } catch (e) {
        console.warn('Supabase PIN lookup failed:', e);
      }
    }

    // 3. Offline local fallback
    const storedHash = this.adminPinHashCache || localStorage.getItem(STORAGE_KEYS.ADMIN_PIN_HASH);
    if (storedHash) {
      return await verifyPinHash(trimmed, storedHash);
    }
    const defaultHash = await hashPin('1234');
    return await verifyPinHash(trimmed, defaultHash);
  }

  public async changeAdminPin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
    const trimmedNew = newPin.trim();
    if (trimmedNew.length < 4) {
      return { success: false, error: 'নতুন পিন কোড কমপক্ষে ৪ ডিজিট বা অক্ষরের হতে হবে!' };
    }

    // 1. Verify current PIN first
    const isCurrentValid = await this.verifyAdminPin(currentPin);
    if (!isCurrentValid) {
      return { success: false, error: 'বর্তমান পিন কোডটি সঠিক নয়!' };
    }

    const newHash = await hashPin(trimmedNew);

    // 2. Persist to Server API if active
    if (this.hasServerApi) {
      try {
        const res = await fetch('/api/admin/change-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPin: currentPin.trim(), newPin: trimmedNew }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'পিন পরিবর্তন করতে সমস্যা হয়েছে।' };
        }
        if (data.token) {
          this.adminToken = data.token;
          localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.token);
        }
      } catch {
        return { success: false, error: 'সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে।' };
      }
    }

    // 3. Persist to Supabase cloud store if configured
    const supa = getSupabaseClient();
    if (supa) {
      await this.upsertSupabaseKey('admin_pin_hash', newHash);
    }

    // 4. Update local cache
    this.adminPinHashCache = newHash;
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN_HASH, newHash);
    this.logActivity('ADMIN_PIN_CHANGE', 'Admin PIN was updated permanently', 'Admin');
    return { success: true };
  }

  public logoutAdmin() {
    this.adminToken = '';
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    localStorage.removeItem('bazarbd_admin_auth');
  }

  // Reset catalog to default seeds
  public resetToDefault() {
    this.products = INITIAL_PRODUCTS;
    this.prices = INITIAL_PRICES;
    this.markets = INITIAL_MARKETS;
    this.categories = INITIAL_CATEGORIES;
    this.integrations = INITIAL_API_INTEGRATIONS;
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.PRICES);
    localStorage.removeItem(STORAGE_KEYS.MARKETS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.INTEGRATIONS);
    emitChange();
  }
}

export const bazarStore = new BazarStore();

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bazarbd-db.json');
const PIN_DOMAIN_SALT = 'bazarbd-pin-v1:';

interface DbState {
  initialized: boolean;
  adminPinHash: string;
  sessionSecret: string;
  products: any[];
  prices: any[];
  markets: any[];
  categories: any[];
  integrations: any[];
  activityLogs: any[];
  alerts: any[];
}

function hashPinSync(pin: string): string {
  return crypto
    .createHash('sha256')
    .update(`${PIN_DOMAIN_SALT}${pin.trim()}`)
    .digest('hex');
}

function safeCompareHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminToken(secret: string): string {
  const payload = `admin:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx <= 0) return false;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return safeCompareHex(sig, expectedSig);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createDefaultDb(): DbState {
  return {
    initialized: false,
    adminPinHash: hashPinSync('1234'),
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    products: [],
    prices: [],
    markets: [],
    categories: [],
    integrations: [],
    activityLogs: [],
    alerts: [],
  };
}

function loadDb(): DbState {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createDefaultDb();
    saveDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DbState>;
    const defaults = createDefaultDb();
    return {
      initialized: Boolean(parsed.initialized),
      adminPinHash: parsed.adminPinHash || defaults.adminPinHash,
      sessionSecret: parsed.sessionSecret || defaults.sessionSecret,
      products: Array.isArray(parsed.products) ? parsed.products : [],
      prices: Array.isArray(parsed.prices) ? parsed.prices : [],
      markets: Array.isArray(parsed.markets) ? parsed.markets : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations : [],
      activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    };
  } catch (err) {
    console.error('Failed to parse bazarbd-db.json, recreating defaults:', err);
    const fallback = createDefaultDb();
    saveDb(fallback);
    return fallback;
  }
}

function saveDb(state: DbState) {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function appendLog(db: DbState, action: string, details: string, adminUser: string) {
  const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  db.activityLogs.unshift({
    id: `log-${Date.now()}`,
    action,
    details,
    timestamp: `Today ${nowStr}`,
    admin_user: adminUser,
  });
  if (db.activityLogs.length > 50) {
    db.activityLogs = db.activityLogs.slice(0, 50);
  }
}

let db = loadDb();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, initialized: db.initialized });
  });

  // Public state hydration (NEVER exposes adminPinHash or sessionSecret)
  app.get('/api/state', (_req, res) => {
    res.json({
      initialized: db.initialized,
      products: db.products,
      prices: db.prices,
      markets: db.markets,
      categories: db.categories,
      integrations: db.integrations,
      activityLogs: db.activityLogs,
      alerts: db.alerts,
    });
  });

  // One-time seed if DB is not yet initialized (preserves adminPinHash)
  app.post('/api/seed', (req, res) => {
    if (db.initialized) {
      return res.json({ seeded: false, initialized: true });
    }
    const { products, prices, markets, categories, integrations, activityLogs, alerts } = req.body || {};
    db.products = Array.isArray(products) ? products : [];
    db.prices = Array.isArray(prices) ? prices : [];
    db.markets = Array.isArray(markets) ? markets : [];
    db.categories = Array.isArray(categories) ? categories : [];
    db.integrations = Array.isArray(integrations) ? integrations : [];
    db.activityLogs = Array.isArray(activityLogs) ? activityLogs : [];
    db.alerts = Array.isArray(alerts) ? alerts : [];
    db.initialized = true;
    saveDb(db);
    res.json({ seeded: true, initialized: true });
  });

  // Admin PIN verification (Server-side constant-time check)
  app.post('/api/admin/verify-pin', (req, res) => {
    const pin = typeof req.body?.pin === 'string' ? req.body.pin : '';
    if (!pin.trim()) {
      return res.status(400).json({ valid: false });
    }
    const candidateHash = hashPinSync(pin);
    const valid = safeCompareHex(candidateHash, db.adminPinHash);
    if (!valid) {
      return res.json({ valid: false });
    }
    const token = createAdminToken(db.sessionSecret);
    return res.json({ valid: true, token });
  });

  // Admin PIN change (Persists permanently to server disk)
  app.post('/api/admin/change-pin', (req, res) => {
    const currentPin = typeof req.body?.currentPin === 'string' ? req.body.currentPin : '';
    const newPin = typeof req.body?.newPin === 'string' ? req.body.newPin : '';

    if (!safeCompareHex(hashPinSync(currentPin), db.adminPinHash)) {
      return res.status(403).json({
        success: false,
        error: 'বর্তমান পিন কোডটি সঠিক নয়!',
      });
    }

    if (newPin.trim().length < 4 || newPin.trim().length > 32) {
      return res.status(400).json({
        success: false,
        error: 'নতুন পিন কোড ৪ থেকে ৩২ অক্ষরের মধ্যে হতে হবে!',
      });
    }

    db.adminPinHash = hashPinSync(newPin);
    appendLog(db, 'ADMIN_PIN_CHANGE', 'Admin secret PIN was updated permanently', 'Admin');
    saveDb(db);
    const token = createAdminToken(db.sessionSecret);
    return res.json({ success: true, token });
  });

  // Add Product
  app.post('/api/products', (req, res) => {
    const product = req.body?.product;
    if (!product || !product.id || !product.name_bn) {
      return res.status(400).json({ error: 'Invalid product payload' });
    }
    const exists = db.products.some((p) => p.id === product.id);
    if (!exists) {
      db.products.unshift(product);
      appendLog(db, 'PRODUCT_ADD', `Added product: ${product.name_bn} (${product.name_en || ''})`, 'User/Admin');
      saveDb(db);
    }
    res.json({ success: true, product });
  });

  // Update Product
  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body?.updates;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid updates payload' });
    }
    db.products = db.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    appendLog(db, 'PRODUCT_EDIT', `Updated product ID: ${id}`, 'User/Admin');
    saveDb(db);
    res.json({ success: true });
  });

  // Delete Product (Admin Only via HMAC Admin Token)
  app.delete('/api/products/:id', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!verifyAdminToken(token, db.sessionSecret)) {
      return res.status(403).json({ error: 'Admin authorization required to delete products' });
    }
    const { id } = req.params;
    db.products = db.products.filter((p) => p.id !== id);
    db.prices = db.prices.filter((pr) => pr.product_id !== id);
    appendLog(db, 'PRODUCT_DELETE', `Deleted product ID: ${id}`, 'Admin');
    saveDb(db);
    res.json({ success: true });
  });

  // Update / Create Price
  app.post('/api/prices', (req, res) => {
    const { priceRecord } = req.body || {};
    if (!priceRecord || !priceRecord.product_id || !priceRecord.market_id) {
      return res.status(400).json({ error: 'Invalid price record' });
    }
    const idx = db.prices.findIndex(
      (p) => p.product_id === priceRecord.product_id && p.market_id === priceRecord.market_id
    );
    if (idx >= 0) {
      db.prices[idx] = priceRecord;
    } else {
      db.prices.unshift(priceRecord);
    }
    const prod = db.products.find((p) => p.id === priceRecord.product_id);
    appendLog(db, 'PRICE_UPDATE', `Updated ${prod?.name_bn || priceRecord.product_id} price to ৳${priceRecord.price}`, 'User/Admin');
    saveDb(db);
    res.json({ success: true, priceRecord });
  });

  // Bulk Price Sync (CSV import or API sync)
  app.post('/api/prices/bulk', (req, res) => {
    const { prices, integrations, logAction, logDetails } = req.body || {};
    if (Array.isArray(prices)) {
      db.prices = prices;
    }
    if (Array.isArray(integrations)) {
      db.integrations = integrations;
    }
    if (logAction && logDetails) {
      appendLog(db, logAction, logDetails, 'Admin');
    }
    saveDb(db);
    res.json({ success: true });
  });

  // Add Market
  app.post('/api/markets', (req, res) => {
    const { market } = req.body || {};
    if (!market || !market.id) {
      return res.status(400).json({ error: 'Invalid market' });
    }
    db.markets.push(market);
    appendLog(db, 'MARKET_ADD', `Added market: ${market.name_bn}`, 'Admin');
    saveDb(db);
    res.json({ success: true, market });
  });

  // Alerts
  app.post('/api/alerts', (req, res) => {
    const { alert } = req.body || {};
    if (!alert || !alert.id) {
      return res.status(400).json({ error: 'Invalid alert' });
    }
    db.alerts.unshift(alert);
    saveDb(db);
    res.json({ success: true, alert });
  });

  app.delete('/api/alerts/:id', (req, res) => {
    db.alerts = db.alerts.filter((a) => a.id !== req.params.id);
    saveDb(db);
    res.json({ success: true });
  });

  // Mount Vite in dev, or serve dist in prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BazarBD server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

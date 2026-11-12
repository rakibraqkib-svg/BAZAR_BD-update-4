import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables (compiled at build time from .env / Vercel Env Vars) or localStorage saved credentials
const ENV_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
const ENV_ANON_KEY = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';

let supabaseInstance: SupabaseClient | null = null;
let cachedCredKey = '';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean; fromEnv: boolean } {
  // Prefer build-time env vars (survive cookie/localStorage deletion on Vercel)
  if (ENV_URL && ENV_ANON_KEY && !ENV_URL.includes('your-project')) {
    return {
      url: ENV_URL,
      anonKey: ENV_ANON_KEY,
      isConfigured: true,
      fromEnv: true,
    };
  }

  try {
    const saved = localStorage.getItem('bazarbd_supabase_config_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return {
          url: parsed.supabaseUrl,
          anonKey: parsed.supabaseAnonKey,
          isConfigured: true,
          fromEnv: false,
        };
      }
    }
  } catch (e) {
    console.error(e);
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    fromEnv: false,
  };
}

export function resetSupabaseClientCache() {
  supabaseInstance = null;
  cachedCredKey = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

  const key = `${url}::${anonKey}`;
  if (!supabaseInstance || cachedCredKey !== key) {
    try {
      supabaseInstance = createClient(url, anonKey);
      cachedCredKey = key;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string; tablesExist: boolean }> {
  try {
    const tempClient = createClient(url, anonKey);
    // Probe bazarbd_kv_store first, fallback to products table
    const { error } = await tempClient.from('bazarbd_kv_store').select('key').limit(1);

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('does not exist') ||
        error.message.includes('Could not find the table')
      ) {
        return {
          success: true,
          message: 'Supabase প্রজেক্টে কানেক্ট হয়েছে! তবে ডাটাবেজ টেবিল এখনো তৈরি হয়নি। নিচের SQL স্ক্রিপ্টটি কপি করে Supabase SQL Editor-এ Run করুন।',
          tablesExist: false,
        };
      }
      return {
        success: false,
        message: `Connection error: ${error.message}`,
        tablesExist: false,
      };
    }

    return {
      success: true,
      message: 'Supabase কানেকশন ও স্থায়ী ডাটাবেজ টেবিল (bazarbd_kv_store) সফলভাবে সংযুক্ত হয়েছে!',
      tablesExist: true,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Could not connect to Supabase endpoint',
      tablesExist: false,
    };
  }
}

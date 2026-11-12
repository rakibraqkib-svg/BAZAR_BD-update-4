import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  MapPin,
  Bell,
  Globe,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  ChevronDown,
  X,
  Download,
  Database,
  Plus,
  Edit3,
  Lock,
  LogOut
} from 'lucide-react';
import { CommodityDisplayItem, Market, Division, Language } from '../types';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  markets: Market[];
  divisions: Division[];
  selectedMarketId: string;
  onSelectMarket: (marketId: string) => void;
  commodities: CommodityDisplayItem[];
  onSelectCommodity: (commodity: CommodityDisplayItem) => void;
  onOpenAdmin: () => void;
  onOpenAi: () => void;
  onOpenReport: () => void;
  onOpenSupabaseModal: () => void;
  unreadAlertsCount: number;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  onOpenUserAddProduct: () => void;
  onOpenUserEditProduct: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  markets,
  selectedMarketId,
  onSelectMarket,
  commodities,
  onSelectCommodity,
  onOpenAdmin,
  onOpenAi,
  onOpenReport,
  onOpenSupabaseModal,
  unreadAlertsCount,
  searchQuery,
  onSearchQueryChange,
  isAdminLoggedIn,
  onOpenAdminLogin,
  onLogoutAdmin,
  onOpenUserAddProduct,
  onOpenUserEditProduct,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedMarket = markets.find(m => m.id === selectedMarketId) || markets[0];

  // Helper for resilient Bengali and English text comparison
  const normalizeSearchText = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u09AF\u09BC/g, '\u09DF')
      .replace(/\u09A1\u09BC/g, '\u09DC')
      .replace(/\u09A2\u09BC/g, '\u09DD')
      .replace(/[\u0981\u09BC\u09CD\s]/g, '');
  };

  // Filter search results
  const searchResults = searchQuery.trim() === ''
    ? []
    : commodities.filter(c => {
        const q = searchQuery.toLowerCase().trim();
        const normQ = normalizeSearchText(q);
        const nameBn = c.name_bn.toLowerCase();
        const normBn = normalizeSearchText(nameBn);
        const nameEn = c.name_en.toLowerCase();
        const catBn = c.category_name_bn.toLowerCase();
        const catEn = c.category_name_en.toLowerCase();

        return (
          nameBn.includes(q) ||
          normBn.includes(normQ) ||
          nameEn.includes(q) ||
          catBn.includes(q) ||
          catEn.includes(q)
        );
      }).slice(0, 8);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchResults.length > 0) {
        onSelectCommodity(searchResults[0]);
      }
      setIsSearchOpen(false);
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 min-h-18 py-2 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Lockup */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#087443] to-[#55B76A] flex items-center justify-center text-white shadow-sm shadow-emerald-900/10">
            <span className="text-lg sm:text-xl font-bold font-serif tracking-tight">৳</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-sans">
                Bazar<span className="text-[#087443]">BD</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 hidden sm:inline-block">
                লাইভ বাজারদর
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden md:block">
              {language === 'bn' ? 'প্রতিদিনের নিত্যপণ্যের সঠিক বাজারদর' : 'Daily Essential Commodity Price Tracker'}
            </p>
          </div>
        </div>

        {/* Global Product Search (Clean single icon & highly visible text) */}
        <div ref={searchRef} className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 max-w-xl sm:mx-2 min-w-0">
          <div className="relative flex items-center rounded-xl overflow-hidden border border-slate-300 bg-white hover:border-[#087443] focus-within:border-[#087443] focus-within:ring-2 focus-within:ring-[#087443]/20 transition-all shadow-xs">
            {/* Single clean search icon */}
            <Search className="w-4 h-4 text-emerald-700 ml-3 pointer-events-none shrink-0" />
            
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={language === 'bn' ? 'পণ্যের নাম দিয়ে দাম খুঁজুন (যেমন: আলু, পেঁয়াজ, ইলিশ...)' : 'Search commodity price (e.g. Potato, Onion, Rice...)'}
              style={{ color: '#0f172a', caretColor: '#087443' }}
              className="w-full px-2.5 py-2.5 bg-white text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
            />
            
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchQueryChange('');
                  setIsSearchOpen(false);
                  inputRef.current?.focus();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full mr-1 transition-colors cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Right Search Button (Text only, NO duplicate search icon) */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="px-3 sm:px-4 py-2.5 bg-[#087443] hover:bg-[#065e36] text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              <span>{language === 'bn' ? 'খুঁজুন' : 'Search'}</span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchQuery.trim() !== '' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 bg-slate-50 flex items-center justify-between">
                <span>{language === 'bn' ? 'অনুসন্ধানের ফলাফল' : 'Search Results'}</span>
                <span className="text-slate-400">{searchResults.length} {language === 'bn' ? 'টি পণ্য' : 'items'}</span>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCommodity(c);
                        setIsSearchOpen(false);
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-emerald-50/70 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                          <img
                            src={c.image_url}
                            alt={c.name_bn}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/vegetables.jpg';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-[#087443] transition-colors">
                            {language === 'bn' ? c.name_bn : c.name_en}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.category_name_bn} · {c.market_name_bn}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 tabular-nums">
                          ৳{c.current_price} <span className="text-xs font-normal text-slate-500">/{c.unit}</span>
                        </div>
                        <div className={`text-[11px] font-semibold ${c.price_change < 0 ? 'text-emerald-600' : c.price_change > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {c.price_change < 0 ? `৳${Math.abs(c.price_change)} কমেছে` : c.price_change > 0 ? `৳${c.price_change} বেড়েছে` : 'অপরিবর্তিত'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs">
                  <p className="font-bold text-slate-800">
                    {language === 'bn' ? `"${searchQuery}" এর কোনো ফলাফল পাওয়া যায়নি` : `No commodities found for "${searchQuery}"`}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    {language === 'bn' ? 'সঠিক বানান লিখুন (যেমন: আলু, পেঁয়াজ, ইলিশ, ডিম, গরুর মাংস...)' : 'Try common terms like Potato, Onion, Rice, Milk...'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls & Market Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* User Quick Action: Add & Edit Buttons (Available to all visitors) */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={onOpenUserAddProduct}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/90 text-[#087443] text-xs font-bold border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
              title="নতুন পণ্য যোগ করুন"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'পণ্য যোগ' : 'Add Item'}</span>
            </button>
            <button
              onClick={onOpenUserEditProduct}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
              title="পণ্য এডিট ও দর আপডেট"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'bn' ? 'এডিট' : 'Edit'}</span>
            </button>
          </div>

          {/* Market Dropdown Picker */}
          <div className="relative">
            <button
              onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#087443] shrink-0" />
              <div className="text-left hidden xl:block">
                <div className="text-[10px] text-slate-400 uppercase leading-none font-semibold">
                  {language === 'bn' ? 'বাজার' : 'Market'}
                </div>
                <div className="font-semibold text-slate-900 truncate max-w-[120px] leading-tight">
                  {language === 'bn' ? selectedMarket?.name_bn : selectedMarket?.name_en}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {isMarketDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-100">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-700">
                  {language === 'bn' ? 'বাংলাদেশের বাজারসমূহ' : 'Select Bangladesh Market'}
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {markets.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectMarket(m.id);
                        setIsMarketDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors cursor-pointer ${
                        m.id === selectedMarketId ? 'bg-emerald-50/80 font-bold text-[#087443]' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{language === 'bn' ? m.name_bn : m.name_en}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{m.location}</div>
                      </div>
                      {m.id === selectedMarketId && (
                        <span className="w-2 h-2 rounded-full bg-[#087443]"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Price Assistant Button */}
          <button
            onClick={onOpenAi}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 text-[#087443] hover:bg-emerald-100/80 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
            title="AI Price Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden xl:inline">
              {language === 'bn' ? 'এআই' : 'AI'}
            </span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => onLanguageChange(language === 'bn' ? 'en' : 'bn')}
            className="px-2.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {language === 'bn' ? 'বাজারদর অ্যালার্ট' : 'Price Alerts'}
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    সক্রিয়
                  </span>
                </div>
                <div className="p-3 divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex items-start gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">পেঁয়াজের দর হ্রাস পেয়েছে</div>
                      <div className="text-[11px] text-slate-500">কারওয়ান বাজারে দেশি পেঁয়াজ এখন ৳৭৫/কেজি (আগে ছিল ৳৮৫)</div>
                      <div className="text-[10px] text-slate-400 mt-1">আজ সকাল ৮:৩০</div>
                    </div>
                  </div>
                  <div className="py-2 flex items-start gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">ডিমের দাম কমেছে</div>
                      <div className="text-[11px] text-slate-500">ফার্মের ডিম প্রতি ডজন ৳১৩৫ (পূর্বমূল্য ৳১৪৫)</div>
                      <div className="text-[10px] text-slate-400 mt-1">আজ সকাল ৭:০০</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RESTRICTED SECTION: Admin Panel & Logout (STRICTLY OWNER ONLY) */}
          {isAdminLoggedIn ? (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              {/* Admin Dashboard Button */}
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#087443] hover:bg-[#065e36] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                title="Open Admin Dashboard"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>
                  {language === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}
                </span>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogoutAdmin}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title={language === 'bn' ? 'অ্যাডমিন লগআউট' : 'Admin Logout'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Regular Visitor View: Discrete Admin Login button */
            <button
              onClick={onOpenAdminLogin}
              aria-label={language === 'bn' ? 'এডমিন' : 'Admin'}
              className="flex items-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shrink-0 cursor-pointer"
              title={language === 'bn' ? 'অ্যাডমিন প্রবেশ (শুধুমাত্র সাইট ওনার)' : 'Admin Login (Owner Only)'}
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">
                {language === 'bn' ? 'এডমিন' : 'Admin'}
              </span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

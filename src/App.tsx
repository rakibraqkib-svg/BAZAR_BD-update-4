/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  Scale,
  FileText,
  Plus,
  Edit3
} from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { HeroBanner } from './components/HeroBanner';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { PriceHistoryModal } from './components/PriceHistoryModal';
import { MarketComparisonView } from './components/MarketComparisonView';
import { DailyReportView } from './components/DailyReportView';
import { PriceTrendsView } from './components/PriceTrendsView';
import { SupabaseSchemaView } from './components/SupabaseSchemaView';
import { AdminDashboard } from './components/AdminDashboard';
import { AiAssistantModal } from './components/AiAssistantModal';
import { PriceAlertModal } from './components/PriceAlertModal';
import { LiveSupabaseModal } from './components/LiveSupabaseModal';
import { UserProductModal } from './components/UserProductModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';
import { bazarStore } from './services/store';
import { CommodityDisplayItem, Language } from './types';

type SortOption = 'featured' | 'drop' | 'rise' | 'price-asc' | 'price-desc';

export default function App() {
  const [language, setLanguage] = useState<Language>('bn');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('mkt-1');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'comparison' | 'trends' | 'report' | 'database'>('home');
  const [sortOption, setSortOption] = useState<SortOption>('featured');

  // Admin authentication state (Restricts ZIP download & Admin panel strictly to owner)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('bazarbd_admin_auth') === 'true';
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // User Product Add/Edit Modal
  const [isUserProductModalOpen, setIsUserProductModalOpen] = useState(false);
  const [userProductModalMode, setUserProductModalMode] = useState<'add' | 'edit'>('add');
  const [targetCommodityForEdit, setTargetCommodityForEdit] = useState<CommodityDisplayItem | null>(null);

  // Modals
  const [selectedHistoryCommodity, setSelectedHistoryCommodity] = useState<CommodityDisplayItem | null>(null);
  const [alertTargetCommodity, setAlertTargetCommodity] = useState<CommodityDisplayItem | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Store data
  const [commodities, setCommodities] = useState<CommodityDisplayItem[]>(() =>
    bazarStore.getDisplayCommodities(selectedMarketId)
  );
  const [favorites, setFavorites] = useState<Set<string>>(() => bazarStore.getFavorites());
  const [markets, setMarkets] = useState(() => bazarStore.getMarkets());
  const [divisions] = useState(() => bazarStore.getDivisions());
  const [categories, setCategories] = useState(() => bazarStore.getCategories());
  const [products, setProducts] = useState(() => bazarStore.getProducts());
  const [alerts, setAlerts] = useState(() => bazarStore.getAlerts());

  // Subscribe to real-time store updates
  useEffect(() => {
    const syncFromStore = () => {
      setCommodities(bazarStore.getDisplayCommodities(selectedMarketId));
      setFavorites(bazarStore.getFavorites());
      setMarkets(bazarStore.getMarkets());
      setCategories(bazarStore.getCategories());
      setProducts(bazarStore.getProducts());
      setAlerts(bazarStore.getAlerts());
    };
    const unsubscribe = bazarStore.subscribe(syncFromStore);
    syncFromStore();
    return unsubscribe;
  }, [selectedMarketId]);

  // Refresh commodities when market changes
  useEffect(() => {
    setCommodities(bazarStore.getDisplayCommodities(selectedMarketId));
  }, [selectedMarketId]);

  const [searchQuery, setSearchQuery] = useState('');

  // Normalize Bengali text for tolerant matching (e.g., পেঁয়াজ vs পেঁয়াজ)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u09AF\u09BC/g, '\u09DF')
      .replace(/\u09A1\u09BC/g, '\u09DC')
      .replace(/\u09A2\u09BC/g, '\u09DD')
      .trim();
  };

  // Filter & Sort Commodities
  const displayedCommodities = useMemo(() => {
    let list = [...commodities];

    // Filter by Category
    if (selectedCategory) {
      list = list.filter(c => c.category_id === selectedCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const qNorm = normalizeText(searchQuery);
      list = list.filter(c => {
        const bnNorm = normalizeText(c.name_bn);
        const enNorm = normalizeText(c.name_en);
        const catBn = normalizeText(c.category_name_bn);
        const catEn = normalizeText(c.category_name_en);
        return (
          bnNorm.includes(qNorm) ||
          enNorm.includes(qNorm) ||
          catBn.includes(qNorm) ||
          catEn.includes(qNorm)
        );
      });
    }

    // Sort
    switch (sortOption) {
      case 'drop':
        list.sort((a, b) => a.price_change_percent - b.price_change_percent);
        break;
      case 'rise':
        list.sort((a, b) => b.price_change_percent - a.price_change_percent);
        break;
      case 'price-asc':
        list.sort((a, b) => a.current_price - b.current_price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.current_price - a.current_price);
        break;
      default:
        // Featured / default order
        break;
    }

    return list;
  }, [commodities, selectedCategory, searchQuery, sortOption]);

  const handleToggleFavorite = (productId: string) => {
    bazarStore.toggleFavorite(productId);
    setFavorites(bazarStore.getFavorites());
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col font-sans text-slate-900">
      
      {/* Top Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        markets={markets}
        divisions={divisions}
        selectedMarketId={selectedMarketId}
        onSelectMarket={setSelectedMarketId}
        commodities={commodities}
        onSelectCommodity={(c) => setSelectedHistoryCommodity(c)}
        onOpenAdmin={() => {
          if (isAdminLoggedIn) {
            setIsAdminOpen(true);
          } else {
            setIsAdminLoginModalOpen(true);
          }
        }}
        onOpenAi={() => setIsAiOpen(true)}
        onOpenReport={() => setActiveView('report')}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        unreadAlertsCount={alerts.filter(a => !a.is_notified).length}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onLogoutAdmin={() => {
          setIsAdminLoggedIn(false);
          bazarStore.logoutAdmin();
        }}
        onOpenUserAddProduct={() => {
          setTargetCommodityForEdit(null);
          setUserProductModalMode('add');
          setIsUserProductModalOpen(true);
        }}
        onOpenUserEditProduct={() => {
          setTargetCommodityForEdit(null);
          setUserProductModalMode('edit');
          setIsUserProductModalOpen(true);
        }}
      />

      {/* Main Container: Left Sidebar + Central Feed + Right Sidebar */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex items-start">
        
        {/* Left Sidebar (FreshCart Inspired) */}
        <Sidebar
          language={language}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenAdmin={() => {
            if (isAdminLoggedIn) {
              setIsAdminOpen(true);
            } else {
              setIsAdminLoginModalOpen(true);
            }
          }}
          onOpenAi={() => setIsAiOpen(true)}
          categories={categories}
        />

        {/* Central Dashboard Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-6">
          
          {/* VIEW 1: HOME DASHBOARD */}
          {activeView === 'home' && (
            <div className="space-y-6">
              
              {/* Hero Banner */}
              <HeroBanner
                language={language}
                onOpenAi={() => setIsAiOpen(true)}
                onOpenComparison={() => setActiveView('comparison')}
                totalProductsCount={commodities.length}
                totalMarketsCount={markets.length}
              />

              {/* Category Navigation Pills */}
              <CategoryNav
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                language={language}
              />

              {/* Active Search Filter Banner */}
              {searchQuery.trim() && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/90 rounded-2xl px-4 py-3 text-xs text-emerald-900 shadow-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-700">
                      {language === 'bn' ? 'অনুসন্ধানের ফলাফল:' : 'Search results for:'}
                    </span>
                    <span className="bg-[#087443] text-white px-2.5 py-0.5 rounded-lg font-bold">
                      "{searchQuery}"
                    </span>
                    <span className="text-emerald-700 font-medium">
                      ({displayedCommodities.length} {language === 'bn' ? 'টি পণ্য পাওয়া গেছে' : 'products found'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? 'রিসেট করুন ✕' : 'Clear Search ✕'}
                  </button>
                </div>
              )}

              {/* Filter & Sort Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {language === 'bn' ? 'আজকের প্রয়োজনীয় পণ্যসমূহ' : "Today's Essential Commodities"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {displayedCommodities.length} {language === 'bn' ? 'টি পণ্য প্রদর্শিত' : 'items'}
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                  {/* User Action Buttons: Add Product & Edit Product Side-by-Side */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetCommodityForEdit(null);
                        setUserProductModalMode('add');
                        setIsUserProductModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#087443] hover:bg-[#065e36] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                      title="নতুন পণ্য যোগ করুন"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'পণ্য যোগ' : 'Add Product'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetCommodityForEdit(null);
                        setUserProductModalMode('edit');
                        setIsUserProductModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#087443] border border-emerald-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      title="পণ্য এডিট ও দর আপডেট করুন"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'পণ্য এডিট' : 'Edit Product'}</span>
                    </button>
                  </div>

                  {/* Sort Controls */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'সাজান:' : 'Sort By:'}</span>
                    </span>

                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as SortOption)}
                      className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#087443]/30"
                    >
                      <option value="featured">{language === 'bn' ? 'প্রস্তাবিত ক্রম' : 'Featured'}</option>
                      <option value="drop">{language === 'bn' ? 'সর্বোচ্চ দর পতন (স্বস্তি)' : 'Biggest Price Drop'}</option>
                      <option value="rise">{language === 'bn' ? 'সর্বোচ্চ দর বৃদ্ধি' : 'Biggest Price Rise'}</option>
                      <option value="price-asc">{language === 'bn' ? 'কম দাম থেকে বেশি' : 'Price: Low to High'}</option>
                      <option value="price-desc">{language === 'bn' ? 'বেশি দাম থেকে কম' : 'Price: High to Low'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Product Cards Grid or Empty State */}
              {displayedCommodities.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/90 shadow-xs">
                  <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 text-[#087443] rounded-full flex items-center justify-center text-2xl font-bold">
                    🔍
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No commodities found'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                    {language === 'bn'
                      ? `"${searchQuery}" এর জন্য কোনো পণ্য পাওয়া যায়নি। অনুগ্রহ করে অন্য কোনো নাম বা ক্যাটাগরি অনুসন্ধান করুন।`
                      : `No products matching "${searchQuery}". Please check the spelling or explore other categories.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}
                    className="bg-[#087443] hover:bg-[#065c35] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? 'সব পণ্য পুনরায় দেখুন' : 'Show all commodities'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayedCommodities.map((item) => (
                    <ProductCard
                      key={item.id}
                      commodity={item}
                      language={language}
                      onOpenHistory={(c) => setSelectedHistoryCommodity(c)}
                      onOpenEdit={(c) => {
                        setTargetCommodityForEdit(c);
                        setUserProductModalMode('edit');
                        setIsUserProductModalOpen(true);
                      }}
                      isFavorite={favorites.has(item.product_id)}
                      onToggleFavorite={handleToggleFavorite}
                      onSetAlert={(c) => setAlertTargetCommodity(c)}
                    />
                  ))}
                </div>
              )}

            </div>
          )}

          {/* VIEW 2: MARKET COMPARISON */}
          {activeView === 'comparison' && (
            <MarketComparisonView
              products={products}
              markets={markets}
              language={language}
            />
          )}

          {/* VIEW 3: PRICE TRENDS */}
          {activeView === 'trends' && (
            <PriceTrendsView
              products={products}
              markets={markets}
              language={language}
            />
          )}

          {/* VIEW 4: DAILY REPORT */}
          {activeView === 'report' && (
            <DailyReportView
              commodities={commodities}
              markets={markets}
              language={language}
            />
          )}

          {/* VIEW 5: SUPABASE DATABASE ARCHITECTURE */}
          {activeView === 'database' && (
            <SupabaseSchemaView language={language} />
          )}

        </main>

        {/* Right Sidebar (FreshCart "Your Cart & Market Summary" Inspired) */}
        <RightSidebar
          commodities={commodities}
          favorites={favorites}
          onSelectCommodity={(c) => setSelectedHistoryCommodity(c)}
          language={language}
          onOpenComparison={() => setActiveView('comparison')}
          onOpenReport={() => setActiveView('report')}
        />

      </div>

      {/* Footer */}
      <Footer
        language={language}
        onOpenAdmin={() => {
          if (isAdminLoggedIn) {
            setIsAdminOpen(true);
          } else {
            setIsAdminLoginModalOpen(true);
          }
        }}
        onOpenReport={() => setActiveView('report')}
        onOpenAi={() => setIsAiOpen(true)}
        onOpenComparison={() => setActiveView('comparison')}
      />

      {/* Interactive Price History Modal */}
      {selectedHistoryCommodity && (
        <PriceHistoryModal
          commodity={selectedHistoryCommodity}
          onClose={() => setSelectedHistoryCommodity(null)}
          markets={markets}
          language={language}
        />
      )}

      {/* Price Alert Modal */}
      {alertTargetCommodity && (
        <PriceAlertModal
          commodity={alertTargetCommodity}
          onClose={() => setAlertTargetCommodity(null)}
          language={language}
        />
      )}

      {/* Admin Dashboard Control Panel */}
      {isAdminOpen && (
        <AdminDashboard
          onClose={() => setIsAdminOpen(false)}
          onLogout={() => {
            setIsAdminLoggedIn(false);
            bazarStore.logoutAdmin();
          }}
          language={language}
        />
      )}

      {/* AI Assistant Modal */}
      {isAiOpen && (
        <AiAssistantModal
          onClose={() => setIsAiOpen(false)}
          language={language}
        />
      )}

      {/* Supabase Live Modal */}
      {isSupabaseModalOpen && (
        <LiveSupabaseModal
          onClose={() => setIsSupabaseModalOpen(false)}
          language={language}
        />
      )}

      {/* User Product Add & Edit Modal (Community Price & Photo Editor, No Delete) */}
      <UserProductModal
        isOpen={isUserProductModalOpen}
        onClose={() => setIsUserProductModalOpen(false)}
        language={language}
        mode={userProductModalMode}
        targetCommodity={targetCommodityForEdit}
        categories={categories}
        markets={markets}
        onSuccess={() => {
          setCommodities(bazarStore.getDisplayCommodities(selectedMarketId));
        }}
      />

      {/* Admin Login Modal (Restricts ZIP & Admin Panel strictly to owner) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        language={language}
        onSuccess={() => {
          setIsAdminLoggedIn(true);
          setIsAdminOpen(true);
        }}
      />

    </div>
  );
}

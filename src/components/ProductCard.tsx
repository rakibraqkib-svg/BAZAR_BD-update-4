import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  BarChart2,
  Heart,
  BellRing,
  Building2,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { CommodityDisplayItem, Language } from '../types';

interface ProductCardProps {
  commodity: CommodityDisplayItem;
  language: Language;
  onOpenHistory: (commodity: CommodityDisplayItem) => void;
  onOpenEdit: (commodity: CommodityDisplayItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onSetAlert: (commodity: CommodityDisplayItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  commodity,
  language,
  onOpenHistory,
  onOpenEdit,
  isFavorite,
  onToggleFavorite,
  onSetAlert,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState(commodity.image_url);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);

  // Sync if commodity image_url changes
  React.useEffect(() => {
    setImgSrc(commodity.image_url);
    setImageError(false);
    setHasTriedFallback(false);
  }, [commodity.image_url]);

  const handleImgError = () => {
    if (!hasTriedFallback) {
      setHasTriedFallback(true);
      // Try local category image fallback
      if (commodity.category_id === 'cat-fish') setImgSrc('/images/fish.jpg');
      else if (commodity.category_id === 'cat-rice') setImgSrc('/images/rice.jpg');
      else if (commodity.category_id === 'cat-meat') setImgSrc('/images/meat.jpg');
      else if (commodity.category_id === 'cat-dairy') setImgSrc('/images/dairy.jpg');
      else if (commodity.category_id === 'cat-oil') setImgSrc('/images/oil.jpg');
      else if (commodity.category_id === 'cat-pulses') setImgSrc('/images/pulses.jpg');
      else if (commodity.category_id === 'cat-fruits') setImgSrc('/images/fruits.jpg');
      else if (commodity.category_id === 'cat-spices') setImgSrc('/images/spices.jpg');
      else setImgSrc('/images/vegetables.jpg');
    } else {
      setImageError(true);
    }
  };

  const isDecreased = commodity.price_change < 0;
  const isIncreased = commodity.price_change > 0;

  // Fallback CSS gradient placeholder in case image fails
  const renderFallbackImage = () => (
    <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-slate-100 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#087443] flex items-center justify-center font-bold text-xl mb-1">
        ৳
      </div>
      <span className="text-xs font-semibold text-slate-700 truncate max-w-full">
        {language === 'bn' ? commodity.name_bn : commodity.name_en}
      </span>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-0.5">
      
      {/* Top Media Container */}
      <div className="relative h-44 sm:h-48 bg-slate-50 overflow-hidden flex items-center justify-center">
        
        {/* Product Image */}
        {!imageError ? (
          <img
            src={imgSrc}
            alt={commodity.name_bn}
            onError={handleImgError}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          renderFallbackImage()
        )}

        {/* Change Badge (Top Left) */}
        <div className="absolute top-2.5 left-2.5">
          {isDecreased && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xs">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{Math.abs(commodity.price_change_percent).toFixed(1)}%</span>
            </span>
          )}
          {isIncreased && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{commodity.price_change_percent.toFixed(1)}%</span>
            </span>
          )}
          {!isDecreased && !isIncreased && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100/90 text-slate-600 backdrop-blur-xs border border-slate-200">
              <Minus className="w-3 h-3" />
              <span>{language === 'bn' ? 'অপরিবর্তিত' : 'Stable'}</span>
            </span>
          )}
        </div>

        {/* Favorite & Alert Quick Actions (Top Right) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <button
            onClick={() => onSetAlert(commodity)}
            className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-600 hover:text-amber-600 shadow-xs backdrop-blur-xs transition-colors"
            title={language === 'bn' ? 'মূল্য সতর্কতা সেট করুন' : 'Set Price Alert'}
          >
            <BellRing className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleFavorite(commodity.product_id)}
            className={`p-1.5 rounded-lg shadow-xs backdrop-blur-xs transition-colors ${
              isFavorite
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white'
            }`}
            title={language === 'bn' ? 'পছন্দের তালিকায় রাখুন' : 'Save to Watchlist'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-600' : ''}`} />
          </button>
        </div>

        {/* Source & Market Micro-capsule (Bottom Left of Media) */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white/90 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-md">
          <div className="flex items-center gap-1 truncate max-w-[130px]">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{commodity.market_name_bn}</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            <span>{commodity.source_code}</span>
          </div>
        </div>

      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category */}
          <div className="text-[11px] font-medium text-slate-400 mb-1">
            {language === 'bn' ? commodity.category_name_bn : commodity.category_name_en}
          </div>

          {/* Product Name */}
          <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#087443] transition-colors line-clamp-1 mb-1">
            {language === 'bn' ? commodity.name_bn : commodity.name_en}
          </h3>

          {/* Price Range Pill */}
          <div className="text-[11px] text-slate-500 mb-3 flex items-center justify-between bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            <span>{language === 'bn' ? 'বাজার সীমা:' : 'Range:'}</span>
            <span className="font-semibold text-slate-700 tabular-nums">
              ৳{commodity.min_price} – ৳{commodity.max_price}
            </span>
          </div>
        </div>

        {/* Price Row & Action */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums leading-none">
                ৳{commodity.current_price}{' '}
                <span className="text-xs font-normal text-slate-500">
                  /{commodity.unit}
                </span>
              </div>
              {commodity.previous_price !== commodity.current_price && (
                <div className="text-xs text-slate-400 line-through tabular-nums mt-0.5">
                  {language === 'bn' ? 'গতকাল:' : 'Prev:'} ৳{commodity.previous_price}
                </div>
              )}
            </div>

            {/* Difference Note */}
            <div className="text-right">
              {isDecreased && (
                <span className="text-xs font-bold text-emerald-600 tabular-nums">
                  -৳{Math.abs(commodity.price_change)} {language === 'bn' ? 'কমেছে' : 'drop'}
                </span>
              )}
              {isIncreased && (
                <span className="text-xs font-bold text-rose-600 tabular-nums">
                  +৳{commodity.price_change} {language === 'bn' ? 'বেড়েছে' : 'rise'}
                </span>
              )}
            </div>
          </div>

          {/* Dual Action Buttons: User Edit & Price History */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenEdit(commodity)}
              className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-[#087443] text-[#087443] hover:text-white border border-emerald-200 text-xs font-bold transition-all flex items-center justify-center gap-1 group/edit cursor-pointer shadow-2xs"
              title={language === 'bn' ? 'দর ও ছবি এডিট করুন' : 'Edit price & photo'}
            >
              <Edit3 className="w-3.5 h-3.5 group-hover/edit:rotate-6 transition-transform" />
              <span>{language === 'bn' ? 'দর এডিট' : 'Edit'}</span>
            </button>
            
            <button
              type="button"
              onClick={() => onOpenHistory(commodity)}
              className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 group/btn cursor-pointer"
              title={language === 'bn' ? 'মূল্য বিশ্লেষণ ও ইতিহাস' : 'Price History & Trends'}
            >
              <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'bn' ? 'ইতিহাস' : 'History'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

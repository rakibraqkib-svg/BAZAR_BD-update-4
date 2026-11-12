import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  DollarSign,
  Tag,
  Building2,
  Layers,
  Info
} from 'lucide-react';
import { Product, CommodityDisplayItem, Category, Market, UnitType, Language } from '../types';
import { bazarStore } from '../services/store';

interface UserProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  mode: 'add' | 'edit';
  targetCommodity?: CommodityDisplayItem | null;
  categories: Category[];
  markets: Market[];
  onSuccess?: () => void;
}

const PRESET_IMAGES = [
  { label_bn: 'শাকসবজি', label_en: 'Vegetables', url: '/images/vegetables.jpg' },
  { label_bn: 'চাল ও খাদ্যশস্য', label_en: 'Rice & Grains', url: '/images/rice.jpg' },
  { label_bn: 'মাছ ও সামুদ্রিক', label_en: 'Fish', url: '/images/fish.jpg' },
  { label_bn: 'মাংস ও পোল্ট্রি', label_en: 'Meat', url: '/images/meat.jpg' },
  { label_bn: 'ডিম ও দুগ্ধ', label_en: 'Dairy & Eggs', url: '/images/dairy.jpg' },
  { label_bn: 'ভোজ্যতেল', label_en: 'Cooking Oil', url: '/images/oil.jpg' },
  { label_bn: 'ডাল ও ডালজাতীয়', label_en: 'Pulses', url: '/images/pulses.jpg' },
  { label_bn: 'ফলমূল', label_en: 'Fruits', url: '/images/fruits.jpg' },
  { label_bn: 'মশলাপাতি', label_en: 'Spices', url: '/images/spices.jpg' },
];

export const UserProductModal: React.FC<UserProductModalProps> = ({
  isOpen,
  onClose,
  language,
  mode,
  targetCommodity,
  categories,
  markets,
  onSuccess
}) => {
  if (!isOpen) return null;

  const allProducts = bazarStore.getProducts();

  // Selected product when editing
  const [selectedProductId, setSelectedProductId] = useState<string>(
    targetCommodity?.product_id || (allProducts[0]?.id || '')
  );

  // Form Fields
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-veg');
  const [unit, setUnit] = useState<UnitType>('কেজি');
  const [imageUrl, setImageUrl] = useState('/images/vegetables.jpg');
  const [imagePreview, setImagePreview] = useState('/images/vegetables.jpg');
  
  // Price Fields
  const [currentPrice, setCurrentPrice] = useState<number>(50);
  const [previousPrice, setPreviousPrice] = useState<number>(50);
  const [minPrice, setMinPrice] = useState<number>(45);
  const [maxPrice, setMaxPrice] = useState<number>(55);
  const [selectedMarketId, setSelectedMarketId] = useState<string>(
    targetCommodity?.market_id || markets[0]?.id || 'mkt-1'
  );

  const [notificationMsg, setNotificationMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load target or selected product data
  useEffect(() => {
    setErrorMsg('');
    if (mode === 'edit') {
      const prodToLoad = targetCommodity 
        ? allProducts.find(p => p.id === targetCommodity.product_id)
        : allProducts.find(p => p.id === selectedProductId);

      if (prodToLoad) {
        setNameBn(prodToLoad.name_bn);
        setNameEn(prodToLoad.name_en);
        setCategoryId(prodToLoad.category_id);
        setUnit(prodToLoad.default_unit);
        setImageUrl(prodToLoad.image_url || '/images/vegetables.jpg');
        setImagePreview(prodToLoad.image_url || '/images/vegetables.jpg');

        if (targetCommodity) {
          setCurrentPrice(targetCommodity.current_price);
          setPreviousPrice(targetCommodity.previous_price);
          setMinPrice(targetCommodity.min_price);
          setMaxPrice(targetCommodity.max_price);
          setSelectedMarketId(targetCommodity.market_id);
        } else {
          // Look up current price in selected market
          const mktPrice = bazarStore.getPrices().find(
            p => p.product_id === prodToLoad.id && p.market_id === selectedMarketId
          );
          if (mktPrice) {
            setCurrentPrice(mktPrice.price);
            setPreviousPrice(mktPrice.previous_price);
            setMinPrice(mktPrice.min_price);
            setMaxPrice(mktPrice.max_price);
          }
        }
      }
    } else {
      // Add mode defaults
      setNameBn('');
      setNameEn('');
      setCategoryId(categories[0]?.id || 'cat-veg');
      setUnit('কেজি');
      setImageUrl('/images/vegetables.jpg');
      setImagePreview('/images/vegetables.jpg');
      setCurrentPrice(60);
      setPreviousPrice(60);
      setMinPrice(55);
      setMaxPrice(65);
    }
  }, [mode, targetCommodity, selectedProductId]);

  // When changing product in edit mode dropdown
  const handleSelectProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = allProducts.find(p => p.id === prodId);
    if (prod) {
      setNameBn(prod.name_bn);
      setNameEn(prod.name_en);
      setCategoryId(prod.category_id);
      setUnit(prod.default_unit);
      setImageUrl(prod.image_url || '/images/vegetables.jpg');
      setImagePreview(prod.image_url || '/images/vegetables.jpg');

      const mktPrice = bazarStore.getPrices().find(
        p => p.product_id === prodId && p.market_id === selectedMarketId
      );
      if (mktPrice) {
        setCurrentPrice(mktPrice.price);
        setPreviousPrice(mktPrice.previous_price);
        setMinPrice(mktPrice.min_price);
        setMaxPrice(mktPrice.max_price);
      }
    }
  };

  // Compress uploaded raster image to <= 800px JPEG so it persists rapidly in JSON/Supabase
  const compressImageDataUrl = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setErrorMsg(language === 'bn' ? 'ছবির সাইজ সর্বোচ্চ ৪ মেগাবাইট হতে পারবে।' : 'Image size must be under 4MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImageDataUrl(reader.result);
          setImageUrl(compressed);
          setImagePreview(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nameBn.trim()) {
      setErrorMsg(language === 'bn' ? 'অনুগ্রহ করে পণ্যের বাংলা নাম লিখুন।' : 'Please enter product name in Bengali.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'add') {
        // 1. Create new product
        const newProd = bazarStore.addProduct({
          name_bn: nameBn.trim(),
          name_en: nameEn.trim() || nameBn.trim(),
          category_id: categoryId,
          default_unit: unit,
          image_url: imageUrl || '/images/vegetables.jpg',
          is_active: true,
        });

        // 2. Set price for market
        bazarStore.updatePrice(
          newProd.id,
          selectedMarketId,
          Number(currentPrice),
          Number(previousPrice) || Number(currentPrice),
          Number(minPrice) || Number(currentPrice) - 5,
          Number(maxPrice) || Number(currentPrice) + 5,
          'src-tcb'
        );

        setNotificationMsg(language === 'bn' ? 'পণ্যটি সফলভাবে যোগ করা হয়েছে!' : 'Product added successfully!');
      } else {
        // Edit mode
        const prodIdToUpdate = targetCommodity?.product_id || selectedProductId;
        if (prodIdToUpdate) {
          // Update product info & image
          bazarStore.updateProduct(prodIdToUpdate, {
            name_bn: nameBn.trim(),
            name_en: nameEn.trim() || nameBn.trim(),
            category_id: categoryId,
            default_unit: unit,
            image_url: imageUrl || '/images/vegetables.jpg',
          });

          // Update price in market
          bazarStore.updatePrice(
            prodIdToUpdate,
            selectedMarketId,
            Number(currentPrice),
            Number(previousPrice),
            Number(minPrice),
            Number(maxPrice),
            'src-tcb'
          );

          setNotificationMsg(language === 'bn' ? 'পণ্যের তথ্য ও বাজারদর সফলভাবে আপডেট হয়েছে!' : 'Product and price updated successfully!');
        }
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setNotificationMsg('');
        if (onSuccess) onSuccess();
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setErrorMsg(language === 'bn' ? 'পণ্য সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Error updating product. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-[#087443] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {mode === 'add'
                  ? (language === 'bn' ? 'নতুন পণ্য যোগ করুন' : 'Add New Commodity')
                  : (language === 'bn' ? 'পণ্য এডিট ও বাজারদর আপডেট' : 'Edit Commodity & Price')}
              </h2>
              <p className="text-xs text-emerald-100">
                {language === 'bn'
                  ? 'দৈনিক নিত্যপণ্যের বাজারদর ও ছবি আপডেট করুন'
                  : 'Update daily market prices and commodity photos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Permission Badge Note */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            {language === 'bn'
              ? 'ব্যবহারকারী হিসেবে আপনি পণ্য যোগ, দর আপডেট ও ছবি পরিবর্তন করতে পারবেন (পণ্য ডিলিট করার অনুমতি শুধুমাত্র সিস্টেম অ্যাডমিনের জন্য সংরক্ষিত)।'
              : 'As a user you can add/edit products, update prices and photos (deletion is reserved for Admin).'}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Error Toast */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Notification Toast */}
          {notificationMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
          )}

          {/* Mode Selector / Product Picker in Edit Mode */}
          {mode === 'edit' && !targetCommodity && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#087443]" />
                <span>{language === 'bn' ? 'কোন পণ্যটি এডিট করতে চান নির্বাচন করুন:' : 'Select commodity to edit:'}</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProductChange(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#087443]"
              >
                {allProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name_bn} ({p.name_en}) - {categories.find(c => c.id === p.category_id)?.name_bn || ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Basic Details: Name and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'পণ্যের নাম (বাংলা) *' : 'Product Name (Bangla) *'}
              </label>
              <input
                type="text"
                required
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমন: দেশি পেঁয়াজ, লাল টমেটো, রুই মাছ..."
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087443]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'পণ্যের নাম (English)' : 'Product Name (English)'}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Deshi Onion, Tomato, Rui Fish..."
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087443]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087443]"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name_bn} ({c.name_en})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'পরিমাপের একক (Unit)' : 'Measurement Unit'}
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087443]"
              >
                <option value="কেজি">কেজি (kg)</option>
                <option value="লিটার">লিটার (liter)</option>
                <option value="ডজন">ডজন (12 pcs)</option>
                <option value="হালি">হালি (4 pcs)</option>
                <option value="পিস">পিস (piece)</option>
              </select>
            </div>
          </div>

          {/* Pricing & Market Section */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#087443]" />
                <span>{language === 'bn' ? 'বাজার ও আজকের মূল্য নির্ধারণ' : 'Market & Daily Price Settings'}</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                লাইভ বাজারদর
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'বাজারের নাম' : 'Select Market'}
              </label>
              <select
                value={selectedMarketId}
                onChange={(e) => setSelectedMarketId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#087443]"
              >
                {markets.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name_bn} ({m.location})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'আজকের দর (৳) *' : "Today's Price *"}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(Number(e.target.value))}
                  className="w-full text-xs font-bold bg-white border border-emerald-300 rounded-xl p-2.5 text-[#087443] focus:outline-none focus:ring-2 focus:ring-[#087443]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'গতকালের দর (৳)' : "Prev Price"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={previousPrice}
                  onChange={(e) => setPreviousPrice(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'সর্বনিম্ন দর (৳)' : "Min Price"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'সর্বোচ্চ দর (৳)' : "Max Price"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Product Image Upload & Presets */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#087443]" />
                <span>{language === 'bn' ? 'পণ্যের ছবি পরিবর্তন বা আপলোড' : 'Change or Upload Product Photo'}</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                {language === 'bn' ? 'ডিভাইস থেকে ফাইল নির্বাচন করুন অথবা প্রিসেট ছবি বেছে নিন' : 'Upload file or pick preset'}
              </span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              {/* Image Preview Box */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-2xs relative group">
                <img
                  src={imagePreview}
                  alt="Preview"
                  onError={() => setImagePreview('/images/vegetables.jpg')}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 w-full space-y-2">
                {/* Upload Button */}
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'কম্পিউটার/মোবাইল থেকে ছবি আপলোড' : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {language === 'bn' ? '(সর্বোচ্চ ২ MB)' : '(Max 2MB)'}
                  </span>
                </div>

                {/* Custom URL Input */}
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreview(e.target.value);
                  }}
                  placeholder="অথবা সরাসরি ছবির লিঙ্ক/পাথ দিন (/images/...)"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#087443]"
                />
              </div>
            </div>

            {/* Quick Presets Grid */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                {language === 'bn' ? 'দ্রুত প্রিসেট ছবি বেছে নিন:' : 'Or pick a quick commodity preset:'}
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImageUrl(preset.url);
                      setImagePreview(preset.url);
                    }}
                    className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-left transition-all ${
                      imageUrl === preset.url
                        ? 'bg-emerald-50 border-[#087443] ring-1 ring-[#087443]'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label_bn} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-700 truncate">
                      {language === 'bn' ? preset.label_bn : preset.label_en}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065e36] text-white text-xs font-bold shadow-md shadow-emerald-900/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {mode === 'add'
                  ? (language === 'bn' ? 'পণ্য সংরক্ষণ করুন' : 'Save Commodity')
                  : (language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Update Commodity')}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

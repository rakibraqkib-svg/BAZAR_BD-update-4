import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Language } from '../types';
import { bazarStore } from '../services/store';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  language
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    setErrorMsg('');
    setIsVerifying(true);

    try {
      const valid = await bazarStore.verifyAdminPin(pin);
      if (valid) {
        setIsSuccess(true);
        localStorage.setItem('bazarbd_admin_auth', 'true');
        setTimeout(() => {
          setIsSuccess(false);
          setPin('');
          setIsVerifying(false);
          onSuccess();
          onClose();
        }, 400);
      } else {
        setIsVerifying(false);
        setErrorMsg(
          language === 'bn'
            ? 'ভুল পিন কোড! অ্যাক্সেস প্রত্যাখ্যাত। শুধুমাত্র অনুমোদিত সাইট অ্যাডমিন প্রবেশ করতে পারবেন।'
            : 'Access Denied: Incorrect Admin PIN. Authorization required.'
        );
      }
    } catch {
      setIsVerifying(false);
      setErrorMsg(
        language === 'bn'
          ? 'যাচাই করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Verification failed. Please try again.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'bn' ? 'অ্যাডমিন সিকিউরিটি গেট' : 'Admin Security Gate'}
              </h3>
              <p className="text-xs text-slate-300">
                {language === 'bn' ? 'সাইট কন্ট্রোল ও ম্যানেজমেন্ট' : 'Platform administration'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Admin Login"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
            <p className="font-semibold text-slate-800">
              {language === 'bn'
                ? 'অ্যাডমিন প্যানেলটি সুরক্ষিত রাখা হয়েছে।'
                : 'The Admin panel is strictly secured.'}
            </p>
            <p className="text-[11px] text-slate-500">
              {language === 'bn'
                ? 'অনুমোদিত প্রবেশাধিকার পেতে আপনার গোপন অ্যাডমিন পিন প্রদান করুন।'
                : 'Enter your confidential Admin security PIN to proceed.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{language === 'bn' ? 'অনুমোদন সফল হয়েছে! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...' : 'Authorization verified! Opening dashboard...'}</span>
            </div>
          )}

          <div>
            <label htmlFor="admin-secret-pin-input" className="text-xs font-bold text-slate-700 block mb-1.5">
              {language === 'bn' ? 'গোপন অ্যাডমিন পিন' : 'Admin Secret PIN'}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-secret-pin-input"
                type={showPin ? 'text' : 'password'}
                required
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full pl-10 pr-10 py-3 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087443] text-slate-900 tracking-widest"
              />
              <button
                type="button"
                aria-label="Toggle PIN visibility"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-6 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065e36] text-white text-xs font-bold shadow-md shadow-emerald-900/10 transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{language === 'bn' ? 'লগইন' : 'Authenticate'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

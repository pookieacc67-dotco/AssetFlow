import React, { useState, useEffect } from "react";
import { Monitor, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const MobileNotice: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("af_mobile_notice_dismissed");
    if (dismissed) return;

    // Check if screen is mobile viewport
    const checkMobile = () => {
      const isMobileScreen = window.innerWidth < 768;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileScreen || isMobileUserAgent) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("af_mobile_notice_dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-neutral-100 flex flex-col gap-4 text-left relative overflow-hidden"
        >
          {/* Subtle top ambient gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF4D8D] via-[#FFA35C] to-indigo-500" />

          {/* Close button */}
          <button 
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon visual */}
          <div className="flex items-center gap-3 mt-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#15161A] to-neutral-800 text-white flex items-center justify-center shadow-md">
              <Monitor className="w-6 h-6 text-[#FFA35C]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Best on Desktop
              </span>
              <h3 className="text-base font-bold text-[#15161A]">Desktop Mode Advised</h3>
            </div>
          </div>

          <p className="text-xs text-neutral-600 leading-relaxed">
            AssetFlow is an enterprise workspace designed for desktop screens. If using a mobile phone, please switch to <strong>Desktop Mode</strong>:
          </p>

          {/* Step by step tips */}
          <div className="bg-neutral-50 rounded-2xl p-3.5 flex flex-col gap-2 border border-neutral-100 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#15161A] shrink-0">Android (Chrome):</span>
              <span className="text-neutral-600">Tap <strong>⋮</strong> (menu) → Check <strong>Desktop site</strong></span>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-neutral-200/60">
              <span className="font-bold text-[#15161A] shrink-0">iOS (Safari):</span>
              <span className="text-neutral-600">Tap <strong>aA</strong> in address bar → Tap <strong>Request Desktop Website</strong></span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button 
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              I Understand / Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

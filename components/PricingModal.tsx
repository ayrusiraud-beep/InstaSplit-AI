
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onEarnCoins: (amount: number) => void;
  currentCoins: number;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onUpgrade, onEarnCoins, currentCoins }) => {
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const timerRef = useRef<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
        setIsWatchingAd(false);
        setCountdown(4);
    }
    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleWatchAd = () => {
      setIsWatchingAd(true);
      setCountdown(4);
      
      const tick = (secondsLeft: number) => {
          if (secondsLeft <= 0) {
              setIsWatchingAd(false);
              onEarnCoins(50);
              return;
          }
          setCountdown(secondsLeft);
          timerRef.current = window.setTimeout(() => tick(secondsLeft - 1), 1000);
      };
      
      tick(4);
  };

  const handleClose = () => {
      // Prevent closing if currently watching an ad
      if (isWatchingAd) return;
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Disable backdrop click if watching ad */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={handleClose} 
      />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row gap-6">
        
        {/* Pro Plan Section */}
        <div className={`flex-1 space-y-4 ${isWatchingAd ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-yellow-500 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-pink-500/20 mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-white">Go Pro</h2>
                <p className="text-zinc-400 text-xs mt-1">Unlock the full power of Veo</p>
            </div>

            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3 text-left">
                <div className="flex items-center gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-xs text-zinc-300 font-bold">Unlimited Veo Video Generation</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-xs text-zinc-300">Fast Priority Processing</span>
                </div>
                 <div className="flex items-center gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-xs text-zinc-300">No Watermarks</span>
                </div>
                 <div className="flex items-center gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-xs text-zinc-300">Unlimited Photos (Included)</span>
                </div>
            </div>

            <Button onClick={() => { onUpgrade(); onClose(); }} fullWidth className="py-3 text-sm">
                Upgrade - $9.99/mo
            </Button>
        </div>

        {/* Vertical Divider */}
        <div className="hidden md:block w-px bg-zinc-800"></div>
        <div className="md:hidden h-px bg-zinc-800 w-full"></div>

        {/* Coin Section */}
        <div className="flex-1 space-y-4 flex flex-col justify-between">
            <div className="text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl mx-auto flex items-center justify-center mb-3">
                    <span className="text-2xl">🪙</span>
                </div>
                <h2 className="text-xl font-bold text-white">Earn Coins</h2>
                <p className="text-zinc-400 text-xs mt-1">Watch ads to generate videos for free</p>
                
                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-yellow-500 font-bold text-lg">{currentCoins}</p>
                    <p className="text-yellow-500/70 text-[10px] uppercase tracking-wider">Current Balance</p>
                </div>
            </div>

            <div>
                <p className="text-zinc-500 text-[10px] text-center mb-3">1 Video = 50 Coins (Photos are Free)</p>
                {isWatchingAd ? (
                    <div className="bg-black border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center h-[52px]">
                         <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-yellow-500 font-medium">Reward in {countdown}s...</span>
                         </div>
                    </div>
                ) : (
                    <button 
                        onClick={handleWatchAd}
                        className="w-full py-3 rounded-xl font-semibold text-sm bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center gap-2 transition-all"
                    >
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21.41 11.58l-9-5C11.81 6.17 11 6.6 11 7.42v1.54l-7.38-4.1C2.62 4.29 1.5 5 1.5 6.18v11.64c0 1.18 1.12 1.89 2.12 1.32l7.38-4.1v1.54c0 .82.81 1.25 1.41.84l9-5c.6-.34.6-1.26 0-1.6z"/></svg>
                        Watch Ad (+50 Coins)
                    </button>
                )}
            </div>
            
            <button 
                onClick={handleClose} 
                className={`text-xs text-zinc-600 hover:text-zinc-400 text-center w-full ${isWatchingAd ? 'opacity-0 cursor-default' : ''}`}
            >
                Close
            </button>
        </div>

      </div>
    </div>
  );
};

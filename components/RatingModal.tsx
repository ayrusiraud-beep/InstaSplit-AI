
import React, { useState } from 'react';
import { Button } from './Button';

interface RatingModalProps {
  isOpen: boolean;
  onRate: (rating: number) => void;
  onClose: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onRate, onClose }) => {
  const [rating, setRating] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
        <div className="mb-4 text-4xl">⭐</div>
        <h2 className="text-xl font-bold text-white mb-2">Enjoying InstaSplit?</h2>
        <p className="text-zinc-400 text-sm mb-6">Tap a star to rate it on the App Store.</p>

        <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                >
                    <svg 
                        className={`w-8 h-8 ${rating >= star ? 'text-yellow-400 fill-current' : 'text-zinc-700 fill-current'}`} 
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                </button>
            ))}
        </div>

        <div className="space-y-3">
            <Button 
                onClick={() => { onRate(rating); onClose(); }} 
                fullWidth 
                disabled={rating === 0}
            >
                Submit Rating
            </Button>
            <button 
                onClick={onClose} 
                className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
                Remind me later
            </button>
        </div>
      </div>
    </div>
  );
};

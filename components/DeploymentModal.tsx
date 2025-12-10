
import React from 'react';
import { Button } from './Button';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">Launch Your Own App 🚀</h2>
        <p className="text-zinc-400 text-sm mb-6">How to host InstaSplit AI for <span className="text-green-400 font-bold">$0 cost</span>.</p>

        <div className="space-y-6">
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center font-bold text-white border border-zinc-700">1</div>
                <div>
                    <h3 className="text-white font-medium">Export Code</h3>
                    <p className="text-xs text-zinc-500 mt-1">Click the "Export to Zip" button in your code editor to get the files.</p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center font-bold text-white border border-zinc-700">2</div>
                <div>
                    <h3 className="text-white font-medium">Push to GitHub</h3>
                    <p className="text-xs text-zinc-500 mt-1">Create a free GitHub repository and upload your files.</p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center font-bold text-white border border-zinc-700">3</div>
                <div>
                    <h3 className="text-white font-medium">Deploy on Vercel / Netlify</h3>
                    <p className="text-xs text-zinc-500 mt-1">Sign up for Vercel/Netlify (Free Tier). Import your GitHub repo. It will build automatically.</p>
                </div>
            </div>

             <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center font-bold text-white border border-zinc-700">4</div>
                <div>
                    <h3 className="text-white font-medium">Add API Key</h3>
                    <p className="text-xs text-zinc-500 mt-1">In Vercel Settings {'>'} Environment Variables, add <code>API_KEY</code> with your Google Gemini Key.</p>
                </div>
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
             <p className="text-[10px] text-zinc-500 mb-4">You can get a free API Key from <a href="https://aistudio.google.com" target="_blank" className="text-pink-500 hover:underline">Google AI Studio</a>.</p>
            <Button onClick={onClose} fullWidth variant="secondary">Got it</Button>
        </div>
      </div>
    </div>
  );
};

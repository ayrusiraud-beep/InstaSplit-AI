
import React, { useState } from 'react';
import { SplitSegment, SplitOptions } from '../types';
import { shareVideo } from '../services/geminiService';
import { renderClip } from '../services/videoService';

interface SplitResultCardProps {
  segment: SplitSegment;
  videoUrl: string;
  isPro: boolean;
  options?: SplitOptions;
}

export const SplitResultCard: React.FC<SplitResultCardProps> = ({ segment, videoUrl, isPro, options }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showWatermark, setShowWatermark] = useState(true);

  // Use the time fragment for preview only
  const previewSrc = `${videoUrl}#t=${segment.startTime},${segment.endTime}`;
  const targetRatio = options?.aspectRatio || 'Original';

  const handleExport = async (action: 'download' | 'share') => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
        let finalUrl = downloadUrl;

        // If we don't have a url yet
        if (!finalUrl) {
            const blob = await renderClip(videoUrl, segment.startTime, segment.endTime, targetRatio, (p) => setProgress(p));
            finalUrl = URL.createObjectURL(blob);
            setDownloadUrl(finalUrl);
        }

        const fileName = `instasplit-${segment.title.replace(/\s+/g, '-').toLowerCase()}.mp4`;

        if (action === 'download') {
            const a = document.createElement('a');
            a.href = finalUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else if (action === 'share') {
            await shareVideo(finalUrl, segment.title);
        }

    } catch (e) {
        console.error(e);
        alert("Failed to export clip. Browser may not support this operation.");
    } finally {
        setIsProcessing(false);
        setProgress(0);
    }
  };

  const scoreColor = segment.viralScore > 80 ? 'text-green-400' : segment.viralScore > 50 ? 'text-yellow-400' : 'text-zinc-400';
  const isTopTier = segment.viralScore >= 80;
  
  // Determine preview container class based on requested crop, not just original isLandscape
  let aspectRatioClass = 'aspect-[9/16]';
  if (targetRatio === '16:9') aspectRatioClass = 'aspect-video';
  if (targetRatio === '1:1') aspectRatioClass = 'aspect-square';
  if (targetRatio === 'Original') aspectRatioClass = segment.isLandscape ? 'aspect-video' : 'aspect-[9/16]';


  return (
    <div className="bg-black border border-zinc-800 rounded-3xl overflow-hidden flex flex-col hover:border-zinc-600 transition-colors shadow-2xl mx-auto w-full max-w-sm relative group">
      {/* Header */}
      <div className="p-3 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800 relative z-10">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">AI</span>
                </div>
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Instasplit AI</span>
                <span className="text-[10px] text-zinc-400">@{segment.hashtags[0]?.replace('#','') || 'instasplit'}</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
             {/* Watermark Toggle - Premium Feature */}
             {isPro ? (
                 <label className="flex items-center cursor-pointer relative select-none group/toggle" title="Toggle Watermark">
                    <input type="checkbox" className="sr-only peer" checked={showWatermark} onChange={() => setShowWatermark(!showWatermark)} />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                    <span className="text-[10px] ml-2 text-zinc-500 font-medium group-hover/toggle:text-pink-400 transition-colors">WM</span>
                 </label>
             ) : (
                <div className="flex items-center gap-1 opacity-50 cursor-not-allowed" title="Upgrade to toggle watermark">
                    <div className="w-9 h-5 bg-zinc-800 rounded-full border border-zinc-700 relative">
                         <div className="absolute top-[2px] right-[2px] bg-zinc-600 h-4 w-4 rounded-full"></div>
                    </div>
                    <span className="text-[10px] ml-1 text-zinc-600">PRO</span>
                </div>
             )}
        </div>
      </div>

      {/* Video Content */}
      <div className={`relative ${aspectRatioClass} bg-zinc-900 transition-all duration-300`}>
        
        {/* Top Tier Badge (Star) */}
        {isTopTier && (
            <div className="absolute top-2 left-2 z-20 animate-in fade-in zoom-in duration-500 delay-300">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-yellow-500/20 border border-white/20">
                    <svg className="w-3 h-3 fill-black" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    <span>VEO CHOICE</span>
                </div>
            </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
            <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
                <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h4 className="text-white font-bold text-lg mb-1">Creating Clip...</h4>
                <p className="text-zinc-400 text-xs mb-4 text-center">Please keep this tab active</p>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-pink-500 h-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-pink-500 text-xs mt-2 font-mono">{progress}%</span>
            </div>
        )}

        {/* Note: The preview video uses CSS object-cover to simulate crop preview, actual crop happens in renderClip */}
        <video 
            src={previewSrc}
            controls
            className={`w-full h-full ${targetRatio === 'Original' ? 'object-contain' : 'object-cover'}`}
            preload="metadata"
        />
        
        {/* Improved Watermark Element with Logo and Border */}
        {showWatermark && (
            <div className="absolute top-2 right-2 z-20 pointer-events-none select-none">
                <div className="flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-md border border-white/10 shadow-sm animate-in fade-in duration-300">
                    {/* Real App Logo */}
                    <svg viewBox="0 0 48 48" className="w-3.5 h-3.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                        <linearGradient id="wm_gradient" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#f09433" />
                            <stop offset="25%" stopColor="#e6683c" />
                            <stop offset="50%" stopColor="#dc2743" />
                            <stop offset="75%" stopColor="#cc2366" />
                            <stop offset="100%" stopColor="#bc1888" />
                        </linearGradient>
                        </defs>
                        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#wm_gradient)" />
                        <path d="M24 10L27 21L38 24L27 27L24 38L21 27L10 24L21 21L24 10Z" fill="white" />
                    </svg>
                    <span className="font-bold text-white text-[8px] tracking-widest uppercase drop-shadow-sm opacity-90">
                        InstaSplit AI
                    </span>
                </div>
            </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col gap-3 items-center z-10">
             <div className="flex flex-col items-center gap-1 group/score cursor-help relative">
                 <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-zinc-700 flex items-center justify-center shadow-lg">
                    <span className={`font-bold ${scoreColor} text-sm`}>{segment.viralScore}</span>
                 </div>
                 {/* Tooltip for Explanation */}
                 <div className="absolute right-12 bottom-0 w-48 bg-black/90 p-3 rounded-xl border border-zinc-800 text-xs opacity-0 group-hover/score:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                    <p className="font-bold text-white mb-1">AI Ranking:</p>
                    <p className="text-zinc-400 leading-relaxed italic">"{segment.explanation}"</p>
                 </div>
             </div>
        </div>
      </div>
      
      {/* Caption Section */}
      <div className="p-4 flex flex-col gap-3">
        <h3 className="font-bold text-white leading-tight text-sm">{segment.title}</h3>
        
        <p className="text-xs text-zinc-300 line-clamp-2">
            {segment.description}
        </p>

        <div className="flex flex-wrap gap-1">
            {segment.hashtags && segment.hashtags.map(tag => (
                <span key={tag} className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors bg-blue-500/10 px-1.5 py-0.5 rounded">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
            ))}
        </div>
        
        <div className="mt-2 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2 text-xs text-zinc-500 font-mono">
             <button 
                onClick={() => handleExport('share')}
                disabled={isProcessing}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7 0-.24-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                Share
            </button>
            <button 
                onClick={() => handleExport('download')}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isProcessing ? (
                    <>
                        <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        Cropping...
                    </>
                ) : (
                    <>
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                         Save {targetRatio}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

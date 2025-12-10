
import React, { useEffect, useState, useRef } from 'react';
import { GeneratedMedia } from '../types';
import { fetchAuthenticatedVideoUrl, shareVideo } from '../services/geminiService';

interface MediaCardProps {
  video: GeneratedMedia; // Keeping prop name 'video' to minimize churn, but it's media
}

export const VideoCard: React.FC<MediaCardProps> = ({ video }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMedia = async () => {
        try {
            if (video.type === 'video') {
                 const url = await fetchAuthenticatedVideoUrl(video.uri);
                 if (isMounted) setMediaUrl(url);
            } else {
                // Images are already base64 data URIs
                if (isMounted) setMediaUrl(video.uri);
            }
        } catch (e) {
            console.error(e);
            if (isMounted) setError(true);
        }
    };
    loadMedia();
    return () => {
        isMounted = false;
    };
  }, [video.uri, video.type]);

  const handleShare = async () => {
      if (!mediaUrl) return;
      setIsSharing(true);
      try {
          if (video.type === 'video') {
            await shareVideo(mediaUrl, video.prompt);
          } else {
             // Share Image Logic
             const response = await fetch(mediaUrl);
             const blob = await response.blob();
             const file = new File([blob], `instasplit-image.jpg`, { type: 'image/jpeg' });
             if (navigator.canShare && navigator.canShare({ files: [file] })) {
                 await navigator.share({ files: [file], title: video.prompt });
             } else {
                 alert("Sharing not supported. Please download.");
             }
          }
      } catch (e) {
          alert("Sharing failed or not supported.");
      } finally {
          setIsSharing(false);
      }
  };

  // Determine container aspect ratio class
  const getAspectRatioClass = (ratio: string) => {
      switch(ratio) {
          case '16:9': return 'aspect-video';
          case '9:16': return 'aspect-[9/16]';
          case '1:1': return 'aspect-square';
          case '4:3': return 'aspect-[4/3]';
          case '3:4': return 'aspect-[3/4]';
          default: return 'aspect-[9/16]';
      }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative group">
      <div className={`relative w-full bg-black flex items-center justify-center ${getAspectRatioClass(video.aspectRatio)}`}>
        {mediaUrl ? (
          video.type === 'video' ? (
            <video 
                ref={videoRef}
                src={mediaUrl} 
                controls 
                preload="metadata"
                className="w-full h-full object-contain"
            />
          ) : (
            <img 
                src={mediaUrl}
                alt={video.prompt}
                className="w-full h-full object-contain"
            />
          )
        ) : error ? (
            <div className="text-red-500 text-sm p-4 flex items-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Failed to load media
            </div>
        ) : (
          <div className="w-full h-full bg-zinc-800/50 flex flex-col items-center justify-center gap-3">
             <div className="w-10 h-10 border-4 border-zinc-600 border-t-zinc-400 rounded-full animate-spin"></div>
             <span className="text-zinc-500 text-sm animate-pulse">Loading {video.type === 'image' ? 'Image' : 'Video'}...</span>
          </div>
        )}
        
        {/* Type Badge */}
        <div className="absolute top-3 left-3 flex gap-2">
            <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-mono text-white border border-white/10 z-10">
                {video.aspectRatio}
            </div>
             <div className={`bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold border border-white/10 z-10 ${video.type === 'image' ? 'text-pink-400' : 'text-blue-400'}`}>
                {video.type === 'image' ? 'PHOTO' : 'VIDEO'}
            </div>
        </div>

        {/* Improved Watermark */}
        {video.hasWatermark && (
            <div className="absolute top-4 right-4 z-20 pointer-events-none opacity-90">
                <span className="font-bold text-white text-xs tracking-widest drop-shadow-lg shadow-black bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/20">
                    Ayrus_Iraud
                </span>
            </div>
        )}
      </div>
      
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{video.style || 'Standard'}</span>
            <span className="text-xs text-zinc-500">{new Date(video.timestamp).toLocaleTimeString()}</span>
        </div>
        <p className="text-sm text-zinc-300 font-medium line-clamp-2">{video.prompt}</p>
        
        <div className="pt-2 grid grid-cols-2 gap-3">
            <button 
                onClick={handleShare}
                disabled={!mediaUrl || isSharing}
                className={`flex items-center justify-center py-2.5 rounded-lg text-sm font-semibold transition-colors gap-2 ${
                    isSharing ? 'bg-zinc-800/50' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                } text-white`}
            >
                {isSharing ? '...' : (
                    <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7 0-.24-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                        Share
                    </>
                )}
            </button>
            <a 
                href={mediaUrl || '#'} 
                download={`instasplit-${video.id}.${video.type === 'video' ? 'mp4' : 'jpg'}`}
                className={`flex items-center justify-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    mediaUrl ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
                }`}
            >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
            </a>
        </div>
      </div>
    </div>
  );
};

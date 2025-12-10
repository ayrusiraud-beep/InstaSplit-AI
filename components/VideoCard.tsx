
import React, { useEffect, useState, useRef } from 'react';
import { GeneratedMedia } from '../types';
import { fetchAuthenticatedVideoUrl, shareMedia, downloadMedia } from '../services/geminiService';

interface MediaCardProps {
  video: GeneratedMedia;
}

export const VideoCard: React.FC<MediaCardProps> = ({ video }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMedia = async () => {
        try {
            if (video.type === 'video') {
                 const url = await fetchAuthenticatedVideoUrl(video.uri);
                 if (isMounted) setMediaUrl(url);
            } else {
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

  // Global Audio Manager: Pause others when this one plays
  useEffect(() => {
    const handleGlobalPlay = (e: CustomEvent) => {
        if (e.detail.id !== video.id && videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    window.addEventListener('instasplit-play', handleGlobalPlay as EventListener);
    return () => {
        window.removeEventListener('instasplit-play', handleGlobalPlay as EventListener);
    };
  }, [video.id]);

  const handlePlay = () => {
      setIsPlaying(true);
      // Notify others to stop
      const event = new CustomEvent('instasplit-play', { detail: { id: video.id } });
      window.dispatchEvent(event);
  };

  const handleShare = async () => {
      if (!mediaUrl) return;
      setIsSharing(true);
      try {
          const success = await shareMedia(mediaUrl, video.prompt, video.type);
          if (!success) {
               const ext = video.type === 'video' ? 'mp4' : 'jpg';
               downloadMedia(mediaUrl, `instasplit-${video.id}.${ext}`);
               alert("Sharing unavailable. File downloaded.");
          }
      } catch (e) {
          alert("Sharing failed.");
      } finally {
          setIsSharing(false);
      }
  };

  const togglePlay = () => {
      if (!videoRef.current) return;
      if (videoRef.current.paused) {
          videoRef.current.play();
          // setIsPlaying is handled by onPlay
      } else {
          videoRef.current.pause();
          // setIsPlaying is handled by onPause
      }
  };

  const toggleMute = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!videoRef.current) return;
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!videoRef.current) return;
      if (document.fullscreenElement) {
          document.exitFullscreen();
      } else {
          videoRef.current.requestFullscreen();
      }
  };

  const handleTimeUpdate = () => {
      if (videoRef.current) {
          const current = videoRef.current.currentTime;
          const total = videoRef.current.duration;
          setProgress((current / total) * 100);
      }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (videoRef.current) {
          const time = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
          videoRef.current.currentTime = time;
          setProgress(parseFloat(e.target.value));
      }
  };

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
      <div className={`relative w-full bg-black flex items-center justify-center ${getAspectRatioClass(video.aspectRatio)} group/video`}>
        {mediaUrl ? (
          video.type === 'video' ? (
            <>
                <video 
                    ref={videoRef}
                    src={mediaUrl} 
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={togglePlay}
                    onPlay={handlePlay}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    playsInline
                />
                
                {/* Custom Controls Overlay */}
                <div className={`absolute inset-0 bg-black/30 transition-opacity duration-300 flex flex-col justify-end ${isPlaying ? 'opacity-0 group-hover/video:opacity-100' : 'opacity-100'}`}>
                    
                    {/* Center Play Button */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                                <svg className="w-8 h-8 text-white fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                    )}

                    {/* Bottom Control Bar */}
                    <div className="p-4 bg-gradient-to-t from-black/90 to-transparent pt-12 space-y-2">
                        {/* Progress Bar */}
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={progress} 
                            onChange={handleSeek}
                            className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                        />
                        
                        <div className="flex items-center justify-between">
                             <div onClick={togglePlay} className="cursor-pointer text-white hover:text-pink-500 transition-colors">
                                {isPlaying ? (
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                ) : (
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                )}
                             </div>

                             <div className="flex items-center gap-3">
                                 {/* Volume Toggle */}
                                 <button onClick={toggleMute} className="text-white hover:text-pink-500 transition-colors">
                                     {isMuted ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" stroke="currentColor"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                                     ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                     )}
                                 </button>
                                 
                                 {/* Fullscreen Toggle */}
                                 <button onClick={toggleFullscreen} className="text-white hover:text-pink-500 transition-colors">
                                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            </>
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
        <div className="absolute top-3 left-3 flex gap-2 pointer-events-none">
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

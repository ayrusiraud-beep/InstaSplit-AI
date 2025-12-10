
import React, { useState, useRef, useMemo } from 'react';
import { Button } from './Button';
import { Loader } from './Loader';
import { SplitDuration, SplitSegment, SplitOptions, SplitAspectRatio } from '../types';
import { analyzeVideoFrame, ensureApiKey } from '../services/geminiService';
import { SplitResultCard } from './SplitResultCard';
import { renderClip } from '../services/videoService';

interface VideoSplitterProps {
    onError: (msg: string) => void;
    isPro: boolean;
    currentUsage: number;
    limit: number;
    onUsageIncrement: (count: number) => void;
}

type SortMode = 'time' | 'score';

export const VideoSplitter: React.FC<VideoSplitterProps> = ({ onError, isPro, currentUsage, limit, onUsageIncrement }) => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  
  // Advanced State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<SplitOptions>({
      duration: 15,
      overlap: 0,
      minViralScore: 0,
      aspectRatio: 'Original'
  });

  const [sortBy, setSortBy] = useState<SortMode>('time'); // Default to Time for sequential behavior
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [segments, setSegments] = useState<SplitSegment[]>([]);
  const [progress, setProgress] = useState(0);

  // Batch Export State
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setVideoUrl(URL.createObjectURL(selectedFile));
      setVideoDuration(0); 
      setSegments([]);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const sortedSegments = useMemo(() => {
      const copy = [...segments];
      if (sortBy === 'time') {
          return copy.sort((a, b) => a.startTime - b.startTime);
      } else {
          return copy.sort((a, b) => b.viralScore - a.viralScore);
      }
  }, [segments, sortBy]);

  const handleProcess = async () => {
    if (!file || !videoRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    setSegments([]);
    setSortBy('time');
    setStatusText("Initializing Veo Engine...");

    try {
        await ensureApiKey();
        
        const vid = videoRef.current;
        const totalDuration = vid.duration;
        const isLandscape = vid.videoWidth > vid.videoHeight;
        
        const step = options.duration - options.overlap;
        if (step <= 0) throw new Error("Overlap must be smaller than duration");

        const estimatedCount = Math.ceil(totalDuration / step);
        const maxSegments = isPro ? 200 : 40; 
        
        let currentTime = 0;
        let processedCount = 0;
        
        const analysisPromises: Promise<void>[] = [];
        let completedAnalysisCount = 0;

        while (currentTime < totalDuration && processedCount < maxSegments) {
            
            const start = currentTime;
            let end = start + options.duration;
            
            if (end > totalDuration) {
                if (totalDuration - start < 5) break; 
                end = totalDuration;
            }

            setStatusText(`Scanning Segment ${processedCount + 1}/${Math.min(estimatedCount, maxSegments)}...`);
            setProgress(Math.round((processedCount / estimatedCount) * 40)); 

            const analysisPoint = start + ((end - start) * 0.20);
            
            await new Promise<void>((resolve) => {
                const onSeek = () => {
                    vid.removeEventListener('seeked', onSeek);
                    resolve();
                };
                vid.addEventListener('seeked', onSeek);
                vid.currentTime = Math.min(analysisPoint, totalDuration - 0.1);
            });

            let base64 = "";
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                canvasRef.current.width = vid.videoWidth;
                canvasRef.current.height = vid.videoHeight;
                ctx?.drawImage(vid, 0, 0);
                base64 = canvasRef.current.toDataURL('image/jpeg', 0.6); 
            }

            const segmentId = crypto.randomUUID();
            const currentSegmentIndex = processedCount; 

            const workerPromise = analyzeVideoFrame(base64).then((analysis) => {
                completedAnalysisCount++;
                const percentComplete = 40 + Math.round((completedAnalysisCount / estimatedCount) * 60);
                setProgress(Math.min(99, percentComplete));
                setStatusText(`Ranking Clips... (${completedAnalysisCount}/${processedCount})`);

                if (analysis.viralScore >= options.minViralScore) {
                     setSegments(prev => {
                        const isWatermarked = !isPro && (limit - currentUsage - prev.length) <= 0;

                         const newSegment: SplitSegment = {
                             id: segmentId,
                             index: currentSegmentIndex,
                             startTime: start,
                             endTime: end,
                             duration: end - start,
                             title: analysis.title,
                             description: analysis.description,
                             explanation: analysis.explanation || "Interesting visual content.",
                             hashtags: analysis.hashtags || ["#viral"],
                             viralScore: analysis.viralScore,
                             thumbnail: base64, 
                             isLandscape,
                             hasWatermark: true
                         };
                         return [...prev, newSegment];
                     });
                }
            });

            analysisPromises.push(workerPromise);
            processedCount++;
            currentTime += step;
            await new Promise(r => setTimeout(r, 10));
        }

        setStatusText("Finalizing Ranks...");
        await Promise.all(analysisPromises);
        onUsageIncrement(processedCount); 

    } catch (e: any) {
        console.error(e);
        onError(e.message || "Failed to process video");
    } finally {
        setIsProcessing(false);
        setStatusText("");
        setProgress(100);
    }
  };

  const handleExportAll = async () => {
    if (!videoUrl || sortedSegments.length === 0) return;
    
    setIsExportingAll(true);
    const total = sortedSegments.length;
    
    for (let i = 0; i < total; i++) {
        const seg = sortedSegments[i];
        setExportProgress({ current: i + 1, total });
        
        try {
            const blob = await renderClip(
                videoUrl, 
                seg.startTime, 
                seg.endTime, 
                options.aspectRatio, 
                () => {} // suppress progress for individual clip
            );
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `instasplit-${i + 1}-${seg.title.replace(/\s+/g, '-').slice(0, 15)}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Wait a bit to prevent browser choking
            await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
            console.error("Export failed for segment", seg.id);
        }
    }
    
    setIsExportingAll(false);
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 text-center border-dashed relative hover:bg-zinc-900/80 transition-colors">
        {!file ? (
            <div className="space-y-4 flex flex-col items-center">
                <div className="w-24 h-40 bg-zinc-800 rounded-lg border-2 border-zinc-700 flex items-center justify-center mb-2 shadow-inner">
                    <svg className="w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </div>
                
                <div>
                    <h3 className="text-lg font-medium text-white">Upload Video</h3>
                    <p className="text-zinc-500 text-sm mt-1">MP4, MOV up to 30 mins</p>
                </div>
                <div className="relative inline-block">
                    <Button variant="secondary" className="pointer-events-none">Select File</Button>
                    <input 
                        type="file" 
                        accept="video/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                    />
                </div>
            </div>
        ) : (
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                     </div>
                     <div className="text-left">
                        <p className="text-white font-medium truncate max-w-[200px]">{file.name}</p>
                        <p className="text-zinc-500 text-xs font-mono">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB • {formatTime(videoDuration)}
                        </p>
                     </div>
                </div>
                <button onClick={() => { setFile(null); setSegments([]); setVideoUrl(null); }} className="text-zinc-500 hover:text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}
      </div>

      {/* Controls */}
      {file && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Main Controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Duration Selector */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-3 ml-1">Split Duration</label>
                    <div className="grid grid-cols-4 gap-2">
                        {([15, 30, 60, 90] as SplitDuration[]).map((d) => (
                            <button
                                key={d}
                                onClick={() => setOptions({...options, duration: d})}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                    options.duration === d
                                    ? 'bg-white text-black border-white shadow-lg'
                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                {d}s
                            </button>
                        ))}
                    </div>
                </div>

                {/* Aspect Ratio Selector (NEW) */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-3 ml-1">Crop Ratio</label>
                    <div className="grid grid-cols-4 gap-2">
                        {(['Original', '9:16', '16:9', '1:1'] as SplitAspectRatio[]).map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setOptions({...options, aspectRatio: ratio})}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                    options.aspectRatio === ratio
                                    ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20'
                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Advanced Toggle */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full px-4 py-3 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        Advanced Options
                    </div>
                    <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {showAdvanced && (
                    <div className="p-4 bg-zinc-900/30 space-y-5 animate-in slide-in-from-top-2">
                        {/* Overlap Slider */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-medium text-zinc-400">Overlap (Continuity)</label>
                                <span className="text-xs text-pink-500 font-mono">{options.overlap}s</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="5" 
                                step="1"
                                value={options.overlap}
                                onChange={(e) => setOptions({...options, overlap: parseInt(e.target.value)})}
                                className="w-full accent-pink-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-[10px] text-zinc-600 mt-1">Overlaps audio between clips. Set to 0 for exact cuts (e.g. 0-15s, 15-30s).</p>
                        </div>

                        {/* Viral Threshold Slider */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-medium text-zinc-400">Min. Viral Score</label>
                                <span className="text-xs text-yellow-500 font-mono">{options.minViralScore}+</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="90" 
                                step="10"
                                value={options.minViralScore}
                                onChange={(e) => setOptions({...options, minViralScore: parseInt(e.target.value)})}
                                className="w-full accent-yellow-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-[10px] text-zinc-600 mt-1">AI will ignore clips below this score.</p>
                        </div>
                    </div>
                )}
            </div>

            {isProcessing ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl shadow-purple-500/10">
                    <div className="flex justify-center mb-2">
                        <div className="relative">
                             <div className="w-12 h-12 border-4 border-zinc-700 rounded-full"></div>
                             <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                             <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{Math.round(progress)}%</div>
                        </div>
                    </div>
                    
                    <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-white/5 bg-[length:20px_20px] bg-stripes animate-scroll"></div>
                        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-medium text-white animate-pulse">{statusText}</span>
                        <span className="text-xs text-zinc-500">Processing concurrently for max speed</span>
                    </div>
                </div>
            ) : (
                <Button onClick={handleProcess} fullWidth className="py-4 text-lg group bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 border-none shadow-xl shadow-purple-900/20">
                    <span className="group-hover:animate-bounce mr-2">🚀</span>
                    Fast Scan & Rank
                    <span className="text-xs opacity-70 font-normal ml-2 bg-black/20 px-2 py-0.5 rounded-full">
                         Veo Engine
                    </span>
                </Button>
            )}
        </div>
      )}

      {/* Results Feed */}
      {segments.length > 0 && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-500 pb-20">
            {isExportingAll && (
                <div className="fixed top-20 right-4 z-[60] bg-zinc-900 border border-zinc-700 shadow-2xl p-4 rounded-xl w-64 animate-in slide-in-from-right">
                    <h4 className="text-white text-sm font-bold mb-2">Exporting All...</h4>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
                        <div className="bg-green-500 h-full transition-all" style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}></div>
                    </div>
                    <p className="text-xs text-zinc-400">{exportProgress.current} of {exportProgress.total} clips downloaded</p>
                </div>
            )}

            <div className="flex items-center justify-between px-2">
                 <div className="flex flex-col">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        {sortBy === 'score' ? '🏆 Top Ranked Clips' : '⏱️ Chronological Clips'}
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{segments.length} clips found</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <button 
                        onClick={handleExportAll}
                        disabled={isExportingAll}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                     >
                        {isExportingAll ? (
                             <span className="animate-pulse">Exporting...</span>
                        ) : (
                             <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Export All
                             </>
                        )}
                     </button>
                     <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                     <div className="bg-zinc-800 p-1 rounded-lg flex gap-1">
                        <button 
                            onClick={() => setSortBy('time')}
                            className={`p-1.5 rounded-md transition-all ${sortBy === 'time' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="Sort by Time"
                        >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <button 
                             onClick={() => setSortBy('score')}
                             className={`p-1.5 rounded-md transition-all ${sortBy === 'score' ? 'bg-pink-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                             title="Sort by Viral Score"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </button>
                     </div>
                 </div>
            </div>
            <div className="flex flex-col gap-10">
                {sortedSegments.map((segment, idx) => (
                    <div key={segment.id} className="relative">
                        {sortBy === 'score' && idx === 0 && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-3 py-1 rounded-full z-10 shadow-lg shadow-yellow-500/20 border border-yellow-400 flex items-center gap-1">
                                <span className="text-xs">⭐️</span> #1 VEO PICK
                            </div>
                        )}
                         {sortBy === 'time' && (
                             <div className="absolute -top-5 left-4 z-10 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded border border-zinc-800 font-mono">
                                 {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                             </div>
                        )}
                        <SplitResultCard segment={segment} videoUrl={videoUrl!} isPro={isPro} options={options} />
                    </div>
                ))}
            </div>
        </div>
      )}
      
      {/* Hidden processing elements */}
      <video 
        ref={videoRef} 
        src={videoUrl || ''} 
        className="hidden" 
        preload="auto"
        muted
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

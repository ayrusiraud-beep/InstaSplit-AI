
import React, { useState, useEffect } from 'react';
import { VideoConfig, GeneratedMedia, AspectRatio, UserUsage } from './types';
import { ensureApiKey, generateVeoVideo, generateImage, promptSelectKey, enhancePrompt, generatePromptFromImage } from './services/geminiService';
import { extractFrameFromFile } from './services/videoService';
import { Button } from './components/Button';
import { Loader } from './components/Loader';
import { VideoCard } from './components/VideoCard';
import { VideoSplitter } from './components/VideoSplitter';
import { PricingModal } from './components/PricingModal';
import { LoginScreen } from './components/LoginScreen';
import { RatingModal } from './components/RatingModal';
import { DeploymentModal } from './components/DeploymentModal';

// Icons
const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 3.214L13 21l-2.286-6.857L5 12l5.714-3.214z" /></svg>
);

const VideoIcon = () => (
   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);

const PhotoIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);

const ScissorsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
);

const UploadIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
);

const CollabLogo = () => (
  <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="insta_gradient" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#insta_gradient)" />
    <path d="M24 10L27 21L38 24L27 27L24 38L21 27L10 24L21 21L24 10Z" fill="white" filter="url(#glow)" />
    <path d="M34 10L35 14L39 15L35 16L34 20L33 16L29 15L33 14L34 10Z" fill="white" opacity="0.8" />
  </svg>
);

type Mode = 'generate' | 'split';

// Usage Limits
const MAX_FREE_VEO_DAILY = 2;
const MAX_FREE_SPLIT_NO_WATERMARK = 10;
const GENERATION_COST = 50;

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<'google' | 'facebook' | 'guest' | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [showDeployment, setShowDeployment] = useState(false);
  
  const [mode, setMode] = useState<Mode>('generate');
  
  // Generation State
  const [generationType, setGenerationType] = useState<'video' | 'image'>('video');
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [style, setStyle] = useState('90s Retro');
  const [isGenerating, setIsGenerating] = useState(false);
  const [media, setMedia] = useState<GeneratedMedia[]>([]);
  const [startImage, setStartImage] = useState<string | null>(null); // base64
  
  // Shared State
  const [hasKey, setHasKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User & Usage State
  const [isPro, setIsPro] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [coins, setCoins] = useState(0);
  const [usage, setUsage] = useState<UserUsage>({ date: '', veoCount: 0, splitCount: 0 });

  // Constants
  const STYLES = ['90s Retro', 'Cinematic', 'Cyberpunk', 'Minimalist', 'Anime', 'Vintage VHS', 'Realistic'];
  
  useEffect(() => {
    const init = async () => {
      const storedLogin = localStorage.getItem('instasplit_login');
      if (storedLogin) {
          setIsLoggedIn(true);
          setUserType(storedLogin as any);
      }

      const available = await ensureApiKey();
      setHasKey(available);
      
      const today = new Date().toDateString();
      const storedUsage = localStorage.getItem('instasplit_usage');
      if (storedUsage) {
          const parsed: UserUsage = JSON.parse(storedUsage);
          if (parsed.date === today) {
              setUsage(parsed);
          } else {
              setUsage({ date: today, veoCount: 0, splitCount: 0 });
          }
      } else {
          setUsage({ date: today, veoCount: 0, splitCount: 0 });
      }

      const storedPro = localStorage.getItem('instasplit_pro');
      if (storedPro === 'true') setIsPro(true);

      const storedCoins = localStorage.getItem('instasplit_coins');
      if (storedCoins) setCoins(parseInt(storedCoins));

      const ratingDone = localStorage.getItem('instasplit_rating_done');
      if (!ratingDone && storedLogin) {
          const lastPrompt = localStorage.getItem('instasplit_rating_prompt');
          const now = Date.now();
          if (!lastPrompt || (now - parseInt(lastPrompt) > 172800000)) {
              setTimeout(() => setShowRating(true), 3000);
          }
      }
    };
    init();
  }, [isLoggedIn]);

  const handleLogin = (provider: 'google' | 'facebook' | 'guest') => {
      localStorage.setItem('instasplit_login', provider);
      setUserType(provider);
      setIsLoggedIn(true);
  };

  const handleLogout = () => {
      localStorage.removeItem('instasplit_login');
      setIsLoggedIn(false);
      setUserType(null);
  }

  const handleRate = (rating: number) => {
      localStorage.setItem('instasplit_rating_done', 'true');
      alert("Thank you for your rating!");
  };

  const handleCloseRating = () => {
      localStorage.setItem('instasplit_rating_prompt', Date.now().toString());
      setShowRating(false);
  };

  const updateUsage = (type: 'veo' | 'split', amount: number = 1) => {
      setUsage(prev => {
          const next = { ...prev };
          if (type === 'veo') next.veoCount += amount;
          if (type === 'split') next.splitCount += amount;
          localStorage.setItem('instasplit_usage', JSON.stringify(next));
          return next;
      });
  };

  const updateCoins = (newAmount: number) => {
      setCoins(newAmount);
      localStorage.setItem('instasplit_coins', newAmount.toString());
  };

  const handleUpgrade = () => {
      setIsPro(true);
      localStorage.setItem('instasplit_pro', 'true');
      alert("Welcome to Pro! You now have unlimited access.");
  };

  const handleEarnCoins = (amount: number) => {
      const newBalance = coins + amount;
      updateCoins(newBalance);
  };

  const handleEnhancePrompt = async () => {
      if (!prompt.trim()) return;
      setIsEnhancing(true);
      try {
          const enhanced = await enhancePrompt(prompt);
          setPrompt(enhanced);
      } catch (e) {
          console.error(e);
      } finally {
          setIsEnhancing(false);
      }
  };

  const handleAutoPrompt = async () => {
      if (!startImage) return;
      setIsEnhancing(true);
      try {
          const generatedPrompt = await generatePromptFromImage(startImage);
          setPrompt(generatedPrompt);
      } catch (e) {
          console.error(e);
          alert("Failed to generate prompt from image.");
      } finally {
          setIsEnhancing(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
              const base64 = await extractFrameFromFile(file);
              setStartImage(base64);
          } catch (err) {
              console.error(err);
              alert("Failed to process file. Please try a valid image or video.");
          }
      }
  };

  const handleGenerate = async () => {
    let usingCoins = false;

    // Limit check logic (Only for Video)
    if (!isPro && generationType === 'video') {
        if (usage.veoCount >= MAX_FREE_VEO_DAILY) {
            if (coins >= GENERATION_COST) {
                if (confirm(`Daily video limit reached. Use ${GENERATION_COST} coins to generate?`)) {
                    usingCoins = true;
                } else {
                    return;
                }
            } else {
                setShowPricing(true);
                return;
            }
        }
    }

    if (!prompt.trim() && !startImage) return;
    setErrorMsg(null);
    setIsGenerating(true);

    const config: VideoConfig = {
      prompt,
      aspectRatio,
      style,
      startImage: startImage ? startImage.split(',')[1] : undefined,
      generateType: generationType
    };

    try {
      await ensureApiKey();
      
      let uri = '';
      if (generationType === 'image') {
          uri = await generateImage(config);
      } else {
          uri = await generateVeoVideo(config);
      }
      
      // Update limits only if video was generated
      if (generationType === 'video') {
          if (usingCoins) {
              updateCoins(coins - GENERATION_COST);
          } else {
              updateUsage('veo');
          }
      }

      const newMedia: GeneratedMedia = {
        id: crypto.randomUUID(),
        uri,
        type: generationType,
        prompt: config.prompt,
        aspectRatio: config.aspectRatio,
        style: config.style,
        timestamp: Date.now(),
        hasWatermark: !isPro 
      };

      setMedia(prev => [newMedia, ...prev]);
    } catch (error: any) {
      console.error("Generation error:", error);
      if (error.message === 'API_KEY_INVALID') {
        setErrorMsg("API Key invalid or not found. If running locally, please set API_KEY env var.");
        setHasKey(false);
      } else {
        setErrorMsg(error.message || "Failed to generate. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectKey = async () => {
      const result = await promptSelectKey();
      if (result) {
          setHasKey(true);
          setErrorMsg(null);
      }
  }

  // Get available ratios based on type
  const availableRatios: AspectRatio[] = generationType === 'image' 
    ? ['1:1', '9:16', '16:9', '4:3', '3:4'] 
    : ['9:16', '16:9'];

  if (!isLoggedIn) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-pink-500 selection:text-white pb-20 relative">
      <PricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
        onUpgrade={handleUpgrade}
        onEarnCoins={handleEarnCoins}
        currentCoins={coins}
      />

      <RatingModal 
        isOpen={showRating}
        onRate={handleRate}
        onClose={handleCloseRating}
      />

      <DeploymentModal
        isOpen={showDeployment}
        onClose={() => setShowDeployment(false)}
      />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CollabLogo />
            <div>
                <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                Instasplit AI
                </h1>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] text-zinc-500 tracking-widest font-mono">by Ayrus_Iraud</p>
                    {isPro && <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-[9px] text-black font-bold px-1.5 rounded">PRO</span>}
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              {!isPro && (
                 <>
                    <div className="hidden sm:flex items-center gap-1 bg-zinc-900 rounded-full px-3 py-1 border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors" onClick={() => setShowPricing(true)}>
                         <span className="text-sm">🪙</span>
                         <span className="text-xs font-bold text-yellow-500">{coins}</span>
                    </div>
                 </>
              )}
              
              {/* Profile / Logout Avatar */}
              <div className="relative group">
                <button className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 overflow-hidden flex items-center justify-center">
                    {userType === 'guest' ? (
                        <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    ) : (
                         <img src={`https://ui-avatars.com/api/?name=${userType}&background=random`} alt="Profile" className="w-full h-full" />
                    )}
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <button 
                        onClick={() => setShowDeployment(true)}
                        className="w-full px-4 py-2.5 text-left text-xs text-green-400 hover:bg-zinc-800 rounded-t-xl flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Deploy App (Free)
                    </button>
                    <div className="h-px bg-zinc-800"></div>
                    <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-zinc-800 rounded-b-xl"
                    >
                        Sign Out
                    </button>
                </div>
              </div>
          </div>
        </div>
      </header>

      <main className="pt-24 px-4 max-w-3xl mx-auto space-y-8">
        
        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
            <button 
                onClick={() => setMode('generate')}
                className={`py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'generate' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <SparklesIcon />
                Create Veo
            </button>
            <button 
                onClick={() => setMode('split')}
                className={`py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'split' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <ScissorsIcon />
                Smart Split
            </button>
        </div>

        {/* Guest Banner */}
        {userType === 'guest' && !isPro && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-indigo-400 text-lg">🔒</span>
                    <div>
                        <p className="text-indigo-200 text-xs font-semibold">Guest Mode</p>
                        <p className="text-indigo-400/70 text-[10px]">Your videos are saved locally.</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-lg transition-colors">
                    Login
                </button>
            </div>
        )}

        {/* Usage Stats (Free only) */}
        {!isPro && mode === 'generate' && generationType === 'video' && (
            <div className="flex justify-center items-center gap-4 text-xs">
                <p className="text-zinc-500">
                    Free Video Credits: <span className="text-white font-bold">{Math.max(0, MAX_FREE_VEO_DAILY - usage.veoCount)}</span>
                </p>
                <div className="w-px h-3 bg-zinc-800"></div>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowPricing(true)}>
                     <span>🪙</span>
                     <span className="text-yellow-500 font-bold">{coins}</span>
                </div>
            </div>
        )}
        
        {!isPro && mode === 'generate' && generationType === 'image' && (
             <div className="flex justify-center items-center gap-4 text-xs">
                 <p className="text-pink-500 font-medium">✨ Unlimited Photo Generation Active</p>
             </div>
        )}

        {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {errorMsg}
            </div>
        )}

        {mode === 'split' ? (
             <VideoSplitter 
                onError={setErrorMsg} 
                isPro={isPro}
                currentUsage={usage.splitCount}
                limit={MAX_FREE_SPLIT_NO_WATERMARK}
                onUsageIncrement={(count) => updateUsage('split', count)}
             />
        ) : (
            <>
                {/* Generation Interface */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    
                    <div className="relative space-y-6">
                        
                        {/* Generation Type Toggle */}
                        <div className="flex justify-center">
                            <div className="bg-black/50 border border-zinc-700 rounded-xl p-1 flex">
                                <button
                                    onClick={() => setGenerationType('video')}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${generationType === 'video' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <VideoIcon />
                                    Video
                                </button>
                                <button
                                    onClick={() => setGenerationType('image')}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${generationType === 'image' ? 'bg-pink-900/50 text-pink-200 border border-pink-500/30 shadow-lg shadow-pink-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <PhotoIcon />
                                    Photo
                                </button>
                            </div>
                        </div>

                        {/* File Upload Area */}
                        {!startImage ? (
                            <div className="border border-dashed border-zinc-700 bg-black/20 rounded-xl p-4 text-center hover:bg-black/40 transition-colors relative">
                                <input 
                                    type="file" 
                                    accept="image/*,video/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileUpload}
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                                        <UploadIcon />
                                    </div>
                                    <p className="text-xs text-zinc-400">Upload Photo or Video to Start (Optional)</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden border border-zinc-700 h-32 group/img">
                                <img src={startImage} alt="Start" className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100 transition-opacity" />
                                <button 
                                    onClick={() => setStartImage(null)}
                                    className="absolute top-2 right-2 bg-black/80 p-1.5 rounded-full text-white hover:text-red-400 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 rounded-md text-[10px] text-white font-medium">
                                    Reference Image
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-zinc-400 ml-1">Your Vision ({generationType === 'image' ? 'Unlimited' : 'Veo AI'})</label>
                                <div className="flex items-center gap-2">
                                    {startImage && (
                                        <button 
                                            onClick={handleAutoPrompt}
                                            disabled={isEnhancing}
                                            className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50"
                                        >
                                            <span className="text-lg">🪄</span>
                                            Auto-Prompt
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleEnhancePrompt}
                                        disabled={isEnhancing || !prompt.trim()}
                                        className="text-xs flex items-center gap-1 text-pink-500 hover:text-pink-400 disabled:opacity-50"
                                    >
                                        {isEnhancing ? (
                                            <span className="animate-pulse">AI Thinking...</span>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                                                Magic Enhance
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={`Describe your ${generationType}... e.g., 'A futuristic city with flying cars'`}
                            className="w-full bg-black/50 border border-zinc-700 rounded-xl p-4 text-base focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600 min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2 ml-1">Aspect Ratio</label>
                            <div className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-xl border border-zinc-800">
                            {availableRatios.map((ratio) => (
                                <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                                    aspectRatio === ratio 
                                    ? 'bg-zinc-800 text-white shadow-sm' 
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                                >
                                {ratio}
                                </button>
                            ))}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2 ml-1">Style</label>
                            <div className="relative">
                                <select
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-2.5 appearance-none focus:ring-2 focus:ring-pink-500 outline-none text-sm text-zinc-200"
                                >
                                <option value="None">No Style</option>
                                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                        </div>

                        {!hasKey ? (
                        <div className="space-y-3">
                            <Button onClick={handleSelectKey} fullWidth variant="secondary" className="py-4 border-dashed">
                                Select API Key to Generate
                            </Button>
                            <p className="text-center text-[10px] text-zinc-500">
                                Powered by Google Cloud. You need a billing-enabled project.
                            </p>
                        </div>
                        ) : isGenerating ? (
                        <div className="w-full bg-zinc-800/50 rounded-xl p-8 border border-zinc-800">
                            <Loader />
                        </div>
                        ) : (
                        <Button onClick={handleGenerate} fullWidth disabled={!prompt.trim() && !startImage} className="text-lg py-4">
                            <SparklesIcon />
                            Generate {generationType === 'image' ? 'Photo' : 'Video'}
                        </Button>
                        )}
                    </div>
                </div>

                {/* Feed Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                        Recent Generations
                        </h2>
                        <span className="text-sm text-zinc-500">{media.length} items</span>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {media.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl">
                            <div className="w-16 h-16 mx-auto bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                                {generationType === 'video' ? <VideoIcon /> : <PhotoIcon />}
                            </div>
                            <h3 className="text-zinc-400 font-medium">No media yet</h3>
                            <p className="text-zinc-600 text-sm mt-2 max-w-xs mx-auto">Create your first Instasplit masterpiece above.</p>
                        </div>
                        ) : (
                        media.map((item) => (
                            <VideoCard key={item.id} video={item} />
                        ))
                        )}
                    </div>
                </div>
            </>
        )}

      </main>
      
      {/* Footer / Branding */}
      <footer className="py-8 text-center border-t border-zinc-900 mt-auto">
        <p className="text-zinc-500 text-xs">Powered by Google Veo & Gemini 2.5</p>
        <p className="text-zinc-700 text-[10px] mt-1 font-mono uppercase tracking-widest opacity-50">Watermark: Ayrus_Iraud</p>
      </footer>
    </div>
  );
};

export default App;


import React from 'react';

interface LoginScreenProps {
  onLogin: (provider: 'google' | 'facebook' | 'guest') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {

  const handleSocialClick = (provider: 'google' | 'facebook') => {
    // Log the user into the app mock-style while opening the real link in a new tab
    onLogin(provider);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>

      {/* Skip / Guest Button */}
      <div className="absolute top-6 right-6 z-20">
        <button 
            onClick={() => onLogin('guest')}
            className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-5 py-2.5 rounded-full border border-zinc-700 transition-all shadow-lg hover:shadow-zinc-700/20 hover:border-zinc-500"
        >
            <span className="text-sm font-semibold">Skip Sign In</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </button>
      </div>

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-8 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          
          {/* Main Logo Replacement */}
          <div className="mx-auto transform hover:scale-105 transition-transform duration-300">
             <svg viewBox="0 0 48 48" className="w-24 h-24 mx-auto drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                <linearGradient id="insta_gradient_login" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="25%" stopColor="#e6683c" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="75%" stopColor="#cc2366" />
                    <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
                <filter id="glow_login">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                </defs>
                <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#insta_gradient_login)" />
                <path d="M24 10L27 21L38 24L27 27L24 38L21 27L10 24L21 21L24 10Z" fill="white" filter="url(#glow_login)" />
                <path d="M34 10L35 14L39 15L35 16L34 20L33 16L29 15L33 14L34 10Z" fill="white" opacity="0.8" />
            </svg>
          </div>

          <div>
             <h1 className="text-3xl font-bold text-white tracking-tight">Instasplit AI</h1>
             <p className="text-zinc-400 mt-2">Create & Split Viral Videos</p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
            <a 
                href="https://accounts.google.com/signin"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleSocialClick('google')}
                className="w-full py-4 px-4 bg-white hover:bg-zinc-100 text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-lg cursor-pointer block text-center no-underline"
            >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
                <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </div>
            </a>

            <a 
                href="https://www.facebook.com/login"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleSocialClick('facebook')}
                className="w-full py-4 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-lg cursor-pointer block text-center no-underline"
            >
                <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Continue with Facebook</span>
                <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </div>
            </a>
        </div>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-2 text-zinc-500">Secure Login</span>
            </div>
        </div>

        <p className="text-center text-zinc-500 text-xs leading-relaxed">
           By continuing, you agree to our <span className="text-zinc-400 hover:text-white cursor-pointer underline">Terms of Service</span> and <span className="text-zinc-400 hover:text-white cursor-pointer underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

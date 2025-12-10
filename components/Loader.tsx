import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-zinc-700 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-zinc-400 text-sm animate-pulse">Creating your masterpiece with Veo...</p>
      <p className="text-xs text-zinc-600">This may take a minute.</p>
    </div>
  );
};

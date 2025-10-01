
import React from 'react';

const PawPrintIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.5 14c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-5 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm3-6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.5 9c.8 0 1.5-.7 1.5-1.5S13.8 14 13 14s-1.5.7-1.5 1.5.7 1.5 1.5 1.5zm-3 0c.8 0 1.5-.7 1.5-1.5S11.3 14 10.5 14 9 14.7 9 15.5s.7 1.5 1.5 1.5z" />
    </svg>
);

const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);


const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 backdrop-blur-md shadow-lg sticky top-0 z-10 border-b-4 border-gradient-to-r from-pink-300 to-purple-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-6 relative">
          {/* Decorative elements */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 hidden md:flex items-center space-x-2">
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          
          <div className="flex items-center">
            <div className="relative mr-4">
              <PawPrintIcon className="w-10 h-10 text-purple-600 transform rotate-12" />
              <HeartIcon className="w-4 h-4 text-pink-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent tracking-tight" 
                style={{ fontFamily: "'Averia Serif Libre', serif" }}>
              🐾 Pet Home 🏠
            </h1>
            <div className="relative ml-4">
              <PawPrintIcon className="w-10 h-10 text-pink-600 transform -rotate-12" />
              <div className="w-3 h-3 bg-yellow-400 rounded-full absolute -bottom-1 -left-1 animate-ping"></div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 hidden md:flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
          </div>
        </div>
        
        {/* Cute subtitle */}
        <div className="text-center pb-2">
          <p className="text-sm text-purple-600 font-medium" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
            💕 Your AI-Powered Pet Companion 💕
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;

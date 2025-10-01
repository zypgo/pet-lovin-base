
import React from 'react';

const Spinner: React.FC<{ text?: string }> = ({ text = "🤖 AI is thinking..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 my-8 p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200 shadow-lg backdrop-blur-sm" 
         style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      {/* Cute animated spinner with paw prints */}
      <div className="relative">
        <svg
          className="animate-spin h-12 w-12 text-purple-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        
        {/* Cute floating paw prints around spinner */}
        <div className="absolute -top-2 -right-2 w-4 h-4 text-pink-400 animate-bounce">
          🐾
        </div>
        <div className="absolute -bottom-2 -left-2 w-4 h-4 text-purple-400 animate-bounce" style={{animationDelay: '0.5s'}}>
          🐾
        </div>
      </div>
      
      <p className="text-purple-700 font-bold text-center leading-relaxed">{text}</p>
      
      {/* Cute loading dots */}
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
    </div>
  );
};

export default Spinner;

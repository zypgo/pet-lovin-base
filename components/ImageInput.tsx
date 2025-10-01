
import React, { useState, useRef } from 'react';

const CameraIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface ImageInputProps {
  onFileSelect: (file: File) => void;
  prompt: string;
}

const ImageInput: React.FC<ImageInputProps> = ({ onFileSelect, prompt }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        onFileSelect(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      <label 
        htmlFor="file-upload"
        className="group mt-4 flex justify-center items-center rounded-2xl border-2 border-dashed border-pink-300 p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 cursor-pointer transition-all duration-300 bg-gradient-to-br from-pink-50/30 to-purple-50/30 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:scale-105"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Image preview" className="max-h-64 rounded-xl object-contain shadow-lg border-2 border-pink-200" />
            {/* Cute preview decoration */}
            <div className="absolute -top-2 -right-2 bg-green-400 text-white rounded-full p-2 shadow-lg">
              <span className="text-sm">✓</span>
            </div>
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-purple-600 shadow-lg">
              📸 Perfect!
            </div>
          </div>
        ) : (
          <div className="text-purple-500 group-hover:text-purple-600 transition-colors">
            {/* Cute upload icon with animation */}
            <div className="relative mb-4">
              <div className="group-hover:animate-bounce">
                <CameraIcon />
              </div>
              {/* Floating hearts */}
              <div className="absolute -top-1 -right-1 text-pink-400 animate-pulse">
                <span className="text-sm">💕</span>
              </div>
            </div>
            
            <p className="text-lg font-bold text-purple-700 mb-2">{prompt}</p>
            <p className="text-sm text-purple-500 mb-3">Drop your adorable pet photo here!</p>
            
            {/* File format info with cute styling */}
            <div className="bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-200">
              <p className="text-xs text-purple-600 font-semibold">
                🖼️ PNG, JPG, GIF up to 10MB
              </p>
            </div>
            
            {/* Decorative elements */}
            <div className="flex justify-center mt-4 space-x-2">
              <div className="w-2 h-2 bg-pink-400 rounded-full opacity-60 group-hover:animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full opacity-60 group-hover:animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full opacity-60 group-hover:animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        )}
      </label>
      <input
        id="file-upload"
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageInput;

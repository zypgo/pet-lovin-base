
import React, { useState } from 'react';
import { HappyLifeSubPage } from '../types';
import PetImageEditor from './PetImageEditor';
import PetStoryCreator from './PetStoryCreator';
import PetGallery from './PetGallery';

interface HappyLifePageProps {
  galleryImages: string[];
  addImageToGallery: (imageUrl: string) => void;
}

const SubNavButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  gradient: string;
}> = ({ isActive, onClick, label, icon, gradient }) => {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-3 font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 ${
        isActive
          ? `bg-gradient-to-r ${gradient} text-white shadow-xl scale-105 border-2 border-white/30`
          : 'bg-white/70 text-gray-700 hover:bg-white/90 hover:shadow-lg border-2 border-transparent hover:border-pink-200 backdrop-blur-sm'
      }`}
      style={{ fontFamily: "'Averia Serif Libre', serif" }}
    >
      {/* Cute floating dot for active */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
      )}
      
      <div className="flex items-center justify-center">
        <span className="mr-2 text-lg">{icon}</span>
        <span className="text-sm font-bold">{label}</span>
      </div>
      
      {/* Bottom dots decoration for active */}
      {isActive && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          <div className="w-1 h-1 bg-white/60 rounded-full"></div>
          <div className="w-1 h-1 bg-white/60 rounded-full"></div>
          <div className="w-1 h-1 bg-white/60 rounded-full"></div>
        </div>
      )}
    </button>
  );
};

const HappyLifePage: React.FC<HappyLifePageProps> = ({ galleryImages, addImageToGallery }) => {
  const [activeSubPage, setActiveSubPage] = useState<HappyLifeSubPage>(HappyLifeSubPage.Editor);

  const renderSubPage = () => {
    switch (activeSubPage) {
      case HappyLifeSubPage.Editor:
        return <PetImageEditor addImageToGallery={addImageToGallery} />;
      case HappyLifeSubPage.StoryCreator:
        return <PetStoryCreator addImageToGallery={addImageToGallery} />;
      case HappyLifeSubPage.Gallery:
        return <PetGallery images={galleryImages} />;
      default:
        return <PetImageEditor addImageToGallery={addImageToGallery} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50 rounded-3xl" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      {/* Header Section */}
      <div className="text-center py-8 px-6">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <span className="text-2xl">🎉</span>
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce">
              <span className="text-xs">✨</span>
            </div>
          </div>
        </div>
        <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
          🌈 Happy Pet Life Zone 🌈
        </h2>
        <p className="text-purple-600 max-w-2xl mx-auto leading-relaxed">
          💕 Create, play, and celebrate your pet's wonderful moments! 💕
        </p>
      </div>
      
      {/* Sub-Navigation */}
      <div className="px-6 pb-8">
        <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-yellow-100 p-4 rounded-3xl border-2 border-pink-200/50 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <SubNavButton
              isActive={activeSubPage === HappyLifeSubPage.Editor}
              onClick={() => setActiveSubPage(HappyLifeSubPage.Editor)}
              label="Playground"
              icon="🎨"
              gradient="from-orange-400 to-red-500"
            />
            <SubNavButton
              isActive={activeSubPage === HappyLifeSubPage.StoryCreator}
              onClick={() => setActiveSubPage(HappyLifeSubPage.StoryCreator)}
              label="Stories"
              icon="📝"
              gradient="from-purple-400 to-pink-500"
            />
            <SubNavButton
              isActive={activeSubPage === HappyLifeSubPage.Gallery}
              onClick={() => setActiveSubPage(HappyLifeSubPage.Gallery)}
              label="Gallery"
              icon="🖼️"
              gradient="from-yellow-400 to-orange-500"
            />
          </div>
          
          {/* Decorative elements */}
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-2 h-2 bg-pink-400 rounded-full opacity-60 animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full opacity-60 animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full opacity-60 animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="px-3">{renderSubPage()}</div>
    </div>
  );
};

export default HappyLifePage;

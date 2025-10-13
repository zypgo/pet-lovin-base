
import React, { useState, useCallback } from 'react';
import { Page } from './types';
import Header from './components/Header';
import Nav from './components/Nav';
import PetIdentifier from './components/PetIdentifier';
import PetHealthAdvisor from './components/PetHealthAdvisor';
import HappyLifePage from './components/HappyLifePage';
import AgentMode from './components/AgentMode';
import Footer from './components/Footer';
import { useAuth } from './src/contexts/AuthContext';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.Agent);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const { user, signOut } = useAuth();

  const addImageToGallery = useCallback((imageUrl: string) => {
    // Add new images to the front of the gallery
    setGalleryImages(prev => [imageUrl, ...prev]);
  }, []);

  const renderPage = useCallback(() => {
    switch (activePage) {
      case Page.Agent:
        return <AgentMode />;
      case Page.Identifier:
        return <PetIdentifier />;
      case Page.Health:
        return <PetHealthAdvisor />;
      case Page.HappyLife:
        return <HappyLifePage galleryImages={galleryImages} addImageToGallery={addImageToGallery} />;
      default:
        return <AgentMode />;
    }
  }, [activePage, galleryImages, addImageToGallery]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* User Info Bar */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 flex justify-between items-center">
            <div className="text-white">
              <span className="text-sm">👋 Welcome back,</span>
              <span className="font-bold ml-2">{user?.user_metadata?.username || user?.email}</span>
            </div>
            <button
              onClick={signOut}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
          
          <Nav activePage={activePage} setActivePage={setActivePage} />
          <div className="p-6 md:p-10">
            {renderPage()}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;


import React from 'react';
import { Page } from '../types';

interface NavProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

// Icon components for navigation
const AgentIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const PetIdIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
  </svg>
);

const HealthIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
  </svg>
);

const HappyIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"/>
  </svg>
);

const NavButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}> = ({ isActive, onClick, label, description, icon, color }) => {
    return (
        <button
            onClick={onClick}
            className={`relative p-4 w-full h-full transition-all duration-500 ease-out transform flex flex-col items-center justify-center rounded-2xl group hover:scale-105 ${
                isActive 
                    ? `bg-gradient-to-br ${color} text-white shadow-xl scale-105 border-2 border-white/30` 
                    : 'bg-white/70 backdrop-blur-sm hover:bg-white/90 text-gray-700 hover:shadow-lg border-2 border-transparent hover:border-pink-200'
            }`}
            style={{ fontFamily: "'Averia Serif Libre', serif" }}
        >
            {/* Cute floating animation for active button */}
            {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
            )}
            
            {/* Icon with cute hover effect */}
            <div className={`mb-2 transition-transform duration-300 ${
                isActive ? 'animate-pulse' : 'group-hover:scale-110'
            }`}>
                {icon}
            </div>
            
            <span className="font-bold text-xs md:text-sm mb-1">{label}</span>
            <span className={`text-xs opacity-80 ${
                isActive ? 'text-white/90' : 'text-gray-500'
            }`}>{description}</span>
            
            {/* Cute bottom decoration */}
            {isActive && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                        <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                        <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                    </div>
                </div>
            )}
        </button>
    );
}

const Nav: React.FC<NavProps> = ({ activePage, setActivePage }) => {
  return (
    <nav className="bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 p-4 border-b-2 border-pink-200/30">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <NavButton
            isActive={activePage === Page.Agent}
            onClick={() => setActivePage(Page.Agent)}
            label="AI Chat"
            description="🤖 Smart Helper"
            icon={<AgentIcon />}
            color="from-blue-400 to-purple-500"
        />
        <NavButton
            isActive={activePage === Page.Identifier}
            onClick={() => setActivePage(Page.Identifier)}
            label="Pet ID"
            description="🔍 Identify Breed"
            icon={<PetIdIcon />}
            color="from-purple-400 to-pink-500"
        />
        <NavButton
            isActive={activePage === Page.Health}
            onClick={() => setActivePage(Page.Health)}
            label="Health Care"
            description="💊 Wellness Tips"
            icon={<HealthIcon />}
            color="from-green-400 to-teal-500"
        />
        <NavButton
            isActive={activePage === Page.HappyLife}
            onClick={() => setActivePage(Page.HappyLife)}
            label="Fun Zone"
            description="🎨 Create & Play"
            icon={<HappyIcon />}
            color="from-yellow-400 to-orange-500"
        />
      </div>
      
      {/* Decorative bottom elements */}
      <div className="flex justify-center mt-3 space-x-2">
        <div className="w-2 h-2 bg-pink-300 rounded-full opacity-60"></div>
        <div className="w-2 h-2 bg-purple-300 rounded-full opacity-60"></div>
        <div className="w-2 h-2 bg-indigo-300 rounded-full opacity-60"></div>
      </div>
    </nav>
  );
};

export default Nav;

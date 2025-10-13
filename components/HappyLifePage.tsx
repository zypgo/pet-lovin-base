import { useState } from 'react';
import PetImageEditor from './PetImageEditor';
import PetStoryCreator from './PetStoryCreator';
import PetGallery from './PetGallery';
import { HappyLifeSubPage } from '../types';

interface HappyLifePageProps {
  galleryImages: string[];
  addImageToGallery: (imageBase64: string) => Promise<void>;
}

const SubNavButton = ({
  isActive,
  onClick,
  icon,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold
      transition-all duration-300 transform hover:scale-105
      ${
        isActive
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
          : 'bg-white/50 text-slate-600 hover:bg-white/80 border-2 border-purple-200'
      }
    `}
    style={{ fontFamily: "'Averia Serif Libre', serif" }}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default function HappyLifePage({ galleryImages, addImageToGallery }: HappyLifePageProps) {
  const [activeSubPage, setActiveSubPage] = useState<HappyLifeSubPage>(HappyLifeSubPage.Editor);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);

  const handleSelectImageForEdit = (imageUrl: string) => {
    setSelectedImageForEdit(imageUrl);
    setActiveSubPage(HappyLifeSubPage.Editor);
  };

  const renderSubPage = () => {
    switch (activeSubPage) {
      case HappyLifeSubPage.Editor:
        return <PetImageEditor addImageToGallery={addImageToGallery} selectedImage={selectedImageForEdit} />;
      case HappyLifeSubPage.StoryCreator:
        return <PetStoryCreator addImageToGallery={addImageToGallery} />;
      case HappyLifeSubPage.Gallery:
        return <PetGallery images={galleryImages} onSelectImageForEdit={handleSelectImageForEdit} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          🎨 Fun Zone 🎨
        </h1>
        <p className="text-slate-600 text-lg">
          Transform, create, and share your pet's moments
        </p>
      </div>

      {/* Sub Navigation */}
      <div className="flex justify-center gap-4 flex-wrap">
        <SubNavButton
          isActive={activeSubPage === HappyLifeSubPage.Editor}
          onClick={() => setActiveSubPage(HappyLifeSubPage.Editor)}
          icon={<span className="text-xl">🎨</span>}
          label="Playground"
        />
        <SubNavButton
          isActive={activeSubPage === HappyLifeSubPage.StoryCreator}
          onClick={() => setActiveSubPage(HappyLifeSubPage.StoryCreator)}
          icon={<span className="text-xl">📖</span>}
          label="Stories"
        />
        <SubNavButton
          isActive={activeSubPage === HappyLifeSubPage.Gallery}
          onClick={() => setActiveSubPage(HappyLifeSubPage.Gallery)}
          icon={<span className="text-xl">🖼️</span>}
          label="Gallery"
        />
      </div>

      {/* Content */}
      <div>{renderSubPage()}</div>
    </div>
  );
}
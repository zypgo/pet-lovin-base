import React from 'react';
import { PetIdentificationResult } from '../services/geminiService';

interface PetInfoDisplayProps {
  petData: PetIdentificationResult;
}

const PetInfoDisplay: React.FC<PetInfoDisplayProps> = ({ petData }) => {
  const confidencePercentage = Math.round(petData.confidence * 100);
  
  return (
    <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-8 rounded-2xl shadow-lg border border-pink-100" 
         style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      
      {/* Title and Confidence */}
      <div className="text-center mb-8">
        <h3 className="text-3xl font-bold text-purple-800 mb-2">
          🐾 Pet Identification Results 🐾
        </h3>
        <div className="inline-flex items-center bg-white/70 rounded-full px-4 py-2 shadow-sm">
          <span className="text-sm text-gray-600">Confidence Score:</span>
          <span className="ml-2 font-bold text-purple-700">{confidencePercentage}%</span>
        </div>
      </div>

      {/* Basic Information Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-pink-200">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">🏷️</span>
            <h4 className="text-lg font-semibold text-purple-800">Basic Information</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Breed:</span>
              <span className="font-medium text-purple-700">{petData.breed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Species:</span>
              <span className="font-medium text-purple-700">{petData.species}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-pink-200">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">📏</span>
            <h4 className="text-lg font-semibold text-purple-800">Physical Characteristics</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium text-purple-700">{petData.physicalCharacteristics.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Coat:</span>
              <span className="font-medium text-purple-700">{petData.physicalCharacteristics.coat}</span>
            </div>
            <div>
              <span className="text-gray-600">Colors:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {petData.physicalCharacteristics.colors.map((color, index) => (
                  <span key={index} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    {color}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personality Traits */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-pink-200 mb-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">💝</span>
          <h4 className="text-lg font-semibold text-purple-800">Personality Traits</h4>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-600 block mb-2">Personality:</span>
            <div className="space-y-1">
              {petData.temperament.personality.map((trait, index) => (
                <span key={index} className="inline-block bg-pink-100 text-pink-700 px-2 py-1 rounded-lg text-sm mr-1 mb-1">
                  {trait}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600 block mb-2">Energy Level:</span>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-medium">
              {petData.temperament.energyLevel}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600 block mb-2">Family Friendly:</span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-medium">
              {petData.temperament.familyFriendly}
            </span>
          </div>
        </div>
      </div>

      {/* Care Recommendations */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-pink-200 mb-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">🌟</span>
          <h4 className="text-lg font-semibold text-purple-800">Care Recommendations</h4>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                <span className="mr-2">🏃‍♂️</span>Exercise Needs
              </h5>
              <p className="text-sm text-blue-700">{petData.careNeeds.exercise}</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                <span className="mr-2">✂️</span>Grooming Care
              </h5>
              <p className="text-sm text-green-700">{petData.careNeeds.grooming}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <h5 className="font-semibold text-orange-800 mb-2 flex items-center">
                <span className="mr-2">🍽️</span>Feeding Guide
              </h5>
              <p className="text-sm text-orange-700">{petData.careNeeds.feeding}</p>
            </div>
            {petData.careNeeds.specialNeeds && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <h5 className="font-semibold text-purple-800 mb-2 flex items-center">
                  <span className="mr-2">⚠️</span>Special Needs
                </h5>
                <p className="text-sm text-purple-700">{petData.careNeeds.specialNeeds}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Considerations */}
      {petData.healthConsiderations && petData.healthConsiderations.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-pink-200">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">🏥</span>
            <h4 className="text-lg font-semibold text-purple-800">Health Considerations</h4>
          </div>
          <div className="grid gap-3">
            {petData.healthConsiderations.map((consideration, index) => (
              <div key={index} className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-yellow-600 mr-2 mt-0.5">⚡</span>
                <span className="text-sm text-yellow-800">{consideration}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PetInfoDisplay;

import React, { useState } from 'react';
import { identifyPet, PetIdentificationResult } from '../services/geminiService';
import Spinner from './Spinner';
import ImageInput from './ImageInput';
import PetInfoDisplay from './PetInfoDisplay';
import { supabase } from '../src/integrations/supabase/client';
import { useAuth } from '../src/contexts/AuthContext';

const PetIdentifier: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PetIdentificationResult | null>(null);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();

  const handleIdentify = async () => {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const response = await identifyPet(file);
      setResult(response);

      // Save to database
      if (user && response) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Image = reader.result as string;
          
          const { error: dbError } = await supabase
            .from('pet_identifications')
            .insert({
              user_id: user.id,
              image_url: base64Image,
              breed: response.breed,
              species: response.species,
              confidence: response.confidence,
              physical_characteristics: response.physicalCharacteristics,
              temperament: response.temperament,
              care_needs: response.careNeeds,
              health_considerations: response.healthConsiderations || []
            });

          if (dbError) {
            console.error('Failed to save identification:', dbError);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
          <h1 className="text-4xl font-bold text-purple-800 mb-3">
            🐾 AI Pet Identification Expert 🐾
          </h1>
          <p className="text-lg text-purple-600 max-w-2xl mx-auto leading-relaxed">
            Upload your pet's photo and let AI identify the breed, analyze personality traits, and provide professional care recommendations
          </p>
        </div>
        
        {/* Upload Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-pink-200">
          <ImageInput 
            onFileSelect={setFile} 
            prompt="Click or drag pet photo here 📷" 
          />
          
          <button
            onClick={handleIdentify}
            disabled={!file || loading}
            className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
            style={{ fontFamily: "'Averia Serif Libre', serif" }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Identifying...
              </span>
            ) : (
              '🔍 Start Pet Identification'
            )}
          </button>
        </div>

        {/* Loading Animation */}
        {loading && (
          <div className="text-center">
            <Spinner text="AI is carefully analyzing your pet photo..." />
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
            <div className="flex items-center">
              <span className="text-xl mr-3">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Results Display */}
        {result && <PetInfoDisplay petData={result} />}
      </div>
    </div>
  );
};

export default PetIdentifier;

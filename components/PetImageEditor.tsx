
import React, { useState, useEffect } from 'react';
import { editPetImage } from '../services/geminiService';
import Spinner from './Spinner';
import ImageInput from './ImageInput';
import { EditedImageResult } from '../types';
import { supabase } from '../src/integrations/supabase/client';

interface PetImageEditorProps {
  addImageToGallery: (imageUrl: string) => Promise<void>;
  selectedImage?: string | null;
}

const PetImageEditor: React.FC<PetImageEditorProps> = ({ addImageToGallery, selectedImage }) => {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<EditedImageResult | null>(null);
  const [error, setError] = useState<string>('');
  const [originalImage, setOriginalImage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedImage) {
      // Convert URL to File object for editing
      fetch(selectedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'selected-image.jpg', { type: blob.type });
          setFile(file);
          setOriginalImage(selectedImage);
          setResult(null); // Clear previous results
          setError(''); // Clear previous errors
        })
        .catch(err => {
          console.error('Error loading selected image:', err);
          setError('Failed to load selected image');
        });
    }
  }, [selectedImage]);

  const saveToGallery = async (imageBase64: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert base64 to blob
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('pet-images')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pet-images')
        .getPublicUrl(fileName);

      // Save to database as private (is_public = false)
      const { error: dbError } = await supabase
        .from('gallery_images')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          storage_path: fileName,
          title: 'AI Generated',
          description: prompt,
          is_public: false
        });

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error saving to gallery:', error);
    }
  };

  const handleEdit = async () => {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }
    if (!prompt) {
      setError('Please enter an editing instruction.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    
    // Create a preview for the original image
    const reader = new FileReader();
    reader.onloadend = async () => {
        setOriginalImage(reader.result as string);
        try {
            const response = await editPetImage(file, prompt);
            setResult(response);
            if (response.imageBase64) {
              const imageData = `data:image/png;base64,${response.imageBase64}`;
              await saveToGallery(imageData);
              await addImageToGallery(imageData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 p-6 rounded-3xl" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <span className="text-3xl">🎨</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce">
                <span className="text-sm">✨</span>
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-3">
            🎨 Pet Creative Playground 🎨
          </h2>
          <p className="text-orange-600 max-w-2xl mx-auto leading-relaxed text-lg">
            🌈 Upload your pet's photo and let our magical AI transform it into something amazing! 🌈
          </p>
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-red-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-orange-200">
          <ImageInput onFileSelect={setFile} prompt="📸 Drop your pet's photo here for magical transformation!" />
      
          {/* Creative Instruction Section */}
          <div className="mt-8">
            <label htmlFor="prompt" className="flex items-center text-lg font-bold text-orange-700 mb-4">
              <span className="mr-3 text-2xl">🚀</span>
              What magical transformation do you want?
            </label>
            <div className="relative">
              <input
                id="prompt"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="✨ Make my dog wear a superhero cape, add rainbow wings to my cat, give my pet a crown..."
                className="w-full px-4 py-4 bg-white/80 border-2 border-orange-200 rounded-2xl shadow-lg placeholder-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-300/50 focus:border-red-400 text-sm backdrop-blur-sm"
                style={{ fontFamily: "'Averia Serif Libre', serif" }}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-2xl animate-pulse">🎨</span>
              </div>
            </div>
            
            {/* Creative suggestions */}
            <div className="mt-4">
              <p className="text-sm text-red-600 mb-3 font-semibold">💡 Popular transformations:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Add a superhero cape',
                  'Give them angel wings',
                  'Put on a pirate hat',
                  'Add colorful butterflies',
                  'Make them wear sunglasses',
                  'Add a royal crown'
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(suggestion)}
                    className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-full text-xs transition-colors border border-orange-300"
                    style={{ fontFamily: "'Averia Serif Libre', serif" }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleEdit}
            disabled={!file || !prompt || loading}
            className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-xl border-2 border-white/30"
            style={{ fontFamily: "'Averia Serif Libre', serif" }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                🎨 Creating Magic...
              </span>
            ) : (
              '✨ Create Magical Transformation ✨'
            )}
          </button>
        </div>

        {loading && (
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border-2 border-orange-200 shadow-lg">
            <Spinner text="🎨 Our magical AI is painting your masterpiece..." />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-4">😱</span>
              <div>
                <h4 className="font-bold mb-1">Creative block!</h4>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl shadow-xl border-2 border-orange-200">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl">🎨</span>
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-bold text-orange-700">🎉 Ta-da! Your Masterpiece! 🎉</h3>
                <p className="text-red-600 text-sm">Before and after transformation</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                <div className="text-center">
                    <div className="bg-white p-4 rounded-2xl border-2 border-orange-200 shadow-lg">
                        <h4 className="font-bold mb-4 text-orange-700 text-lg flex items-center justify-center">
                            <span className="mr-2">📷</span>
                            Original
                        </h4>
                        <img src={originalImage!} alt="Original pet" className="rounded-xl shadow-lg mx-auto max-w-full h-auto" />
                    </div>
                </div>
                <div className="text-center">
                    <div className="bg-white p-4 rounded-2xl border-2 border-red-200 shadow-lg">
                        <h4 className="font-bold mb-4 text-red-700 text-lg flex items-center justify-center">
                            <span className="mr-2">✨</span>
                            Magical Result
                        </h4>
                        {result.imageBase64 ? (
                            <img src={`data:image/png;base64,${result.imageBase64}`} alt="Transformed pet" className="rounded-xl shadow-lg mx-auto max-w-full h-auto" />
                        ) : (
                            <div className="bg-gray-100 rounded-xl p-8 text-gray-500">
                                <span className="text-4xl block mb-2">🤔</span>
                                <p>No transformation image was created. Try a different instruction!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {result.text && (
                <div className="bg-white/80 p-6 rounded-xl border-2 border-orange-200 shadow-inner">
                    <div className="flex items-start">
                        <span className="text-2xl mr-3 flex-shrink-0">💬</span>
                        <div>
                            <h5 className="font-bold text-orange-700 mb-2">AI Artist's Note:</h5>
                            <p className="text-gray-700" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
                                {result.text}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Celebration decoration */}
            <div className="text-center mt-6">
                <div className="flex justify-center space-x-2">
                    <span className="text-2xl animate-bounce">🎉</span>
                    <span className="text-2xl animate-bounce" style={{animationDelay: '0.1s'}}>✨</span>
                    <span className="text-2xl animate-bounce" style={{animationDelay: '0.2s'}}>🌈</span>
                    <span className="text-2xl animate-bounce" style={{animationDelay: '0.3s'}}>✨</span>
                    <span className="text-2xl animate-bounce" style={{animationDelay: '0.4s'}}>🎉</span>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetImageEditor;
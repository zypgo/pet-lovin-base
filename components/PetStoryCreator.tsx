import React, { useState, useEffect, useRef } from 'react';
import { createPetStoryPost } from '../services/geminiService';
import Spinner from './Spinner';
import { SocialPost } from '../types';

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM11 16.09V18H9v2h6v-2h-2v-1.91A7.002 7.002 0 0 0 19 9h-2a5 5 0 0 1-10 0H5a7.002 7.002 0 0 0 6 6.09Z" />
    </svg>
);

// Check for SpeechRecognition API
// FIX: Cast window to `any` to access non-standard SpeechRecognition APIs and avoid TypeScript errors.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
}

interface PetStoryCreatorProps {
  addImageToGallery: (imageUrl: string) => void;
}

const PetStoryCreator: React.FC<PetStoryCreatorProps> = ({ addImageToGallery }) => {
  const [story, setStory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SocialPost | null>(null);
  const [error, setError] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const storyRef = useRef(story);
  storyRef.current = story;

  useEffect(() => {
    if (!recognition) return;

    // FIX: Use `any` for the event type as `SpeechRecognitionEvent` is not in default DOM typings.
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setStory(storyRef.current + finalTranscript);
    };
    
    // FIX: Use `any` for the event type as `SpeechRecognitionErrorEvent` is not in default DOM typings.
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Voice recording error: ${event.error}. Please ensure microphone access is granted.`);
      setIsRecording(false);
    };

    return () => {
        recognition.stop();
    }
  }, []);

  const handleCreatePost = async () => {
    if (!story) {
      setError('Please write a story about your pet first.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const response = await createPetStoryPost(story);
      setResult(response);
      addImageToGallery(response.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!recognition) {
        setError("Your browser doesn't support voice recording.");
        return;
    }
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-6 rounded-3xl" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <span className="text-3xl">📝</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce">
                <span className="text-sm">✨</span>
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            📚 Pet Story Creator 📚
          </h2>
          <p className="text-purple-600 max-w-2xl mx-auto leading-relaxed text-lg">
            🌈 Share a heartwarming story about your pet and we'll create a beautiful social media post! 🌈
          </p>
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>

        {/* Story Writing Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-purple-200">
          <div className="mb-6">
            <label htmlFor="story" className="flex items-center text-lg font-bold text-purple-700 mb-4">
              <span className="mr-3 text-2xl">💕</span>
              Tell us your pet's adorable story!
            </label>
            <div className="relative">
              <textarea
                id="story"
                value={story}
                onChange={(e) => setStory(e.target.value)}
                rows={6}
                placeholder="🐶 Today, my cat Fluffy discovered a sunbeam and chased it for an hour straight... Write about your pet's cute moments, funny adventures, or sweet behaviors!"
                className="w-full px-4 py-4 bg-white/80 border-2 border-purple-200 rounded-2xl shadow-lg placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-300/50 focus:border-pink-400 text-sm backdrop-blur-sm resize-none"
                style={{ fontFamily: "'Averia Serif Libre', serif" }}
              />
              {/* Voice Recording Button */}
              {recognition && (
                <button
                    onClick={toggleRecording}
                    title={isRecording ? "Stop recording" : "Start voice recording"}
                    className={`absolute bottom-4 right-4 p-3 rounded-full transition-all duration-300 transform hover:scale-110 shadow-lg ${
                        isRecording 
                            ? 'bg-gradient-to-br from-red-400 to-red-600 text-white animate-pulse border-2 border-white' 
                            : 'bg-gradient-to-br from-purple-400 to-pink-500 text-white hover:from-purple-500 hover:to-pink-600 border-2 border-white/50'
                    }`}
                >
                    <MicrophoneIcon className="w-6 h-6" />
                </button>
              )}
              {/* Story length indicator */}
              <div className="absolute bottom-3 left-3 text-xs text-purple-500 bg-white/80 px-2 py-1 rounded-full">
                {story.length} characters
              </div>
            </div>
          </div>
          
          {/* Story prompts */}
          <div className="mb-6">
            <p className="text-sm text-pink-600 mb-3 font-semibold">💡 Story inspiration:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'My pet\'s morning routine',
                'Funniest thing they did today',
                'Their favorite sleeping spot',
                'How they greet me home',
                'Their silly food habits'
              ].map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setStory(prompt + ': ')}
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full text-xs transition-colors border border-purple-300"
                  style={{ fontFamily: "'Averia Serif Libre', serif" }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreatePost}
            disabled={!story || loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-xl border-2 border-white/30"
            style={{ fontFamily: "'Averia Serif Libre', serif" }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                🌈 Creating Your Story...
              </span>
            ) : (
              '📚 Create Beautiful Social Post 📚'
            )}
          </button>
        </div>

        {loading && (
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border-2 border-purple-200 shadow-lg">
            <Spinner text="📝 Our storyteller AI is crafting your perfect post with a magical image..." />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-4">😭</span>
              <div>
                <h4 className="font-bold mb-1">Story creation hiccup!</h4>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl shadow-xl border-2 border-purple-200">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl">📝</span>
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-bold text-purple-700">🎉 Your Story Post is Ready! 🎉</h3>
                <p className="text-pink-600 text-sm">Perfect for sharing with the world!</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Generated Image */}
              <div className="bg-white p-6 rounded-2xl border-2 border-purple-200 shadow-lg">
                <h4 className="font-bold mb-4 text-purple-700 text-lg flex items-center justify-center">
                  <span className="mr-2">🇺</span>
                  Your Story's Magical Image
                </h4>
                <div className="relative">
                  <img 
                    src={result.imageUrl} 
                    alt="AI generated art for the pet story" 
                    className="rounded-xl w-full object-cover shadow-lg max-h-96" 
                  />
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-purple-600 font-semibold">
                    🤖 AI Generated
                  </div>
                </div>
              </div>
              
              {/* Caption */}
              <div className="bg-white p-6 rounded-2xl border-2 border-pink-200 shadow-lg">
                <h4 className="font-bold mb-4 text-pink-700 text-lg flex items-center justify-center">
                  <span className="mr-2">💬</span>
                  Perfect Caption
                </h4>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed" 
                     style={{ fontFamily: "'Averia Serif Libre', serif" }}>
                    {result.caption}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Share celebration */}
            <div className="text-center mt-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl border-2 border-yellow-300">
              <div className="flex justify-center space-x-2 mb-2">
                <span className="text-2xl animate-bounce">🎉</span>
                <span className="text-2xl animate-bounce" style={{animationDelay: '0.1s'}}>📱</span>
                <span className="text-2xl animate-bounce" style={{animationDelay: '0.2s'}}>💕</span>
                <span className="text-2xl animate-bounce" style={{animationDelay: '0.3s'}}>📱</span>
                <span className="text-2xl animate-bounce" style={{animationDelay: '0.4s'}}>🎉</span>
              </div>
              <p className="text-orange-700 font-semibold">
                Ready to share your pet's story with the world! 🌍
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetStoryCreator;
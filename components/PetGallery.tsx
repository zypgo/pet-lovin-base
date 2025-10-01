
import React from 'react';

interface PetGalleryProps {
  images: string[];
}

const PetGallery: React.FC<PetGalleryProps> = ({ images }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-6 rounded-3xl" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <span className="text-3xl">🖼️</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center border-4 border-white animate-bounce">
                <span className="text-sm">✨</span>
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-3">
            🎨 Creative Pet Gallery 🎨
          </h2>
          <p className="text-orange-600 max-w-2xl mx-auto leading-relaxed text-lg">
            🌈 A magical collection of all the wonderful images you've created with your beloved pets! 🌈
          </p>
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((imgSrc, index) => (
              <div key={index} className="group">
                <div className="bg-white/80 p-4 rounded-2xl shadow-xl border-2 border-yellow-200 transition-all duration-500 hover:scale-105 hover:rotate-1 hover:shadow-2xl backdrop-blur-sm">
                  <div className="aspect-square bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl overflow-hidden shadow-lg relative">
                    <img
                      src={imgSrc}
                      alt={`Generated pet art ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {/* Cute overlay */}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-orange-600">
                      ✨ #{index + 1}
                    </div>
                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  </div>
                  
                  {/* Cute frame decoration */}
                  <div className="mt-3 text-center">
                    <p className="text-xs text-orange-600 font-semibold">
                      🎨 Masterpiece {index + 1}
                    </p>
                    <div className="flex justify-center mt-2 space-x-1">
                      <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-pink-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 border-2 border-dashed border-yellow-300 shadow-xl">
              <div className="mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-200 to-orange-300 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <span className="text-4xl">🖼️</span>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-orange-700 mb-4">
                🌈 Your Gallery Awaits! 🌈
              </h3>
              <p className="text-orange-600 mb-6 max-w-md mx-auto leading-relaxed">
                Your creative pet gallery is ready for some magical artwork! Create your first masterpiece to get started.
              </p>
              
              {/* Call to action */}
              <div className="space-y-3">
                <div className="flex justify-center space-x-4">
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full border border-purple-300">
                    <span className="text-sm font-semibold text-purple-700">🎨 Pet Playground</span>
                  </div>
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full border border-blue-300">
                    <span className="text-sm font-semibold text-blue-700">📝 Pet Stories</span>
                  </div>
                </div>
                <p className="text-sm text-yellow-600 font-medium">
                  Visit these sections to create amazing images of your pets!
                </p>
              </div>
              
              {/* Decorative elements */}
              <div className="mt-8 flex justify-center space-x-4">
                <div className="w-4 h-4 bg-yellow-300 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-orange-300 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-4 h-4 bg-pink-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetGallery;

import React, { useState, useEffect } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { useAuth } from '../src/contexts/AuthContext';
import ImageInput from './ImageInput';
import Spinner from './Spinner';

interface GalleryImage {
  id: string;
  image_url: string;
  title: string;
  description: string;
  likes_count: number;
  created_at: string;
  user_id: string;
  is_public: boolean;
}

interface PetGalleryProps {
  images: string[];
  onSelectImageForEdit?: (imageUrl: string) => void;
}

const PetGallery: React.FC<PetGalleryProps> = ({ images, onSelectImageForEdit }) => {
  const [myImages, setMyImages] = useState<GalleryImage[]>([]);
  const [publicImages, setPublicImages] = useState<GalleryImage[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    getCurrentUser();
    loadGalleryImages();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user.id);
    }
  };

  const loadGalleryImages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Load my private images
      if (user) {
        const { data: myData, error: myError } = await supabase
          .from('gallery_images')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_public', false)
          .order('created_at', { ascending: false });

        if (myError) throw myError;
        setMyImages(myData || []);
      }

      // Load public images
      const { data: publicData, error: publicError } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (publicError) throw publicError;
      setPublicImages(publicData || []);

      // Load usernames for all images
      const allImages = [...(myImages || []), ...(publicData || [])];
      if (allImages.length > 0) {
        const userIds = [...new Set(allImages.map(img => img.user_id))];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        if (profiles) {
          const usernameMap: Record<string, string> = {};
          profiles.forEach(p => {
            usernameMap[p.id] = p.username;
          });
          setUsernames(usernameMap);
        }
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !user) return;

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('pet-images')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pet-images')
        .getPublicUrl(fileName);

      // Save to database as public
      const { error: dbError } = await supabase
        .from('gallery_images')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          storage_path: fileName,
          title: uploadTitle || 'My Pet',
          description: uploadDescription || '',
          is_public: true
        });

      if (dbError) throw dbError;

      // Reload gallery
      await loadGalleryImages();
      
      // Reset form
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed, please try again');
    } finally {
      setUploading(false);
    }
  };

  const handleShareToPublic = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('gallery_images')
        .update({ is_public: true })
        .eq('id', imageId);

      if (error) throw error;

      // Reload gallery
      await loadGalleryImages();
    } catch (error) {
      console.error('Error sharing image:', error);
      alert('Failed to share image');
    }
  };

  const handleMixImage = (imageUrl: string) => {
    console.log('Mix image clicked:', imageUrl);
    if (onSelectImageForEdit) {
      onSelectImageForEdit(imageUrl);
    }
  };

  const renderImageCard = (img: GalleryImage, showShareButton: boolean = false) => (
    <div key={img.id} className="group">
      <div className="bg-white/80 p-4 rounded-2xl shadow-xl border-2 border-yellow-200 transition-all duration-500 hover:scale-105 hover:shadow-2xl backdrop-blur-sm">
        <div className="aspect-square bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl overflow-hidden shadow-lg relative">
          <img
            src={img.image_url}
            alt={img.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {/* User badge */}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-orange-600">
            👤 {usernames[img.user_id] || 'User'}
          </div>
          {/* Hover effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end p-4">
            <div className="text-white">
              <p className="font-bold text-sm">{img.title}</p>
              {img.description && (
                <p className="text-xs mt-1 line-clamp-2">{img.description}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Info */}
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-orange-700 truncate">{img.title}</p>
          <div className="flex items-center justify-between text-xs text-orange-600">
            <span>❤️ {img.likes_count}</span>
            <span>{new Date(img.created_at).toLocaleDateString('en-US')}</span>
          </div>
          
          {/* Action buttons */}
          {showShareButton && (
            <button
              onClick={() => handleShareToPublic(img.id)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              📤 Share to Community
            </button>
          )}
          
          {!showShareButton && img.is_public && (
            <button
              onClick={() => handleMixImage(img.image_url)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-2 px-4 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all"
            >
              🎨 Mix in Playground
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-6 rounded-3xl" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
      <div className="max-w-6xl mx-auto space-y-12">
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
            🎨 Pet Gallery 🎨
          </h2>
          <p className="text-orange-600 max-w-2xl mx-auto leading-relaxed text-lg">
            🌈 Share your lovely pet photos and enjoy cute pets from our community! 🌈
          </p>
        </div>

        {/* My Photos Section */}
        {currentUser && myImages.length > 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                📱 My Photos
              </h3>
              <p className="text-orange-600">
                Your private collection - share them to make public
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {myImages.map((img) => renderImageCard(img, true))}
            </div>
          </div>
        )}

        {/* Community Gallery Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
                🌍 Community Gallery
              </h3>
              <p className="text-orange-600">
                Beautiful photos shared by the community
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              📸 Upload
            </button>
          </div>

          {/* Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                <h3 className="text-2xl font-bold text-purple-700 mb-4">Share Pet Photo</h3>
                
                <div className="space-y-4">
                  <ImageInput onFileSelect={setUploadFile} prompt="Choose a photo 📷" />
                  
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  
                  <textarea
                    placeholder="Description (optional)"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                  />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleUpload}
                      disabled={!uploadFile || uploading}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all"
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      onClick={() => setShowUploadModal(false)}
                      disabled={uploading}
                      className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <Spinner text="Loading community images..." />
            </div>
          ) : publicImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {publicImages.map((img) => renderImageCard(img, false))}
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
                  🌈 Be the first to share! 🌈
                </h3>
                <p className="text-orange-600 mb-6 max-w-md mx-auto leading-relaxed">
                  The community gallery is waiting for your first pet photo! Click the upload button to start sharing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetGallery;
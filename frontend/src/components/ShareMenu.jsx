import React, { useState, useEffect, useRef } from 'react';
import { Share2, Copy, Instagram } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareMenu({ url, text }) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  const toggleShareMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareMenu(prev => !prev);
  };

  const shareToPlatform = (e, platform) => {
    e.preventDefault();
    e.stopPropagation();
    
    setShowShareMenu(false);

    if (platform === 'copy') {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied to clipboard!", { icon: '🔗' });
      }).catch(() => toast.error("Failed to copy link"));
      return;
    }

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
      return;
    }

    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      return;
    }

    if (platform === 'x') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
      return;
    }

    if (platform === 'instagram') {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied! Open Instagram to share.", { icon: '📸' });
        setTimeout(() => window.open('https://instagram.com', '_blank'), 1500);
      });
      return;
    }
  };

  return (
    <div className="relative" ref={shareMenuRef}>
      <button
        onClick={toggleShareMenu}
        className={`p-1.5 sm:p-2 rounded-lg transition-colors focus:outline-none cursor-pointer ${showShareMenu ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </button>

      {/* Popover Menu Expanding Towards Top */}
      {showShareMenu && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-100 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 z-[100] min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button onClick={(e) => shareToPlatform(e, 'whatsapp')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#25D366]/10 hover:text-[#25D366] rounded-lg transition-colors">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            WhatsApp
          </button>
          <button onClick={(e) => shareToPlatform(e, 'x')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-black rounded-lg transition-colors">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            X (Twitter)
          </button>
          <button onClick={(e) => shareToPlatform(e, 'instagram')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#E1306C]/10 hover:text-[#E1306C] rounded-lg transition-colors">
            <Instagram className="w-4 h-4 mr-2" />
            Instagram
          </button>
          <button onClick={(e) => shareToPlatform(e, 'facebook')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#1877F2]/10 hover:text-[#1877F2] rounded-lg transition-colors">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </button>
          <div className="h-px bg-gray-100 my-1"></div>
          <button onClick={(e) => shareToPlatform(e, 'copy')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, FileText, MapPin, Send, Map as MapIcon } from 'lucide-react';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import VectorTileLayer from '../components/VectorTileLayer';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function RecenterMap({ position }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (position && map) {
      map.setView(position, 15, { animate: true });
    }
  }, [position, map]);
  return null;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const loc = useLocation();
  const queryParams = new URLSearchParams(loc.search);
  
  const [type, setType] = useState(queryParams.get('type') || 'query');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [locationText, setLocationText] = useState('');
  const [position, setPosition] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Auto-focus location if it's an emergency
  useEffect(() => {
    if (type === 'emergency' && navigator.geolocation && !position) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(p);
        setShowMap(true);
        // Auto-fill location text if empty with approximate coords
        if (!locationText) {
          setLocationText(`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
        }
      }, () => {
        // user denied or error
      });
    }
  }, [type, position]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const communityId = queryParams.get('communityId');
      
      let finalLocation = null;
      if (type === 'emergency') {
         finalLocation = position ? `${locationText}||${position.lat},${position.lng}` : locationText;
      }

      await axios.post(`${API_URL}/posts`, {
        title,
        content,
        type,
        location: finalLocation,
        community_id: communityId ? parseInt(communityId) : null
      });
      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
        {/* Header gradient line */}
        <div className={`h-2 w-full ${type === 'emergency' ? 'bg-gradient-to-r from-emergency-500 to-orange-500' : 'bg-gradient-to-r from-primary-500 to-teal-500'}`}></div>
        
        <div className="p-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
            {type === 'emergency' ? 'Report an Emergency' : 'Ask the Community'}
          </h1>
          
          <div className="flex bg-gray-100 p-1 rounded-xl mb-8 space-x-1">
            <button
              type="button"
              className={`flex-1 flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                type === 'query' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setType('query')}
            >
              <FileText className="w-4 h-4 mr-2" />
              General Query
            </button>
            <button
              type="button"
              className={`flex-1 flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                type === 'emergency' ? 'bg-emergency-500 text-white shadow shadow-emergency-500/30' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setType('emergency')}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Emergency Alert
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'emergency' ? 'What happened?' : 'What do you need help with?'}
              </label>
              <input
                id="title"
                required
                type="text"
                placeholder={type === 'emergency' ? "e.g., Car accident near highway, need immediate hospital suggestions" : "e.g., Looking for a good pediatrician in downtown"}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-primary-500 transition-colors bg-gray-50 focus:bg-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Details
              </label>
              <textarea
                id="content"
                required
                rows={5}
                placeholder="Provide more context..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-primary-500 transition-colors bg-gray-50 focus:bg-white resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {type === 'emergency' && (
              <div className="animate-fade-in space-y-3">
                <div>
                  <label htmlFor="locationText" className="flex text-sm font-medium text-gray-700 mb-1 items-center justify-between">
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-emergency-500" />
                      Location Description
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setShowMap(!showMap)}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center bg-primary-50 px-2 py-1 rounded-md"
                      >
                        <MapIcon className="w-3 h-3 mr-1" />
                        {showMap ? 'Hide Map' : 'Pin Exact Location on Map'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!locationText) return setGeocodeError('Enter a location to find');
                          setGeocodeError('');
                          setGeocoding(true);
                          try {
                            const q = encodeURIComponent(locationText);
                            // Use OpenStreetMap Nominatim for free geocoding
                            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
                            const data = await res.json();
                            if (!data || data.length === 0) {
                              setGeocodeError('Location not found');
                            } else {
                              const lat = parseFloat(data[0].lat);
                              const lon = parseFloat(data[0].lon);
                              const p = { lat, lng: lon };
                              setPosition(p);
                              setShowMap(true);
                            }
                          } catch (err) {
                            setGeocodeError('Failed to find location');
                          } finally {
                            setGeocoding(false);
                          }
                        }}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center bg-primary-50 px-2 py-1 rounded-md"
                      >
                        {geocoding ? 'Finding...' : 'Find on map'}
                      </button>
                    </div>
                  </label>
                  <input
                    id="locationText"
                    required
                    type="text"
                    placeholder="e.g., 5th Avenue crossing Main Street"
                    className="w-full px-4 py-3 rounded-xl border border-emergency-300 focus:ring-2 focus:border-transparent focus:ring-emergency-500 transition-shadow bg-emergency-50 focus:bg-white"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                  />
                  {geocodeError && <p className="mt-2 text-xs text-red-600">{geocodeError}</p>}
                </div>
                
                {showMap && (
                  <div className="h-64 rounded-xl overflow-hidden border border-gray-300 relative z-0">
                    <MapContainer 
                      center={position || [51.505, -0.09]} 
                      zoom={position ? 15 : 13} 
                      scrollWheelZoom={true} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <VectorTileLayer />
                      <LocationMarker position={position} setPosition={setPosition} />
                      <RecenterMap position={position} />
                    </MapContainer>
                    {!position && (
                       <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-3 py-1.5 rounded-full shadow-md text-xs font-bold text-gray-700 pointer-events-none">
                         Click on map to place pin
                       </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-transparent rounded-lg mr-3 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all ${
                  type === 'emergency' 
                    ? 'bg-emergency-600 hover:bg-emergency-500 text-white focus:ring-emergency-500 focus:ring-offset-emergency-50' 
                    : 'bg-primary-600 hover:bg-primary-500 text-white focus:ring-primary-500 focus:ring-offset-primary-50'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {loading ? 'Posting...' : 'Post to Community'}
                {!loading && <Send className="w-4 h-4 ml-2" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

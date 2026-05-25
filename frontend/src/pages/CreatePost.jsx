import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, FileText, MapPin, Send, Map as MapIcon, Mic, Loader2, Locate } from 'lucide-react';
import useSpeechToText from '../hooks/useSpeechToText';
import GoogleMap, { loadGoogleMaps } from '../components/GoogleMap';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';


export default function CreatePost() {
  const navigate = useNavigate();
  const loc = useLocation();
  const queryParams = new URLSearchParams(loc.search);
  const mapsApiKey = import.meta.env.VITE_MAPJS_AIP_KEY || import.meta.env.VITE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const [type, setType] = useState(queryParams.get('type') || 'query');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [locationText, setLocationText] = useState('');
  const [position, setPosition] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [loading, setLoading] = useState(false);

  const [speechLang, setSpeechLang] = useState('en-US');

  const SPEECH_LANGUAGES = [
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
    { code: 'as-IN', label: 'Assamese', flag: '🇮🇳' },
  ];

  const { 
    isListening: titleIsListening, 
    isTranscribing: titleIsTranscribing,
    isSupported: titleIsSupported, 
    error: titleError, 
    transcript: titleTranscript,
    startListening: startTitleListening,
    stopListening: stopTitleListening 
  } = useSpeechToText(speechLang);
  
  const { 
    isListening: contentIsListening, 
    isTranscribing: contentIsTranscribing,
    isSupported: contentIsSupported, 
    error: contentError, 
    transcript: contentTranscript,
    startListening: startContentListening,
    stopListening: stopContentListening 
  } = useSpeechToText(speechLang);

  const [originalTitle, setOriginalTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');

  // Handle speech-to-text transcript updates (arrives after API call completes)
  useEffect(() => {
    if (titleTranscript) {
      setTitle(originalTitle + (originalTitle ? ' ' : '') + titleTranscript.trim());
    }
  }, [titleTranscript]);

  useEffect(() => {
    if (contentTranscript) {
      setContent(originalContent + (originalContent ? ' ' : '') + contentTranscript.trim());
    }
  }, [contentTranscript]);
  
  // Get device location on mount for map centering
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDeviceLocation(p);
      }, () => {
        // user denied or error — no-op
      });
    }
  }, []);

  // Auto-focus location if it's an emergency
  useEffect(() => {
    if (type === 'emergency' && navigator.geolocation && !position) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(p);
        setDeviceLocation(p);
        setShowMap(true);
        // Reverse geocode to get a readable address
        if (!locationText) {
          loadGoogleMaps(mapsApiKey).then((google) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: p }, (results, status) => {
              if (status === 'OK' && results[0]) {
                setLocationText(results[0].formatted_address);
              } else {
                setLocationText('');
              }
            });
          }).catch(() => {
            setLocationText('');
          });
        }
      }, () => {
        // user denied or error
      });
    }
  }, [type, position]);

  // Request browser geolocation to reset/refresh the map pin back to current coordinates
  const resetToCurrentLocation = () => {
    if (navigator.geolocation) {
      setGeocoding(true);
      setGeocodeError('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(p);
          setDeviceLocation(p);
          setShowMap(true);
          
          // Reverse geocode using Google Maps API
          loadGoogleMaps(mapsApiKey).then((google) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: p }, (results, status) => {
              if (status === 'OK' && results[0]) {
                setLocationText(results[0].formatted_address);
                toast.success('Location reset to current position');
              } else {
                setLocationText('');
                toast.success('Location reset to current coordinates');
              }
              setGeocoding(false);
            });
          }).catch(() => {
            setLocationText('');
            toast.success('Location reset to current coordinates');
            setGeocoding(false);
          });
        },
        (err) => {
          console.error(err);
          setGeocodeError('Failed to access your location. Check browser permissions.');
          setGeocoding(false);
        }
      );
    } else {
      setGeocodeError('Geolocation is not supported by this browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const communityId = queryParams.get('communityId') || import.meta.env.VITE_DEFAULT_COMMUNITY_ID;
      
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
      toast.error('Failed to post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-8 animate-fade-in pb-32 px-4 sm:px-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative">
        <div className="p-5 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">
            {type === 'emergency' ? 'Report an Emergency' : 'Ask the Community'}
          </h1>
          
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              className={`flex-1 flex justify-center items-center py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all outline-none whitespace-nowrap ${
                type === 'query' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setType('query')}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              General Query
            </button>
            <button
              type="button"
              className={`flex-1 flex justify-center items-center py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all outline-none whitespace-nowrap ${
                type === 'emergency' ? 'bg-emergency-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setType('emergency')}
            >
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Emergency Alert
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-3 sm:mb-4 gap-2.5 sm:gap-2">
                <label htmlFor="title" className="block text-sm font-bold text-gray-700">
                  {type === 'emergency' ? 'What happened?' : 'What do you need help with?'}
                </label>
                {/* Language selector for speech recognition */}
                {(titleIsSupported || contentIsSupported) && (
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-gray-400 mr-1" />
                    {SPEECH_LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setSpeechLang(l.code)}
                        className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all ${
                          speechLang === l.code
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  id="title"
                  required
                  type="text"
                  placeholder={type === 'emergency' ? "e.g., Car accident near highway, need immediate hospital suggestions" : "e.g., Looking for a good pediatrician in downtown"}
                  className={`w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-primary-500 transition-colors bg-gray-50 focus:bg-white ${titleIsListening ? 'border-red-300 ring-2 ring-red-200 bg-red-50/10' : ''} ${titleIsTranscribing ? 'border-blue-300 ring-2 ring-blue-200 bg-blue-50/10' : ''}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <button
                  type="button"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all flex items-center justify-center outline-none ${
                    titleIsListening 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105 hover:bg-red-600 animate-pulse' 
                      : titleIsTranscribing
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 cursor-wait'
                        : 'bg-transparent text-gray-400 hover:bg-gray-100 hover:text-primary-600'
                  }`}
                  onClick={() => {
                    if (titleIsListening) {
                      stopTitleListening();
                    } else if (!titleIsTranscribing) {
                      setOriginalTitle(title);
                      startTitleListening();
                    }
                  }}
                  disabled={!titleIsSupported || titleIsTranscribing}
                  title={titleIsListening ? 'Recording... Click to stop' : titleIsTranscribing ? 'Transcribing...' : 'Click to dictate'}
                >
                  {titleIsTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>
                {titleError && <p className="mt-1 text-xs text-red-600 flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1" />{titleError}</p>}
              </div>
            </div>

            <div className="relative">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Details
              </label>
              <div className="relative">
                <textarea
                  id="content"
                  required
                  rows={5}
                  placeholder="Provide more context..."
                  className={`w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-primary-500 transition-colors bg-gray-50 focus:bg-white resize-none ${contentIsListening ? 'border-red-300 ring-2 ring-red-200 bg-red-50/10' : ''} ${contentIsTranscribing ? 'border-blue-300 ring-2 ring-blue-200 bg-blue-50/10' : ''}`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <button
                  type="button"
                  className={`absolute right-2 top-2 p-2 rounded-lg transition-all flex items-center justify-center outline-none ${
                    contentIsListening 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105 hover:bg-red-600 animate-pulse' 
                      : contentIsTranscribing
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 cursor-wait'
                        : 'bg-transparent text-gray-400 hover:bg-gray-100 hover:text-primary-600'
                  }`}
                  onClick={() => {
                    if (contentIsListening) {
                      stopContentListening();
                    } else if (!contentIsTranscribing) {
                      setOriginalContent(content);
                      startContentListening();
                    }
                  }}
                  disabled={!contentIsSupported || contentIsTranscribing}
                  title={contentIsListening ? 'Recording... Click to stop' : contentIsTranscribing ? 'Transcribing...' : 'Click to dictate'}
                >
                  {contentIsTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>
                {contentError && <p className="mt-1 text-xs text-red-600 flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1" />{contentError}</p>}
              </div>
            </div>

            <div 
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                type === 'emergency' ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'
              }`}
            >
              <div className="space-y-3">
                <div>
                  <label htmlFor="locationText" className="flex flex-col sm:flex-row text-sm font-medium text-gray-700 mb-2 sm:items-center sm:justify-between gap-2">
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-emergency-500" />
                      Location Description
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={resetToCurrentLocation}
                        className="text-[11px] sm:text-xs font-bold text-red-600 hover:text-red-700 flex items-center bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded-md transition-all active:scale-95 border border-red-100"
                        title="Locate me again"
                      >
                        <Locate className="w-3 h-3 mr-1" />
                        Current Location
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowMap(!showMap)}
                        className="text-[11px] sm:text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-md transition-colors border border-gray-200"
                      >
                        <MapIcon className="w-3 h-3 mr-1" />
                        {showMap ? 'Hide Map' : 'Show Map'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!locationText) return setGeocodeError('Enter a location to find');
                          setGeocodeError('');
                          setGeocoding(true);
                          try {
                            const google = await loadGoogleMaps(mapsApiKey);
                            const geocoder = new google.maps.Geocoder();
                            geocoder.geocode({ address: locationText }, async (results, status) => {
                              if (status === 'OK' && results[0]) {
                                const lat = results[0].geometry.location.lat();
                                const lng = results[0].geometry.location.lng();
                                setPosition({ lat, lng });
                                setShowMap(true);
                                setGeocoding(false);
                              } else {
                                try {
                                  const q = encodeURIComponent(locationText);
                                  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
                                  const data = await res.json();
                                  if (!data || data.length === 0) {
                                    setGeocodeError('Location not found');
                                  } else {
                                    const lat = parseFloat(data[0].lat);
                                    const lon = parseFloat(data[0].lon);
                                    setPosition({ lat, lng: lon });
                                    setShowMap(true);
                                  }
                                } catch (err) {
                                  setGeocodeError('Location not found or geocoding failed');
                                } finally {
                                  setGeocoding(false);
                                }
                              }
                            });
                          } catch (err) {
                            setGeocodeError('Failed to find location');
                            setGeocoding(false);
                          }
                        }}
                        className="text-[11px] sm:text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center bg-primary-50 hover:bg-primary-100 px-2 py-1.5 rounded-md transition-colors border border-primary-100"
                      >
                        {geocoding ? 'Finding...' : 'Find'}
                      </button>
                    </div>
                  </label>
                  <input
                    id="locationText"
                    required
                    type="text"
                    placeholder="e.g., Gauhati University"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-primary-500 transition-colors bg-gray-50 focus:bg-white"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                  />
                  {geocodeError && <p className="mt-2 text-xs text-red-600">{geocodeError}</p>}
                </div>
                
                {showMap && (
                  <div className="h-64 rounded-xl overflow-hidden border border-gray-300 relative z-0">
                    <GoogleMap 
                      center={position || deviceLocation || { lat: 20.5937, lng: 78.9629 }} 
                      zoom={position ? 15 : (deviceLocation ? 14 : 5)} 
                      markerPosition={position}
                      onMapClick={(coords) => {
                        setPosition(coords);
                        // Reverse geocode to fill location name
                        loadGoogleMaps(mapsApiKey).then((google) => {
                          const geocoder = new google.maps.Geocoder();
                          geocoder.geocode({ location: coords }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                              setLocationText(results[0].formatted_address);
                            } else {
                              setLocationText('');
                            }
                          });
                        }).catch(() => {
                          setLocationText('');
                        });
                      }}
                      scrollWheelZoom={true}
                      style={{ height: '100%', width: '100%' }}
                    />
                    {!position && (
                       <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-3 py-1.5 rounded-full shadow-md text-xs font-bold text-gray-700 pointer-events-none">
                         Click on map to place pin
                       </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 sm:pt-6 border-t border-gray-100 flex justify-end items-center mt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 sm:px-6 sm:py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-transparent rounded-xl mr-2 sm:mr-3 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center px-6 py-2 sm:py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all whitespace-nowrap ${
                  type === 'emergency' 
                    ? 'bg-emergency-600 hover:bg-emergency-500 text-white focus:ring-emergency-500 focus:ring-offset-emergency-50 hover:shadow-md' 
                    : 'bg-primary-600 hover:bg-primary-500 text-white focus:ring-primary-500 focus:ring-offset-primary-50 hover:shadow-md'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {loading ? 'Posting...' : 'Post'}
                {!loading && <Send className="w-4 h-4 ml-1.5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

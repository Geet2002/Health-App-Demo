import React, { useState, useEffect } from 'react';
import { MapPin, Locate } from 'lucide-react';
import GoogleMap, { loadGoogleMaps } from './GoogleMap';

export default function LocationSelector({ formData, setFormData }) {
  const useMap = formData.use_map !== undefined ? formData.use_map : !!(formData.location_lat && formData.location_lng);
  
  const setUseMap = (val) => {
    setFormData(prev => ({ ...prev, use_map: val }));
  };

  const initialPosition = formData.location_lat && formData.location_lng 
    ? { lat: parseFloat(formData.location_lat), lng: parseFloat(formData.location_lng) } 
    : null;
  const [position, setPosition] = useState(initialPosition);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  
  const mapsApiKey = import.meta.env.VITE_MAPJS_AIP_KEY;

  useEffect(() => {
    if (useMap && navigator.geolocation && !deviceLocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setDeviceLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {});
    }
  }, [useMap, deviceLocation]);

  const handleToggleMap = (e) => {
    const checked = e.target.checked;
    setUseMap(checked);
    if (!checked) {
      setFormData(prev => ({ ...prev, location_lat: null, location_lng: null }));
      setPosition(null);
    }
  };

  const resetToCurrentLocation = () => {
    if (navigator.geolocation) {
      setGeocoding(true);
      setGeocodeError('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(p);
          setDeviceLocation(p);
          
          if (!formData.location) {
            loadGoogleMaps(mapsApiKey).then((google) => {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: p }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  setFormData(prev => ({ ...prev, location: results[0].formatted_address, location_lat: p.lat, location_lng: p.lng }));
                }
                setGeocoding(false);
              });
            }).catch(() => setGeocoding(false));
          } else {
            setFormData(prev => ({ ...prev, location_lat: p.lat, location_lng: p.lng }));
            setGeocoding(false);
          }
        },
        () => {
          setGeocodeError('Could not get current location.');
          setGeocoding(false);
        }
      );
    } else {
      setGeocodeError('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
        <label className="block text-sm font-bold text-gray-700 flex items-center shrink-0">
          <MapPin className="w-4 h-4 mr-1 text-gray-400 shrink-0" /> Exact Location
        </label>
        <label className="flex items-center cursor-pointer text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">
          <input 
            type="checkbox" 
            checked={useMap} 
            onChange={handleToggleMap}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mr-2 cursor-pointer"
          />
          <span className="font-medium">Pin exactly on Google Map</span>
        </label>
      </div>

      {!useMap ? (
        <input
          required
          type="text"
          placeholder="e.g. City Hospital, Downtown"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none mb-2 bg-gray-50 focus:bg-white transition-colors"
          value={formData.location || ''}
          onChange={e => setFormData(prev => ({...prev, location: e.target.value}))}
        />
      ) : (
        <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              required
              type="text"
              placeholder="Search for a specific place..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={formData.location || ''}
              onChange={e => setFormData(prev => ({...prev, location: e.target.value}))}
            />
            <button
              type="button"
              onClick={async () => {
                if (!formData.location) return setGeocodeError('Enter a location to find');
                setGeocodeError('');
                setGeocoding(true);
                if (!mapsApiKey) {
                  setGeocodeError('Google Maps API key is missing.');
                  setGeocoding(false);
                  return;
                }
                try {
                  const google = await loadGoogleMaps(mapsApiKey);
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ address: formData.location }, async (results, status) => {
                    if (status === 'OK' && results[0]) {
                      const lat = results[0].geometry.location.lat();
                      const lng = results[0].geometry.location.lng();
                      setPosition({ lat, lng });
                      setFormData(prev => ({ ...prev, location_lat: lat, location_lng: lng }));
                      setGeocoding(false);
                    } else {
                      setGeocodeError('Location not found.');
                      setGeocoding(false);
                    }
                  });
                } catch (err) {
                  setGeocodeError('Failed to find location.');
                  setGeocoding(false);
                }
              }}
              className="flex items-center justify-center text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              {geocoding ? 'Finding...' : 'Find on Map'}
            </button>
            <button
              type="button"
              onClick={resetToCurrentLocation}
              disabled={geocoding}
              className="flex items-center justify-center text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors shadow-sm disabled:opacity-50"
              title="Use Current Location"
            >
              <Locate className={`w-4 h-4 ${geocoding ? 'animate-spin text-primary-500' : ''}`} />
            </button>
          </div>
          
          {geocodeError && <p className="text-xs text-red-600">{geocodeError}</p>}
          
          <div className="h-[280px] rounded-xl overflow-hidden border border-gray-200 shadow-inner relative z-0 w-full bg-gray-100">
            <GoogleMap 
              center={position || deviceLocation || { lat: 20.5937, lng: 78.9629 }} 
              zoom={position ? 15 : (deviceLocation ? 14 : 5)} 
              markerPosition={position}
              onMapClick={(coords) => {
                setPosition(coords);
                setFormData(prev => ({ ...prev, location_lat: coords.lat, location_lng: coords.lng }));
                loadGoogleMaps(mapsApiKey).then((google) => {
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ location: coords }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                      setFormData(prev => ({ ...prev, location: results[0].formatted_address }));
                    }
                  });
                }).catch(() => {});
              }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center flex items-center justify-center">
            <MapPin className="w-3 h-3 mr-1" />
            Click anywhere on the map to drop a pin precisely.
          </p>
        </div>
      )}
    </div>
  );
}

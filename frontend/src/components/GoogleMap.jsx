import React, { useEffect, useRef, useState, useCallback } from 'react';

// Cache for the loading promise
let googleMapsPromise = null;

export const loadGoogleMaps = (apiKey) => {
  if (googleMapsPromise) return googleMapsPromise;
  
  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }
    
    const callbackName = 'initGoogleMapCallback';
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google);
    };
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&libraries=places,marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error('Google Maps SDK failed to load.'));
    };
    document.head.appendChild(script);
  });
  
  return googleMapsPromise;
};


export default function GoogleMap({
  center,
  zoom = 15,
  markerPosition = null,
  onMapClick = null,
  scrollWheelZoom = true,
  className = "",
  style = {}
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const [apiKey] = useState(
    import.meta.env.VITE_MAPJS_AIP_KEY || 
    import.meta.env.VITE_MAPS_API_KEY || 
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
    ""
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toLatLng = (val) => {
    if (!val) return null;
    return Array.isArray(val) ? { lat: val[0], lng: val[1] } : val;
  };

  // Load Google Maps SDK and initialize the map
  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API Key is missing. Please add VITE_MAPJS_AIP_KEY to your .env file.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled) return;

        // Wait for the next frame so the container div is guaranteed to be in the DOM and laid out
        requestAnimationFrame(() => {
          if (cancelled || !containerRef.current) return;

          const mapCenter = toLatLng(center) || { lat: 0, lng: 0 };

          const mapInstance = new google.maps.Map(containerRef.current, {
            center: mapCenter,
            zoom: zoom,
            mapId: 'DEMO_MAP_ID',
            scrollwheel: scrollWheelZoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_CENTER
            }
          });

          mapRef.current = mapInstance;

          // Click handler using a ref so we don't need to re-bind
          mapInstance.addListener('click', (e) => {
            if (onMapClickRef.current) {
              onMapClickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            }
          });

          setLoading(false);
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load Google Maps.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [apiKey]);

  // Extract stable primitive values to prevent infinite re-renders from object literals
  const centerLat = center ? toLatLng(center).lat : null;
  const centerLng = center ? toLatLng(center).lng : null;
  const markerLat = markerPosition ? toLatLng(markerPosition).lat : null;
  const markerLng = markerPosition ? toLatLng(markerPosition).lng : null;

  // Recenter map and update zoom when center or zoom props change or map finishes loading
  useEffect(() => {
    if (!mapRef.current || centerLat === null || centerLng === null || loading) return;
    mapRef.current.panTo({ lat: centerLat, lng: centerLng });
    mapRef.current.setZoom(zoom);
  }, [centerLat, centerLng, zoom, loading]);

  // Update marker when markerPosition prop changes or map finishes loading
  useEffect(() => {
    if (!mapRef.current || !window.google || loading) return;

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.map = null;
      markerRef.current = null;
    }

    // Add new marker
    if (markerLat !== null && markerLng !== null) {
      try {
        const pin = new window.google.maps.marker.PinElement();
        pin.element.style.animation = 'marker-drop 0.4s ease-out forwards';
        
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: markerLat, lng: markerLng },
          map: mapRef.current,
          content: pin.element,
          title: "Selected Location"
        });
      } catch (err) {
        console.warn("AdvancedMarkerElement failed, falling back to Marker:", err);
        markerRef.current = new window.google.maps.Marker({
          position: { lat: markerLat, lng: markerLng },
          map: mapRef.current,
          title: "Selected Location"
        });
      }
    }
  }, [markerLat, markerLng, loading]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-xl text-center ${className}`} style={{ minHeight: '200px', ...style }}>
        <p className="text-sm font-semibold text-red-700 mb-2">{error}</p>
        <p className="text-xs text-red-500 max-w-md">
          To display maps, please ensure a valid API key is specified in the <strong>frontend/.env</strong> file under the variable <strong>VITE_MAPJS_AIP_KEY</strong>.
        </p>
      </div>
    );
  }

  // ALWAYS render the container div so the ref is attached.
  // Show a loading overlay on top while the SDK loads.
  return (
    <div className="relative w-full h-full" style={style}>
      <div 
        ref={containerRef} 
        className={`w-full h-full rounded-xl ${className}`}
        style={{ minHeight: '200px' }}
      />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 rounded-xl z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
          <span className="text-sm text-gray-500 font-medium">Loading Google Maps...</span>
        </div>
      )}
    </div>
  );
}

import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import maplibregl from 'maplibre-gl';
import '@maplibre/maplibre-gl-leaflet';

// Use Mapbox token from env if available
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Default to Mapbox Streets if token is provided, else fallback to a public generic vector tile style
const DEFAULT_STYLE = MAPBOX_TOKEN 
  ? `mapbox://styles/mapbox/streets-v12` 
  : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export default function VectorTileLayer({ styleUrl = DEFAULT_STYLE }) {
  const map = useMap();

  useEffect(() => {
    // We attach the access token to maplibregl globally if it exists so Mapbox URLs work
    if (MAPBOX_TOKEN) {
      maplibregl.accessToken = MAPBOX_TOKEN;
    }

    const glLayer = L.maplibreGL({
      style: styleUrl,
      accessToken: MAPBOX_TOKEN,
    });

    glLayer.addTo(map);

    return () => {
      map.removeLayer(glLayer);
    };
  }, [map, styleUrl]);

  return null;
}

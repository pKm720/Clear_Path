import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

// Professional Free Vector Style (Carto Voyager)
const STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const MapView = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (map.current) return;

    try {
      console.log('Attempting to initialize MapLibre...');
      
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: STYLE,
        center: [77.5946, 12.9716], // Bengaluru
        zoom: 13,
        pitch: 0,
        bearing: 0,
        antialias: true
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('MapLibre Voyager style loaded successfully');
        setMapLoaded(true);
        map.current.resize();
      });

      map.current.on('error', (e) => {
        console.error('MapLibre error:', e);
        setErrorMessage(`Map Load Error: ${e.error?.message || 'Unknown Style Error'}`);
      });
    } catch (err) {
      console.error('Map Initialization Crash:', err);
      setErrorMessage(`Fatal Initialization Error: ${err.message}`);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div 
      style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, bottom: 0, 
        width: '100vw', height: '100vh', 
        background: '#f1f5f9',
        zIndex: 0
      }}
    >
      <div 
        ref={mapContainer} 
        style={{ width: '100%', height: '100%' }} 
      />
      
      {errorMessage && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '20px', borderRadius: '12px', color: 'red', zIndex: 30, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <p className="font-bold">Map Error</p>
          <p>{errorMessage}</p>
        </div>
      )}

      {!mapLoaded && !errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 font-black tracking-tight uppercase">Loading Live Map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';
import { fetchAllSensors } from '../../services/api';
import { useRouteStore } from '../../store/routeStore';

const Style = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const MapView = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Store hocks
  const { routes, selectedRouteIndex, showHeatmap } = useRouteStore();

  // Fetch all sensors for the heatmap
  const { data: sensorData } = useQuery({
    queryKey: ['sensors'],
    queryFn: fetchAllSensors,
    refetchInterval: 60000 // Refresh every minute
  });

  useEffect(() => {
    if (map.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: Style,
        center: [77.5946, 12.9716], // Bengaluru
        zoom: 12.5,
        antialias: true
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
        map.current.resize();

        // 1. Initialise Route Source/Layer
        map.current.addSource('route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#2563eb', 'line-width': 6, 'line-opacity': 0.8 }
        });

        // 2. Initialise Heatmap Source
        map.current.addSource('sensors', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        // 3. Add Heatmap Layer
        map.current.addLayer({
          id: 'aqi-heat',
          type: 'heatmap',
          source: 'sensors',
          layout: { 'visibility': 'none' },
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0, 150, 1],
            'heatmap-intensity': 1,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0, 255, 0, 0)',
              0.2, 'rgba(0, 255, 0, 0.5)',
              0.4, 'rgba(255, 255, 0, 0.5)',
              0.6, 'rgba(255, 165, 0, 0.5)',
              1, 'rgba(255, 0, 0, 0.8)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 15, 60],
            'heatmap-opacity': 0.7
          }
        });

        // 4. Add Point Layer for individual sensors
        map.current.addLayer({
          id: 'aqi-points',
          type: 'circle',
          source: 'sensors',
          layout: { 'visibility': 'none' },
          paint: {
            'circle-radius': 5,
            'circle-color': [
              'interpolate', ['linear'], ['get', 'aqi'],
              30, '#10b981', 80, '#f59e0b', 150, '#ef4444'
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': 'white'
          }
        });
      });
    } catch (err) {
      setErrorMessage(`Init Error: ${err.message}`);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update Route Visually
  useEffect(() => {
    if (!map.current || !mapLoaded || !routes.length) return;
    const currentRoute = routes[selectedRouteIndex];
    if (!currentRoute?.path) return;

    const source = map.current.getSource('route');
    if (source) {
      const coords = currentRoute.path.map(p => [p.lon, p.lat]);
      source.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords }
      });
      
      const bounds = coords.reduce((acc, coord) => acc.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.current.fitBounds(bounds, { padding: 100, duration: 1000 });
    }
  }, [routes, selectedRouteIndex, mapLoaded]);

  // Update Sensors and Heatmap Visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('sensors');
    if (source && sensorData?.data) {
      const features = sensorData.data.map(sensor => ({
        type: 'Feature',
        properties: { aqi: sensor.aqi },
        geometry: { type: 'Point', coordinates: [sensor.lng, sensor.lat] }
      }));
      source.setData({ type: 'FeatureCollection', features });
    }

    const visibility = showHeatmap ? 'visible' : 'none';
    if (map.current.getLayer('aqi-heat')) map.current.setLayoutProperty('aqi-heat', 'visibility', visibility);
    if (map.current.getLayer('aqi-points')) map.current.setLayoutProperty('aqi-points', 'visibility', visibility);
    
  }, [sensorData, showHeatmap, mapLoaded]);

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

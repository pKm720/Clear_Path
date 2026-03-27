import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';
import { fetchAllSensors } from '../../services/api';
import { useRouteStore } from '../../store/routeStore';
import { getDistance } from '../../utils/geo';

const Style = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const MapView = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Store hocks
  const { 
    routes, selectedRouteIndex, showHeatmap, 
    currentPosition, isNavigating, is3D
  } = useRouteStore();

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

        // 1. Initialise Heatmap Source
        map.current.addSource('sensors', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        // 2. Add Heatmap Layer
        map.current.addLayer({
          id: 'aqi-heat',
          type: 'heatmap',
          source: 'sensors',
          layout: { 'visibility': 'none' },
          paint: {
            // Give even clean nodes a base weight of 0.5 so they always have a strong aura
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0.5, 150, 1.5],
            // High intensity forces the separate blobs to merge into a continuous map
            'heatmap-intensity': 3.0,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(37, 99, 235, 0)',  // Transparent BLUE base instead of green
              0.2, '#2563eb',             // Blue Outer Glow
              0.4, '#22c55e',             // Green
              0.6, '#eab308',             // Yellow
              0.8, '#f97316',             // Orange Core
              1, '#dc2626'                // Red Core
            ],
            // Massive radius to cover the entire city without zooming out
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 120, 10, 150, 15, 300],
            'heatmap-opacity': 0.8
          }
        });

        // 3. Add Point Layer for individual sensors
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

        // 4. Initialise Route Source/Layer ON TOP of the heatmap
        map.current.addSource('route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        
        // Route casing (white highlight underneath the main blue line)
        map.current.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.9, 'line-blur': 1 }
        });

        // Main Route line
        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 1.0 }
        });

        // 5. User Location Layer (Raw GPS - Small Indicator)
        map.current.addSource('user-location', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.current.addLayer({
          id: 'user-marker',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': 4,
            'circle-color': 'white',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#3b82f6',
            'circle-opacity': 0.8
          }
        });

        // 6. Snapped Navigation Arrow (Primary Indicator)
        map.current.addSource('snapped-location', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.current.addLayer({
          id: 'nav-arrow',
          type: 'symbol',
          source: 'snapped-location',
          layout: {
            'text-field': '▲', // Directional Arrow
            'text-size': 24,
            'text-rotate': ['get', 'bearing'],
            'text-rotation-alignment': 'map',
            'text-allow-overlap': true,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#3b82f6',
            'text-halo-color': 'white',
            'text-halo-width': 3
          }
        });
      });
    } catch (err) {
      setErrorMessage(`Init Error: ${err.message}`);
    }
  }, []);

  // Handle 2D/3D Toggle
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.easeTo({
      pitch: is3D ? 60 : 0,
      duration: 1000
    });
  }, [is3D, mapLoaded]);

  // Snap-to-Route Helper
  const getSnappedPoint = (pos, path) => {
    if (!path || path.length < 2) return pos;
    let minD = Infinity;
    let snapped = pos;
    let bearing = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i+1];
        // For simplicity in a web-demo, find nearest node. 
        // Real snapping would project onto segment, but node-snapping is safe for now.
        const d = getDistance(pos.lat, pos.lon, p1.lat, p1.lon);
        if (d < minD) {
            minD = d;
            snapped = p1;
            // Simple bearing calculation
            bearing = Math.atan2(p2.lon - p1.lon, p2.lat - p1.lat) * 180 / Math.PI;
        }
    }
    return { ...snapped, bearing, distance: minD };
  };

  // Update User Location visually
  useEffect(() => {
    if (!map.current || !mapLoaded || !currentPosition) return;
    
    const rawSource = map.current.getSource('user-location');
    const snapSource = map.current.getSource('snapped-location');
    const currentRoute = routes[selectedRouteIndex];

    if (rawSource) {
      rawSource.setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [currentPosition.lon, currentPosition.lat] }
      });
    }

    if (snapSource && isNavigating && currentRoute?.path) {
      const snap = getSnappedPoint(currentPosition, currentRoute.path);
      
      // Only snap if within 30 meters, else user is truly off-route
      const finalPos = snap.distance < 30 ? [snap.lon, snap.lat] : [currentPosition.lon, currentPosition.lat];
      
      snapSource.setData({
        type: 'Feature',
        properties: { bearing: snap.bearing },
        geometry: { type: 'Point', coordinates: finalPos }
      });

      map.current.easeTo({
        center: finalPos,
        zoom: 17,
        pitch: is3D ? 60 : 0,
        bearing: (snap.distance < 30 && is3D) ? snap.bearing : 0,
        duration: 1000
      });
    }
  }, [currentPosition, isNavigating, mapLoaded, routes, selectedRouteIndex]);

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

      // Step 8: Route Draw Animation
      let step = 0;
      const animateLine = () => {
        if (!map.current) return;
        step += 0.05;
        if (step <= 1) {
          map.current.setPaintProperty('route-line', 'line-dasharray', [step, 1]);
          if (map.current.getLayer('route-casing')) map.current.setPaintProperty('route-casing', 'line-dasharray', [step, 1]);
          requestAnimationFrame(animateLine);
        } else {
          map.current.setPaintProperty('route-line', 'line-dasharray', [1, 0]);
          if (map.current.getLayer('route-casing')) map.current.setPaintProperty('route-casing', 'line-dasharray', [1, 0]);
        }
      };
      
      // Reset before animation
      map.current.setPaintProperty('route-line', 'line-dasharray', [0, 1]);
      if (map.current.getLayer('route-casing')) map.current.setPaintProperty('route-casing', 'line-dasharray', [0, 1]);
      animateLine();
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

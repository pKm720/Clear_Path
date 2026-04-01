import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { fetchAllSensors } from '../../services/api';
import { useRouteStore } from '../../store/routeStore';
import { getDistance } from '../../utils/geo';

const LightStyle = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DarkStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const MapView = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [styleLoadedTimestamp, setStyleLoadedTimestamp] = useState(0);
  
  // Store hooks
  const { 
    routes, selectedRouteIndex, showHeatmap, 
    currentPosition, isNavigating, is3D, isDarkMode,
    startCoord, endCoord,
    setStartCoord, setEndCoord, activeInput, setActiveInput
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
        style: isDarkMode ? DarkStyle : LightStyle,
        center: [77.5946, 12.9716], // Bengaluru
        zoom: 12.5,
        minZoom: 10, // Prevent zooming out too far
        maxBounds: [
          [77.30, 12.70], // South-West bounding box limit
          [77.85, 13.20]  // North-East bounding box limit
        ],
        antialias: true
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      const setupCustomLayers = () => {
        if (!map.current) return;
        // Check if layers were dropped
        if (map.current.getSource('sensors')) return; 

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
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0.5, 150, 1.5],
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
        
        map.current.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.9, 'line-blur': 1 }
        });

        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 1.0 }
        });

        // 5. User Location Layer
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

        // 6. Snapped Navigation Arrow
        map.current.addSource('snapped-location', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.current.addLayer({
          id: 'nav-arrow',
          type: 'symbol',
          source: 'snapped-location',
          layout: {
            'text-field': '▲',
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

        // 7. Start (green) + End (red) pin markers
        map.current.addSource('start-marker', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.current.addLayer({
          id: 'start-marker-outer',
          type: 'circle',
          source: 'start-marker',
          paint: {
            'circle-radius': 10,
            'circle-color': '#22c55e',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1
          }
        });
        map.current.addLayer({
          id: 'start-marker-inner',
          type: 'circle',
          source: 'start-marker',
          paint: {
            'circle-radius': 4,
            'circle-color': '#ffffff',
            'circle-opacity': 1
          }
        });

        map.current.addSource('end-marker', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.current.addLayer({
          id: 'end-marker-outer',
          type: 'circle',
          source: 'end-marker',
          paint: {
            'circle-radius': 10,
            'circle-color': '#ef4444',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1
          }
        });
        map.current.addLayer({
          id: 'end-marker-inner',
          type: 'circle',
          source: 'end-marker',
          paint: {
            'circle-radius': 4,
            'circle-color': '#ffffff',
            'circle-opacity': 1
          }
        });

        // Trigger effects to repopulate data into these fresh sources
        setStyleLoadedTimestamp(Date.now());
      };

      map.current.on('style.load', setupCustomLayers);

      map.current.on('load', () => {
        setMapLoaded(true);
        map.current.resize();
        setupCustomLayers(); // Initial call
      });
    } catch (err) {
      setErrorMessage(`Init Error: ${err.message}`);
    }
  }, []);

  // Handle Base Style Toggle (Dark/Light Mode)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.setStyle(isDarkMode ? DarkStyle : LightStyle);
  }, [isDarkMode, mapLoaded]);

  // Handle 2D/3D Toggle
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.easeTo({
      pitch: is3D ? 60 : 0,
      duration: 1000
    });
  }, [is3D, mapLoaded]);

  // Map click-to-set-location — attach/detach handler with activeInput
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Change cursor to crosshair when waiting for a click
    map.current.getCanvas().style.cursor = activeInput ? 'crosshair' : '';

    if (!activeInput) return;

    const handleMapClick = async (e) => {
      const { lng, lat } = e.lngLat;
      // Immediately clear active state so second clicks don't re-trigger
      setActiveInput(null);
      map.current.getCanvas().style.cursor = '';

      // Reverse geocode with Nominatim (OSM) — works for any coordinate including parks/railways
      let label = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`; // readable fallback
      try {
        const resp = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: { format: 'json', lat, lon: lng, zoom: 17, addressdetails: 1 },
          headers: { 'Accept-Language': 'en' }
        });
        if (resp.data && !resp.data.error) {
          const a = resp.data.address || {};
          // Build short label: most specific first, then area
          const spot = a.amenity || a.building || a.road || a.neighbourhood || a.suburb;
          const area = a.suburb || a.neighbourhood || a.city_district || a.city || a.town;
          if (spot && area && spot !== area) {
            label = `${spot}, ${area}`;
          } else if (spot) {
            label = spot;
          } else if (area) {
            label = area;
          } else if (resp.data.display_name) {
            // Take first 2 parts of display_name as a last resort
            label = resp.data.display_name.split(',').slice(0, 2).join(',').trim();
          }
        }
      } catch (err) {
        console.warn('Reverse geocode failed:', err.message);
      }

      const coord = { lat, lon: lng, label };
      if (activeInput === 'start') {
        setStartCoord(coord);
      } else {
        setEndCoord(coord);
      }
    };

    map.current.once('click', handleMapClick);

    // Cleanup: remove handler if activeInput is cleared externally
    return () => {
      map.current?.off('click', handleMapClick);
      if (map.current) map.current.getCanvas().style.cursor = '';
    };
  }, [activeInput, mapLoaded]);

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
  }, [currentPosition, isNavigating, mapLoaded, routes, selectedRouteIndex, styleLoadedTimestamp, is3D]);

  // Update Start / End pin markers on the map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const startSrc = map.current.getSource('start-marker');
    if (startSrc) {
      startSrc.setData(startCoord
        ? { type: 'Feature', geometry: { type: 'Point', coordinates: [startCoord.lon, startCoord.lat] } }
        : { type: 'FeatureCollection', features: [] }
      );
    }

    const endSrc = map.current.getSource('end-marker');
    if (endSrc) {
      endSrc.setData(endCoord
        ? { type: 'Feature', geometry: { type: 'Point', coordinates: [endCoord.lon, endCoord.lat] } }
        : { type: 'FeatureCollection', features: [] }
      );
    }
  }, [startCoord, endCoord, mapLoaded, styleLoadedTimestamp]);

  // Update Route Visually
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear the line when routes are removed (e.g. user hits Clear)
    if (!routes.length) {
      const source = map.current.getSource('route');
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
      return;
    }
    const currentRoute = routes[selectedRouteIndex];
    if (!currentRoute?.path) return;

    const source = map.current.getSource('route');
    if (source) {
      // Use road-network path as-is — pins show exact pick, route follows real roads
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
  }, [routes, selectedRouteIndex, mapLoaded, styleLoadedTimestamp]);

  // Update Sensors and Heatmap Visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('sensors');
    if (source && sensorData) {
      // Map readings into GeoJSON features, preserving the 'isVirtual' flag
      const features = (sensorData.data || sensorData).map(sensor => ({
        type: 'Feature',
        properties: { 
          aqi: sensor.aqi, 
          stationName: sensor.stationName,
          isVirtual: sensor.isVirtual || false 
        },
        geometry: { type: 'Point', coordinates: [sensor.lng, sensor.lat] }
      }));
      source.setData({ type: 'FeatureCollection', features });
    }

    // Interactive Popups for Sensors
    const handleSensorClick = (e) => {
      const features = map.current.queryRenderedFeatures(e.point, { layers: ['aqi-points'] });
      if (!features.length) return;

      const feature = features[0];
      const props = feature.properties;
      const coordinates = feature.geometry.coordinates.slice();

      const popupContent = `
        <div style="padding: 8px; font-family: sans-serif;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: ${props.isVirtual ? '#6366f1' : '#64748b'}; margin-bottom: 4px;">
            ${props.isVirtual ? '✨ Virtual Sensor (AI Predicted)' : '📡 Physical Station'}
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 8px;">${props.stationName}</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 24px; font-weight: 900; color: #1e293b;">${Math.round(props.aqi)}</div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; line-height: 1;">PM2.5<br/>AQI</div>
          </div>
        </div>
      `;

      new maplibregl.Popup({ closeButton: false, offset: 15 })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map.current);
    };

    map.current.on('click', 'aqi-points', handleSensorClick);
    map.current.on('mouseenter', 'aqi-points', () => { map.current.getCanvas().style.cursor = 'pointer'; });
    map.current.on('mouseleave', 'aqi-points', () => { map.current.getCanvas().style.cursor = ''; });

    // Layer visibility: Heatmap is togglable, but sensor pins stay visible globally
    const heatVisibility = showHeatmap ? 'visible' : 'none';
    if (map.current.getLayer('aqi-heat')) {
      map.current.setLayoutProperty('aqi-heat', 'visibility', heatVisibility);
    }
    
    // Physical and Virtual sensor pins remain as permanent navigational anchors
    if (map.current.getLayer('aqi-points')) {
      map.current.setLayoutProperty('aqi-points', 'visibility', 'visible');
      
      // Visual distinction: Indigo stroke for Virtual Sensors, White for Physical
      map.current.setPaintProperty('aqi-points', 'circle-stroke-color', [
        'case',
        ['boolean', ['get', 'isVirtual'], false], '#6366f1', // Indigo highlight
        '#ffffff' // Default white
      ]);
      map.current.setPaintProperty('aqi-points', 'circle-stroke-width', [
        'case',
        ['boolean', ['get', 'isVirtual'], false], 3,
        2
      ]);
    }

    return () => {
      if (map.current) {
        map.current.off('click', 'aqi-points', handleSensorClick);
      }
    };
    
  }, [sensorData, showHeatmap, mapLoaded, styleLoadedTimestamp]);

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
      {/* Floating hint when waiting for a map click */}
      {activeInput && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 backdrop-blur-sm border border-blue-400">
            <span className="text-base">📍</span>
            <p className="text-xs font-black uppercase tracking-widest">
              Click map to set <span className="text-blue-200">{activeInput === 'start' ? 'Start' : 'End'}</span> location
            </p>
            <button
              style={{ pointerEvents: 'auto' }}
              onClick={() => setActiveInput(null)}
              className="ml-1 text-blue-200 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MapView;

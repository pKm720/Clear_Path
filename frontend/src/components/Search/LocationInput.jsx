import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouteStore } from '../../store/routeStore';

const PHOTON_BASE = 'https://photon.komoot.io/api/';
const BENGALURU_BBOX = '77.3,12.8,77.9,13.2'; // [minLon, minLat, maxLon, maxLat]

const LocationInput = ({ placeholder, onSelect, value, inputType }) => {
  const { activeInput, setActiveInput } = useRouteStore();
  const isActiveForMapClick = activeInput === inputType;
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync internal text query if external value resets (e.g. from Clear button)
  useEffect(() => {
    if (!value) {
      setQuery('');
    } else if (value.label && value.label !== query) {
      setQuery(value.label);
    }
  }, [value]);

  const searchLocations = async (text) => {
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(PHOTON_BASE, {
        params: {
          q: text,
          bbox: BENGALURU_BBOX,
          limit: 5,
        }
      });
      setResults(response.data.features || []);
      setShowDropdown(true);
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChange = (e) => {
    const text = e.target.value;
    setQuery(text);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => searchLocations(text), 300);
  };

  const handleSelect = (feature) => {
    const p = feature.properties;
    const label = p.name || p.street || p.city;
    const subtitle = [p.street, p.district, p.city].filter(Boolean).join(', ');
    
    setQuery(label); 
    setResults([]);
    setShowDropdown(false);
    onSelect({
      lat: parseFloat(feature.geometry.coordinates[1]),
      lon: parseFloat(feature.geometry.coordinates[0]),
      label: label
    });
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative group">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            setActiveInput(inputType);
            if (results.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            // Small delay so a map-click can register before we clear activeInput
            setTimeout(() => setActiveInput(null), 200);
          }}
          placeholder={isActiveForMapClick ? '📍 or click on map...' : placeholder}
          className={`w-full bg-gray-50/50 dark:bg-slate-800/80 border p-4 pl-12 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors duration-300 font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
            isActiveForMapClick
              ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-300/30'
              : 'border-gray-200 dark:border-slate-700'
          }`}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-20 transition-colors duration-300">
          {results.map((feature, idx) => {
            const p = feature.properties;
            const title = p.name || p.street || p.city;
            const subtitle = [p.street, p.district, p.city, p.state].filter(Boolean).filter(s => s !== title).join(', ');
            
            return (
              <button
                key={p.osm_id || idx}
                onClick={() => handleSelect(feature)}
                className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 border-b border-gray-50 dark:border-slate-700/50 last:border-0 transition-colors duration-150 group"
              >
                <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors duration-200">
                  {title}
                </p>
                {subtitle && (
                  <p className="text-sm text-gray-400 dark:text-slate-400 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocationInput;

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const BENGALURU_BBOX = '77.3,12.8,77.9,13.2'; // [minLon, minLat, maxLon, maxLat]

const LocationInput = ({ placeholder, onSelect, value }) => {
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

  const searchLocations = async (text) => {
    if (text.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(NOMINATIM_BASE, {
        params: {
          q: `${text}, Bengaluru`,
          format: 'json',
          viewbox: BENGALURU_BBOX,
          bounded: 1,
          limit: 5,
          'accept-language': 'en'
        }
      });
      setResults(response.data);
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
    timeoutRef.current = setTimeout(() => searchLocations(text), 500);
  };

  const handleSelect = (res) => {
    const label = res.display_name.split(',')[0];
    setQuery(label);
    setResults([]);
    setShowDropdown(false);
    onSelect({
      lat: parseFloat(res.lat),
      lon: parseFloat(res.lon),
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
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full bg-gray-50/50 border border-gray-200 p-4 pl-12 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 font-medium placeholder:text-gray-400"
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20">
          {results.map((res) => (
            <button
              key={res.place_id}
              onClick={() => handleSelect(res)}
              className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors duration-150 group"
            >
              <p className="font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                {res.display_name.split(',')[0]}
              </p>
              <p className="text-sm text-gray-400 truncate mt-0.5">
                {res.display_name.split(',').slice(1).join(',')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationInput;

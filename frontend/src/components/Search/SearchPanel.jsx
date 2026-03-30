import React from 'react';
import { useRouteStore } from '../../store/routeStore';
import LocationInput from './LocationInput';
import TransportToggle from './TransportToggle';

const SearchPanel = () => {
  const { 
    startCoord, setStartCoord, 
    endCoord, setEndCoord, 
    transportMode, setTransportMode,
    calculateRoutes,
    showHeatmap, setShowHeatmap,
    is3D, toggle3D,
    isDarkMode, toggleDarkMode,
    routes, setRoutes, setIsNavigating, isNavigating
  } = useRouteStore();

  const handleSearch = () => {
    if (!startCoord || !endCoord) return;
    calculateRoutes(
      { lat: startCoord.lat, lon: startCoord.lon },
      { lat: endCoord.lat, lon: endCoord.lon },
      transportMode
    );
  };

  const handleClear = () => {
    setRoutes([]);
    setStartCoord(null);
    setEndCoord(null);
    setIsNavigating(false);
  };

  const isReady = startCoord && endCoord;

  return (
    <div className="relative z-50 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-3 rounded-2xl shadow-xl border border-white/20 dark:border-slate-800/50 flex flex-col gap-3 transition-colors duration-300">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-base font-black text-gray-900 dark:text-white tracking-tighter transition-colors duration-300">ClearPath</h1>
        
        <div className="flex flex-wrap justify-end gap-1.5 ml-2">
          {routes.length > 0 && (
            <button 
              onClick={handleClear}
              className="flex items-center gap-1 px-2 py-1 rounded-full border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-[8px] font-black text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 uppercase tracking-widest transition-colors"
            >
              Clear
            </button>
          )}
          
          <button
            onClick={toggleDarkMode}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-300 text-[8px] font-black uppercase tracking-widest ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-amber-300 shadow-sm hover:border-slate-600' 
                : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
            }`}
          >
            {isDarkMode ? '🌙' : '☀️'}
          </button>

          <button
            onClick={toggle3D}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-300 text-[8px] font-black uppercase tracking-widest ${
              is3D 
                ? 'bg-indigo-500 border-indigo-400 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-400 dark:text-gray-300 hover:border-gray-200 dark:hover:border-slate-600'
            }`}
          >
            {is3D ? '3D' : '2D'}
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-300 text-[8px] font-black uppercase tracking-widest ${
              showHeatmap 
                ? 'bg-orange-500 border-orange-400 text-white shadow-sm' 
                : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-400 dark:text-gray-300 hover:border-gray-200 dark:hover:border-slate-600'
            }`}
          >
            <div className={`w-1 h-1 rounded-full ${showHeatmap ? 'bg-white animate-pulse' : 'bg-orange-400'}`} />
            {showHeatmap ? 'Hotspots' : 'AQI Map'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">From</label>
        <LocationInput 
          placeholder="Add Start Location" 
          value={startCoord}
          onSelect={setStartCoord}
          inputType="start"
        />
      </div>

      <div className="relative">
        <div className="absolute left-6 h-3 w-px bg-gray-200 dark:bg-slate-700 -top-1.5 z-0 transition-colors duration-300" />
        <div className="flex flex-col gap-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">To</label>
          <LocationInput 
            placeholder="Add End Location" 
            value={endCoord}
            onSelect={setEndCoord}
            inputType="end"
          />
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <TransportToggle 
          selected={transportMode} 
          onChange={setTransportMode} 
        />
        
        <button
          onClick={handleSearch}
          disabled={!isReady}
          className={`w-full p-3 rounded-xl font-bold text-white text-xs transition-all duration-300 shadow-md ${
            isReady 
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' 
              : 'bg-gray-200 dark:bg-slate-800 cursor-not-allowed text-gray-400 dark:text-slate-500 shadow-none'
          }`}
        >
          {isReady ? 'Calculate Path' : 'Select Locations'}
        </button>

        {routes.length > 0 && (
          <button
            onClick={() => setIsNavigating(true)}
            className="w-full p-3 rounded-xl font-black text-white text-xs bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 uppercase tracking-widest mt-1 transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-300"
          >
            Start Trip
          </button>
        )}

        <p className="text-[7px] font-medium text-gray-400 text-center pt-2 leading-tight px-4">
          Estimates based on government sensors + road classification. Street-level AQI may vary.
        </p>
      </div>
    </div>
  );
};

export default SearchPanel;

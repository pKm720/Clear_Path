import React from 'react';
import { useRouteStore } from '../../store/routeStore';
import LocationInput from './LocationInput';
import TransportToggle from './TransportToggle';
import { fetchRoutes } from '../../services/api';

const SearchPanel = () => {
  const { 
    startCoord, setStartCoord, 
    endCoord, setEndCoord, 
    transportMode, setTransportMode,
    setRoutes, setIsLoading, setError,
    showHeatmap, setShowHeatmap,
    routes
  } = useRouteStore();

  const handleSearch = async () => {
    if (!startCoord || !endCoord) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchRoutes(
        { lat: startCoord.lat, lon: startCoord.lon },
        { lat: endCoord.lat, lon: endCoord.lon },
        transportMode
      );
      
      if (response.data && response.data.routes) {
        setRoutes(response.data.routes);
      } else {
        throw new Error('No routes found between these locations.');
      }
    } catch (err) {
      console.error('Route search failed:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isReady = startCoord && endCoord;

  return (
    <div className="bg-white/95 backdrop-blur-xl p-3 rounded-2xl shadow-xl border border-white/20 flex flex-col gap-3">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-base font-black text-gray-900 tracking-tighter">ClearPath</h1>
        
        <div className="flex gap-2">
          {routes.length > 0 && (
            <button 
              onClick={() => setRoutes([])}
              className="text-[9px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest px-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-300 text-[8px] font-black uppercase tracking-widest ${
              showHeatmap 
                ? 'bg-orange-500 border-orange-400 text-white shadow-sm' 
                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
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
          placeholder="Start" 
          value={startCoord}
          onSelect={setStartCoord} 
        />
      </div>

      <div className="relative">
        <div className="absolute left-6 h-3 w-px bg-gray-200 -top-1.5 z-0" />
        <div className="flex flex-col gap-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">To</label>
          <LocationInput 
            placeholder="End" 
            value={endCoord}
            onSelect={setEndCoord} 
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
              : 'bg-gray-200 cursor-not-allowed text-gray-400'
          }`}
        >
          {isReady ? 'Calculate Path' : 'Select Locations'}
        </button>
      </div>
    </div>
  );
};

export default SearchPanel;

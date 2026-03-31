import React from 'react';

const RouteCard = ({ route, index, isSelected, onClick, modes = [], benefit = 0 }) => {
  const { distance, avgAQI, duration } = route;
  
  const distanceKm = parseFloat(distance).toFixed(1);
  const timeMins = duration; // Already calculated by backend in minutes

  const formatMode = (m) => m === 'cleanest' ? 'Cleanest' : m === 'fastest' ? 'Fastest' : 'Balanced';
  const modeLabel = modes.map(formatMode).join(' + ');

  // Determine health color
  const getHealthColor = (aqi) => {
    if (aqi <= 30) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800/50';
    if (aqi <= 80) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800/50';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800/50';
  };

  const healthClass = getHealthColor(avgAQI);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-[260px] shrink-0 text-left p-3 rounded-2xl transition-all duration-300 border-2 cursor-pointer relative z-10 ${
        isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 shadow-lg scale-[1.02] -translate-y-1' 
          : 'bg-white dark:bg-slate-800/90 border-transparent hover:border-gray-200 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-sm'
      }`}
    >
      <div className="mb-1.5 flex justify-between items-center">
        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter truncate">{modeLabel}</span>
        <div className={`px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-widest ${healthClass}`}>
          AQI {avgAQI}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-gray-900 dark:text-gray-100">{timeMins} min</span>
            <span className="text-[8px] font-bold text-gray-400 dark:text-slate-400 uppercase">{distanceKm} KM</span>
          </div>
          {benefit > 0 && (
            <p className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase tracking-tight mt-0.5 animate-pulse">
              ~{benefit}% Less Exposure
            </p>
          )}
        </div>
        
        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-400'}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default RouteCard;

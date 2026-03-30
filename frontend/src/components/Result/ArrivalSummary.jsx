import React from 'react';
import { useRouteStore } from '../../store/routeStore';

const ArrivalSummary = () => {
  const { tripSummary, setIsArrived, setRoutes } = useRouteStore();

  if (!tripSummary) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[360px] rounded-[3rem] shadow-2xl border border-transparent dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-700 transition-colors">
        {/* Header Section */}
        <div className="bg-indigo-600 dark:bg-indigo-900/80 p-8 text-white relative transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Trip Completed</p>
          <h2 className="text-4xl font-black tracking-tighter leading-none mb-1">You've Arrived!</h2>
          <p className="text-sm font-medium opacity-90">Healthy Choice, Healthy Lungs.</p>
        </div>

        {/* Stats Grid */}
        <div className="p-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-3xl border border-gray-100 dark:border-slate-700/50 transition-colors">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1 text-center">Distance</p>
              <p className="text-xl font-black text-gray-900 dark:text-white text-center">{parseFloat(tripSummary.totalKm).toFixed(1)} <span className="text-[10px] text-gray-400 dark:text-slate-500">km</span></p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-3xl border border-green-100 dark:border-green-800/50 transition-colors">
              <p className="text-[9px] font-black uppercase tracking-widest text-green-600 dark:text-green-500 mb-1 text-center">Avg AQI</p>
              <p className="text-xl font-black text-green-700 dark:text-green-400 text-center">{tripSummary.avgAQI}</p>
            </div>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-900/30 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-800/50 flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-0.5">Health Benefit</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{tripSummary.healthBenefit}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsArrived(false);
              setRoutes([]); // Clear for next trip
            }}
            className="w-full bg-gray-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-xl shadow-gray-200 dark:shadow-none"
          >
            Start New Trip
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArrivalSummary;

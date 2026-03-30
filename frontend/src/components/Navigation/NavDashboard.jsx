import React from 'react';
import { useRouteStore } from '../../store/routeStore';

const NavDashboard = () => {
  const { routes, selectedRouteIndex, setIsNavigating, currentPosition, setCurrentPosition } = useRouteStore();
  const [isSimulating, setIsSimulating] = React.useState(false);
  const route = routes[selectedRouteIndex];

  // Simulation Logic
  React.useEffect(() => {
    if (!isSimulating || !route?.path) return;
    
    let step = 0;
    const interval = setInterval(() => {
      if (step >= route.path.length) {
        setIsSimulating(false);
        clearInterval(interval);
        return;
      }
      const point = route.path[step];
      setCurrentPosition({ lat: point.lat, lon: point.lon });
      step++;
    }, 300);

    return () => clearInterval(interval);
  }, [isSimulating, route, setCurrentPosition]);

  const handleTestDrift = () => {
    if (!currentPosition) return;
    // Offset by ~110 meters to trigger 50m reroute threshold
    setCurrentPosition({ 
      lat: currentPosition.lat + 0.001, 
      lon: currentPosition.lon + 0.001 
    });
  };

  if (!route) return null;

  return (
    <div 
      className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[340px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800/50 p-5 flex flex-col gap-4 animate-in slide-in-from-bottom-10 z-50 transition-colors duration-500"
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Arriving In</p>
          <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
            {route.duration} <span className="text-sm font-medium text-gray-400 dark:text-slate-500">min</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{parseFloat(route.distance).toFixed(1)} km left</span>
            {isSimulating && (
              <button 
                onClick={handleTestDrift}
                className="text-[8px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100"
              >
                Test Drift
              </button>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => setIsSimulating(!isSimulating)}
          className={`px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${
            isSimulating ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse' : 'bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-400 border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
          }`}
        >
          {isSimulating ? 'Stop Simulation' : 'Simulate Trip'}
        </button>
      </div>

      <div className="h-px bg-gray-50 dark:bg-slate-800 w-full transition-colors duration-300" />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center border border-green-100 dark:border-green-800/50">
            <span className="text-green-600 dark:text-green-400 font-black text-[10px]">{route.avgAQI}</span>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500">Path Quality</p>
            <p className="text-[10px] font-bold text-gray-900 dark:text-gray-100">Health-First Routing</p>
          </div>
        </div>

        <button 
          onClick={() => {
            setIsSimulating(false);
            setIsNavigating(false);
          }}
          className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 border border-red-100"
        >
          Stop
        </button>
      </div>
    </div>
  );
};

export default NavDashboard;

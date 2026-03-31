import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouteStore } from './store/routeStore';
import { useGeolocation } from './hooks/useGeolocation';
import { getDistanceFromPath, getDistance } from './utils/geo';
import MapView from './components/Map/MapView';
import SearchPanel from './components/Search/SearchPanel';
import RouteResults from './components/Result/RouteResults';
import NavDashboard from './components/Navigation/NavDashboard';
import ArrivalSummary from './components/Result/ArrivalSummary';
import RouteSkeleton from './components/Result/RouteSkeleton';

const queryClient = new QueryClient();

function App() {
  useGeolocation();
  const { 
    isNavigating, isArrived, isLoading, error,
    currentPosition, routes, selectedRouteIndex,
    calculateRoutes, transportMode, endCoord,
    autoReroute, setIsNavigating, setIsArrived,
    setTripSummary, isDarkMode
  } = useRouteStore();

  // Dynamic Rerouting & Arrival Logic
  useEffect(() => {
    if (!isNavigating || !currentPosition || !routes.length || isLoading) return;

    const currentRoute = routes[selectedRouteIndex];
    if (!currentRoute?.path || !endCoord) return;

    // 1. Check Arrival
    const distToTarget = getDistance(currentPosition.lat, currentPosition.lon, endCoord.lat, endCoord.lon);
    if (distToTarget < 30) {
      console.log("Destination reached!");
      setTripSummary({
        totalKm: currentRoute.distance,
        avgAQI: currentRoute.avgAQI,
        healthBenefit: "34% less exposure"
      });
      setIsNavigating(false);
      setIsArrived(true);
      return;
    }

    // 2. Check Drift for Rerouting
    if (!autoReroute) return;
    const drift = getDistanceFromPath(currentPosition, currentRoute.path);
    if (drift > 50) {
      console.log(`Drift detected: ${drift.toFixed(1)}m. Rerouting...`);
      calculateRoutes(
        { lat: currentPosition.lat, lon: currentPosition.lon },
        endCoord,
        transportMode
      );
    }
  }, [currentPosition, isNavigating, routes, selectedRouteIndex, autoReroute]);

  // Apply dark mode to global HTML tag for seamless Tailwind matching
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <div
        dir="ltr"
        className={`w-screen h-screen overflow-hidden fixed inset-0 transition-colors duration-500 bg-white dark:bg-slate-900`}
      >
        {/* Main Map Background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <MapView />
        </div>

        {/* UI Overlay - Top Left Search Panel */}
        <div 
          className={`
            absolute z-10 flex flex-col gap-3 transition-all duration-500 ease-in-out
            top-4 left-4 w-[280px] max-h-[calc(100vh-200px)]
            ${isNavigating ? 'opacity-0 -translate-x-full pointer-events-none' : 'opacity-100 translate-x-0'}
          `}
        >
          <SearchPanel />
          
          {/* Error State Overlay */}
          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-3xl shadow-xl border border-red-100 dark:border-red-900/50">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-bold tracking-tight uppercase">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Route Options Shelf - Bottom Horizontal Bar */}
        {!isNavigating && !isArrived && (routes.length > 0 || isLoading) && (
          <div className="absolute bottom-6 left-4 right-4 md:left-[312px] md:right-4 z-20 flex flex-col gap-2 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Select Your Route</p>
              {isLoading && <div className="text-[8px] font-bold text-blue-500 animate-pulse uppercase">Searching...</div>}
            </div>
            
            <div className="flex overflow-x-auto gap-3 pt-2 pb-2 px-1 custom-scrollbar no-scrollbar scroll-smooth">
              {isLoading ? (
                <>
                  <RouteSkeleton className="w-[260px] shrink-0" />
                  <RouteSkeleton className="w-[260px] shrink-0" />
                  <RouteSkeleton className="w-[260px] shrink-0" />
                </>
              ) : (
                <RouteResults />
              )}
            </div>
          </div>
        )}

        {/* Navigation Dashboard (Mobile-style bottom overlay) */}
        {isNavigating && <NavDashboard />}

        {/* Arrival Success Summary */}
        {isArrived && <ArrivalSummary />}
      </div>
    </QueryClientProvider>
  );
}

export default App;

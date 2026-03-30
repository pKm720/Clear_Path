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

  return (
    <QueryClientProvider client={queryClient}>
      <div
        dir="ltr"
        className={isDarkMode ? 'dark' : ''}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          background: 'white',
          overflow: 'hidden'
        }}
      >
        {/* Main Map Background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <MapView />
        </div>

        {/* UI Overlay - Responsive Sidebar/Bottom-Sheet */}
        <div 
          className={`
            absolute z-10 flex flex-col gap-3 transition-all duration-500 ease-in-out
            /* Desktop Styles */
            md:top-4 md:left-4 md:w-[280px] md:max-h-[calc(100vh-32px)]
            /* Mobile Styles (Bottom Sheet-ish) */
            bottom-4 left-4 right-4 md:bottom-auto
            ${isNavigating ? 'opacity-0 -translate-x-full pointer-events-none' : 'opacity-100 translate-x-0'}
          `}
        >
          <SearchPanel />
          <RouteResults />

          {/* Step 8: Route Skeletons */}
          {isLoading && (
            <div className="flex flex-col gap-2 mt-2 animate-in fade-in duration-300">
              <RouteSkeleton />
              <RouteSkeleton />
              <RouteSkeleton />
            </div>
          )}

          {/* Error State Overlay */}
          {error && (
            <div className="mt-4 bg-red-50 p-4 rounded-3xl shadow-xl border border-red-100">
              <div className="flex items-center gap-3 text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-bold tracking-tight uppercase">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Dashboard (Mobile-style bottom overlay) */}
        {isNavigating && <NavDashboard />}

        {/* Arrival Success Summary */}
        {isArrived && <ArrivalSummary />}
      </div>
    </QueryClientProvider>
  );
}

export default App;

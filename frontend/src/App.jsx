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

const queryClient = new QueryClient();

function App() {
  useGeolocation();
  const { 
    isNavigating, isArrived, isLoading, error,
    currentPosition, routes, selectedRouteIndex,
    calculateRoutes, transportMode, endCoord,
    autoReroute, setIsNavigating, setIsArrived,
    setTripSummary
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

        {/* UI Overlay */}
        <div 
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 10,
            width: '280px', // Ultra-compact width
            maxHeight: 'calc(100vh - 32px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isNavigating ? 0 : 1,
            transform: isNavigating ? 'translateX(-120%)' : 'translateX(0)'
          }}
        >
          <SearchPanel />
          <RouteResults />

          {/* Loading State Overlay */}
          {isLoading && (
            <div className="mt-4 bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-xl flex items-center gap-4 border border-white/20">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-700 tracking-tight uppercase">Calculating healthiest routes...</p>
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

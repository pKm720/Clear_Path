import React from 'react';
import { useRouteStore } from '../../store/routeStore';
import RouteCard from './RouteCard';

const RouteResults = () => {
  const { routes, selectedRouteIndex, setSelectedRouteIndex, setRoutes } = useRouteStore();

  if (routes.length === 0) return null;

  // 1. Filter out failed routes (path: null or empty)
  const validRoutes = routes.filter(r => r && Array.isArray(r.path) && r.path.length > 0);
  if (validRoutes.length === 0) return null;

  // 2. Deduplicate routes and group their modes
  const uniqueRoutes = validRoutes.reduce((acc, route) => {
    // Unique ID based on stats and path length
    const id = `${route.distance}-${route.avgAQI}-${route.duration}-${route.path.length}`;
    
    if (acc[id]) {
      acc[id].modes.push(route.mode);
    } else {
      acc[id] = { ...route, modes: [route.mode] };
    }
    return acc;
  }, {});

  const displayRoutes = Object.values(uniqueRoutes);

  return (
    <div className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-6 duration-500 overflow-y-auto max-h-[calc(100vh-320px)] pr-1 custom-scrollbar">
      {displayRoutes.map((route, idx) => {
        // Find which ORGINAL index in the 'routes' array this display route corresponds to
        const originalIndex = routes.findIndex(r => r.mode === route.modes[0]);
        
        return (
          <RouteCard
            key={idx}
            index={idx}
            route={route}
            modes={route.modes} 
            isSelected={selectedRouteIndex === originalIndex}
            onClick={() => setSelectedRouteIndex(originalIndex)}
          />
        );
      })}
    </div>
  );
};

export default RouteResults;

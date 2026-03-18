import { create } from 'zustand';

export const useRouteStore = create((set) => ({
  // Search state
  startCoord: null,       // { lat, lon, label }
  endCoord: null,
  transportMode: 'car',   // 'car' | 'motorbike' | 'pedestrian'

  // Route state
  routes: [],             // array of 3 route objects from backend
  selectedRouteIndex: 0,
  isLoading: false,
  error: null,

  // Navigation state
  isNavigating: false,
  currentPosition: null,  // live GPS { lat, lon }
  isOffRoute: false,
  
  // Map UI state
  showHeatmap: true,

  // Actions
  setStartCoord: (coord) => set({ startCoord: coord }),
  setEndCoord: (coord) => set({ endCoord: coord }),
  setTransportMode: (mode) => set({ transportMode: mode }),
  setRoutes: (routes) => set({ routes, selectedRouteIndex: 0, error: null }),
  setSelectedRouteIndex: (index) => set({ selectedRouteIndex: index }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error: error }),
  setIsNavigating: (navigating) => set({ isNavigating: navigating }),
  setCurrentPosition: (pos) => set({ currentPosition: pos }),
  setIsOffRoute: (off) => set({ isOffRoute: off }),
  setShowHeatmap: (show) => set({ showHeatmap: show }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
}));

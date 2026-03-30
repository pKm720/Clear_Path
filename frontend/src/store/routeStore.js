import { create } from 'zustand';
import { fetchRoutes } from '../services/api';

export const useRouteStore = create((set, get) => ({
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
  isArrived: false,
  tripSummary: null,
  currentPosition: null,  // live GPS { lat, lon }
  isOffRoute: false,

  // Map UI state
  showHeatmap: true,
  is3D: false, // Start in 3D by default for the cool navigation feel
  isDarkMode: false, // Start in dark mode 
  autoReroute: true,

  // Actions
  setStartCoord: (coord) => set({ startCoord: coord }),
  setEndCoord: (coord) => set({ endCoord: coord }),
  setTransportMode: (mode) => set({ transportMode: mode }),
  setRoutes: (routes) => set({ routes, selectedRouteIndex: 0, error: null }),
  setSelectedRouteIndex: (index) => set({ selectedRouteIndex: index }),

  calculateRoutes: async (start, end, mode) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await fetchRoutes(start, end, mode);
      if (resp.data?.routes) {
        set({ routes: resp.data.routes, selectedRouteIndex: 0 });
      } else {
        throw new Error('No routes found.');
      }
    } catch (err) {
      set({ error: err.response?.data?.error || err.message });
    } finally {
      set({ isLoading: false });
    }
  },
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error: error }),
  setIsNavigating: (navigating) => set({ isNavigating: navigating }),
  setIsArrived: (arrived) => set({ isArrived: arrived }),
  setTripSummary: (summary) => set({ tripSummary: summary }),
  setCurrentPosition: (pos) => set({ currentPosition: pos }),
  setIsOffRoute: (off) => set({ isOffRoute: off }),
  setAutoReroute: (auto) => set({ autoReroute: auto }),
  setShowHeatmap: (show) => set({ showHeatmap: show }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  toggle3D: () => set((state) => ({ is3D: !state.is3D })),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));

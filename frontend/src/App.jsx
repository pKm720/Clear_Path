import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouteStore } from './store/routeStore';
import MapView from './components/Map/MapView';

const queryClient = new QueryClient();

function App() {
  const { isNavigating } = useRouteStore();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="fixed inset-0 w-screen h-screen bg-white overflow-hidden">
        {/* Main Map Background */}
        <div className="absolute inset-0 z-0">
          <MapView />
        </div>

        {/* UI Overlay */}
        <div className={`absolute top-6 left-6 z-10 w-96 transition-all duration-300 ${isNavigating ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'}`}>
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/20">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">ClearPath</h1>
            <p className="text-gray-500 font-medium mb-6">Health-first navigation</p>
            <div className="space-y-4">
              <div className="h-14 bg-gray-100/50 rounded-2xl animate-pulse" />
              <div className="h-14 bg-gray-100/50 rounded-2xl animate-pulse" />
              <div className="h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200" />
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;

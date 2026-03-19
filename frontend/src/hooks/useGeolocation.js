import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';

export const useGeolocation = () => {
  const { setCurrentPosition, isNavigating } = useRouteStore();

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    const handleSuccess = (position) => {
      const { latitude, longitude, heading, speed } = position.coords;
      setCurrentPosition({
        lat: latitude,
        lon: longitude,
        heading: heading || 0,
        speed: speed || 0
      });
    };

    const handleError = (error) => {
      console.error('Geolocation Error:', error.message);
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    return () => navigator.geolocation.clearWatch(watchId);
  }, [setCurrentPosition]);

  return null;
};

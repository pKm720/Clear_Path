import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const fetchRoutes = (start, end, transport) =>
  axios.post(`${BASE}/api/route`, { start, end, transport });

export const fetchAQIAtPoint = (lat, lng) =>
  axios.get(`${BASE}/api/aqi/${lat}/${lng}`);

export const fetchAllSensors = () =>
  axios.get(`${BASE}/api/aqi/sensors`);

export const snapToRoute = (current, path) =>
  axios.post(`${BASE}/api/route/snap`, { current, path });

/**
 * Calculates the Haversine distance between two points on Earth in meters.
 */
export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const f1 = lat1 * Math.PI / 180;
  const f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(df / 2) * Math.sin(df / 2) +
            Math.cos(f1) * Math.cos(f2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Finds the minimum distance from a point to a polyline (array of points).
 */
export const getDistanceFromPath = (point, path) => {
  if (!path || path.length === 0) return Infinity;
  
  let minDistance = Infinity;
  for (const node of path) {
    const d = getDistance(point.lat, point.lon, node.lat, node.lon);
    if (d < minDistance) minDistance = d;
  }
  return minDistance;
};

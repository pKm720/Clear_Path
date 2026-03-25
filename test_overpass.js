const axios = require('axios');

const query = `
  [out:json][timeout:25];
  (
    way["highway"~"motorway|trunk|primary|secondary|tertiary"](12.85,77.50,13.10,77.75);
  );
  (._;>;);
  out body;
`;

async function test() {
  console.log('Fetching...');
  const start = Date.now();
  try {
    const res = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`);
    console.log(`Success! Time: ${Date.now() - start}ms`);
    console.log(`Elements: ${res.data.elements.length}`);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}
test();

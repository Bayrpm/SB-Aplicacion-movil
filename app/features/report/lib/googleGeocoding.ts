import Constants from 'expo-constants';

const getGoogleApiKey = (): string => {
  return (
    (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string) ||
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string) ||
    ''
  );
};

export type GeocodeResult = {
  lat: number;
  lon: number;
  formatted: string;
  place_id?: string;
};

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = getGoogleApiKey();
  if (!key || !address) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}&components=country:cl&language=es`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const js = await resp.json();
    if (js.status !== 'OK' || !js.results?.[0]) return null;
    const r = js.results[0];
    const loc = r.geometry?.location;
    if (!loc) return null;
    return {
      lat: Number(loc.lat),
      lon: Number(loc.lng),
      formatted: String(r.formatted_address || ''),
      place_id: r.place_id,
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult | null> {
  const key = getGoogleApiKey();
  if (!key) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${key}&language=es&result_type=street_address`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const js = await resp.json();
    if ((js.status !== 'OK' && js.status !== 'ZERO_RESULTS') || !js.results?.[0]) {
      return null;
    }
    const r = js.results[0];
    return {
      lat,
      lon,
      formatted: String(r.formatted_address || ''),
      place_id: r.place_id,
    };
  } catch {
    return null;
  }
}
export default { geocodeAddress, reverseGeocode };
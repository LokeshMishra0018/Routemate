/**
 * Geocoding & Location Search Service
 * Dual-Engine support: OpenStreetMap / Photon API (Free / Zero Setup) + Reverse Geocoding
 */

export interface GeocodedPlace {
  id: string;
  name: string;
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  category: 'college' | 'metro' | 'airport' | 'railway' | 'transit' | 'locality' | 'place';
  coordinates: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  raw?: any;
}

/**
 * Classify a location by name/osm_value to provide rich icon badges
 */
function classifyPlaceCategory(name: string, osmKey?: string, osmValue?: string): GeocodedPlace['category'] {
  const lower = name.toLowerCase();
  
  if (
    lower.includes('college') ||
    lower.includes('university') ||
    lower.includes('institute') ||
    lower.includes('campus') ||
    lower.includes('kiet') ||
    lower.includes('iit') ||
    lower.includes('nit') ||
    lower.includes('iiit') ||
    lower.includes('school') ||
    osmValue === 'college' ||
    osmValue === 'university'
  ) {
    return 'college';
  }

  if (
    lower.includes('metro') ||
    lower.includes('station') && lower.includes('metro') ||
    osmValue === 'subway' ||
    osmValue === 'tram_stop'
  ) {
    return 'metro';
  }

  if (
    lower.includes('airport') ||
    lower.includes('aerodrome') ||
    lower.includes('terminal 1') ||
    lower.includes('terminal 2') ||
    lower.includes('terminal 3') ||
    osmValue === 'aerodrome'
  ) {
    return 'airport';
  }

  if (
    lower.includes('railway') ||
    lower.includes('junction') ||
    lower.includes('station') ||
    osmValue === 'station'
  ) {
    return 'railway';
  }

  if (
    lower.includes('bus stand') ||
    lower.includes('isbt') ||
    lower.includes('bus stop') ||
    osmValue === 'bus_station'
  ) {
    return 'transit';
  }

  if (osmValue === 'city' || osmValue === 'town' || osmValue === 'suburb' || osmValue === 'neighbourhood') {
    return 'locality';
  }

  return 'place';
}

/**
 * Search places using Photon API (OpenStreetMap data) with Indian region bias
 */
export async function searchPlaces(query: string, limit = 6): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  try {
    // Photon API endpoint with bounding box bias for India [minLon, minLat, maxLon, maxLat]
    // India bbox roughly [68.0, 8.0, 97.5, 37.5], with NCR bias centered around [77.2, 28.6]
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('lat', '28.6139'); // Biased around NCR / North India hub
    url.searchParams.set('lon', '77.2090');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Photon search failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) {
      return [];
    }

    return data.features.map((feature: any, index: number): GeocodedPlace => {
      const props = feature.properties || {};
      const [lon, lat] = feature.geometry.coordinates;

      const placeName = props.name || props.street || props.city || trimmed;
      const parts = [
        props.name,
        props.street,
        props.district || props.suburb,
        props.city,
        props.state,
        props.country,
      ].filter(Boolean);

      // Remove duplicates in address string
      const uniqueParts = Array.from(new Set(parts));
      const formattedAddress = uniqueParts.join(', ');

      const category = classifyPlaceCategory(
        placeName + ' ' + (props.osm_value || ''),
        props.osm_key,
        props.osm_value
      );

      return {
        id: `${props.osm_id || index}-${lon}-${lat}`,
        name: placeName,
        formattedAddress,
        city: props.city || props.district,
        state: props.state,
        country: props.country,
        category,
        coordinates: {
          type: 'Point',
          coordinates: [Number(lon), Number(lat)],
        },
        raw: props,
      };
    });
  } catch (err) {
    console.warn('[GEOCODING][SEARCH_FALLBACK] Photon search error:', err);
    return [];
  }
}

/**
 * Reverse geocode GPS coordinates into a human-readable street/locality name
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedPlace | null> {
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.features || data.features.length === 0) return null;

    const feature = data.features[0];
    const props = feature.properties || {};
    const [lon, featLat] = feature.geometry.coordinates;

    const placeName = props.name || props.street || props.district || props.city || 'Current Location';
    const parts = [props.name, props.street, props.district, props.city, props.state].filter(Boolean);
    const formattedAddress = Array.from(new Set(parts)).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    return {
      id: `reverse-${lon}-${featLat}`,
      name: placeName,
      formattedAddress,
      city: props.city,
      state: props.state,
      country: props.country,
      category: classifyPlaceCategory(placeName, props.osm_key, props.osm_value),
      coordinates: {
        type: 'Point',
        coordinates: [Number(lon), Number(featLat)],
      },
      raw: props,
    };
  } catch (err) {
    console.warn('[GEOCODING][REVERSE_ERROR] Failed to reverse geocode:', err);
    return null;
  }
}

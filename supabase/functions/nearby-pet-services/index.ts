import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

type Category = 'veterinary' | 'petshop' | 'all';
type NearbyRequest = {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  category?: Category;
  openNowOnly?: boolean;
  languageCode?: string;
};

type Place = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  kind: 'veterinary' | 'petshop' | 'other';
  rating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  weekdayDescriptions: string[];
  mapsUrl: string | null;
  phone: string | null;
  distanceMeters: number | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
});

const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function configuredPublishableKeys() {
  const keys = new Set<string>();
  const encodedKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');

  if (encodedKeys) {
    try {
      const parsed = JSON.parse(encodedKeys) as Record<string, unknown>;
      Object.values(parsed).forEach(value => {
        if (typeof value === 'string' && value) keys.add(value);
      });
    } catch {
      console.error('SUPABASE_PUBLISHABLE_KEYS is not valid JSON');
    }
  }

  const legacyAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacyAnonKey) keys.add(legacyAnonKey);
  return keys;
}

function hasValidApiKey(req: Request) {
  const suppliedKey = req.headers.get('apikey')?.trim();
  return Boolean(suppliedKey && configuredPublishableKeys().has(suppliedKey));
}

const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

async function searchGoogle(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  category: Category,
  languageCode: string,
): Promise<Place[] | null> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) return null;

  const includedTypes = category === 'veterinary'
    ? ['veterinary_care']
    : category === 'petshop'
      ? ['pet_store']
      : ['veterinary_care', 'pet_store'];
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.primaryType',
    'places.types',
    'places.rating',
    'places.userRatingCount',
    'places.currentOpeningHours',
    'places.googleMapsUri',
    'places.nationalPhoneNumber',
  ].join(',');

  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      languageCode: languageCode.slice(0, 8),
      locationRestriction: {
        circle: { center: { latitude, longitude }, radius: radiusMeters },
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Google Places error', response.status, payload?.error?.status);
    return null;
  }

  return (Array.isArray(payload.places) ? payload.places : [])
    .map((place: any) => {
      const lat = Number(place?.location?.latitude);
      const lng = Number(place?.location?.longitude);
      const types: string[] = Array.isArray(place?.types) ? place.types : [];
      const kind = types.includes('veterinary_care')
        ? 'veterinary'
        : types.includes('pet_store')
          ? 'petshop'
          : 'other';

      return {
        id: String(place.id || ''),
        name: String(place?.displayName?.text || 'İsimsiz işletme'),
        address: String(place?.formattedAddress || ''),
        latitude: lat,
        longitude: lng,
        kind,
        rating: typeof place?.rating === 'number' ? place.rating : null,
        ratingCount: typeof place?.userRatingCount === 'number' ? place.userRatingCount : null,
        openNow: typeof place?.currentOpeningHours?.openNow === 'boolean'
          ? place.currentOpeningHours.openNow
          : null,
        weekdayDescriptions: Array.isArray(place?.currentOpeningHours?.weekdayDescriptions)
          ? place.currentOpeningHours.weekdayDescriptions
          : [],
        mapsUrl: typeof place?.googleMapsUri === 'string' ? place.googleMapsUri : null,
        phone: typeof place?.nationalPhoneNumber === 'string' ? place.nationalPhoneNumber : null,
        distanceMeters: Number.isFinite(lat) && Number.isFinite(lng)
          ? Math.round(distanceMeters(latitude, longitude, lat, lng))
          : null,
      } satisfies Place;
    })
    .filter((place: Place) => place.id && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
}

function osmAddress(tags: Record<string, string>) {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  return [street, tags['addr:district'], tags['addr:city']].filter(Boolean).join(', ');
}

async function searchOpenStreetMap(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  category: Category,
  openNowOnly: boolean,
): Promise<Place[]> {
  const clauses: string[] = [];
  const openFilter = openNowOnly ? '["opening_hours"="24/7"]' : '';
  if (category !== 'petshop') {
    clauses.push(`nwr(around:${radiusMeters},${latitude},${longitude})["amenity"="veterinary"]${openFilter};`);
  }
  if (category !== 'veterinary') {
    clauses.push(`nwr(around:${radiusMeters},${latitude},${longitude})["shop"="pet"]${openFilter};`);
  }

  const query = `[out:json][timeout:10];(${clauses.join('')});out center tags qt;`;
  const endpoints = openNowOnly
    ? [
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        'https://overpass-api.de/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
      ]
    : [
        'https://overpass.private.coffee/api/interpreter',
        'https://overpass-api.de/api/interpreter',
      ];
  let payload: any = null;

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), openNowOnly ? 15_000 : 12_000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Pawly/1.0 nearby-services',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      payload = await response.json();
      break;
    } catch (error) {
      console.warn(
        'Overpass request failed',
        endpoint,
        error instanceof Error ? error.message : 'unknown error',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!payload) throw new Error('OSM upstream error');
  const elements = Array.isArray(payload?.elements) ? payload.elements : [];

  return elements
    .map((element: any) => {
      const tags = element?.tags ?? {};
      const lat = Number(element?.lat ?? element?.center?.lat);
      const lng = Number(element?.lon ?? element?.center?.lon);
      const kind = tags.amenity === 'veterinary'
        ? 'veterinary'
        : tags.shop === 'pet'
          ? 'petshop'
          : 'other';
      const opening = typeof tags.opening_hours === 'string' ? tags.opening_hours.trim() : '';
      const phone = tags.phone || tags['contact:phone'] || null;

      return {
        id: `osm-${element.type}-${element.id}`,
        name: tags.name || (kind === 'veterinary' ? 'Veteriner' : 'Petshop'),
        address: osmAddress(tags),
        latitude: lat,
        longitude: lng,
        kind,
        rating: null,
        ratingCount: null,
        openNow: opening === '24/7' ? true : null,
        weekdayDescriptions: opening ? [opening] : [],
        mapsUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
        phone,
        distanceMeters: Number.isFinite(lat) && Number.isFinite(lng)
          ? Math.round(distanceMeters(latitude, longitude, lat, lng))
          : null,
      } satisfies Place;
    })
    .filter((place: Place) => place.kind !== 'other'
      && Number.isFinite(place.latitude)
      && Number.isFinite(place.longitude))
    .sort((a: Place, b: Place) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    .slice(0, 30);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!hasValidApiKey(req)) return json({ error: 'Unauthorized' }, 401);

  let body: NearbyRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { latitude, longitude } = body;
  if (!isNum(latitude)
    || latitude < -90
    || latitude > 90
    || !isNum(longitude)
    || longitude < -180
    || longitude > 180) {
    return json({ error: 'Valid latitude and longitude are required' }, 400);
  }

  const radiusMeters = Math.min(
    50_000,
    Math.max(500, isNum(body.radiusMeters) ? body.radiusMeters : 10_000),
  );
  const category: Category = body.category === 'veterinary' || body.category === 'petshop'
    ? body.category
    : 'all';
  let provider = 'google';
  let places = await searchGoogle(
    latitude,
    longitude,
    radiusMeters,
    category,
    body.languageCode || 'tr',
  );

  if (!places) {
    provider = 'openstreetmap';
    try {
      places = await searchOpenStreetMap(
        latitude,
        longitude,
        radiusMeters,
        category,
        Boolean(body.openNowOnly),
      );
    } catch {
      return json({ error: 'Nearby places could not be loaded', code: 'PLACES_UPSTREAM_ERROR' }, 502);
    }
  }

  const filtered = body.openNowOnly
    ? places.filter(place => place.kind === 'veterinary' && place.openNow === true)
    : places;

  return json({
    places: filtered,
    meta: {
      provider,
      radiusMeters,
      category,
      openNowOnly: Boolean(body.openNowOnly),
      note: provider === 'google'
        ? 'Opening hours are provider-supplied and may be incomplete.'
        : 'OpenStreetMap fallback marks only explicit 24/7 clinics as open-now.',
    },
  });
});


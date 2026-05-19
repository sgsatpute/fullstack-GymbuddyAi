import config from "../config.js";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

function roundToSingleDecimal(value) {
  return Math.round(value * 10) / 10;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasMapsApiKey() {
  return Boolean(config.googleMapsApiKey);
}

export function normalizeLocationQuery(input) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildTrainingLocationQuery({ locationLabel, gym, city }) {
  const preferred = normalizeLocationQuery(locationLabel);
  if (preferred) {
    return preferred;
  }

  return [gym, city]
    .map((value) => normalizeLocationQuery(value))
    .filter(Boolean)
    .join(", ");
}

export async function geocodeTrainingLocation(query) {
  const normalizedQuery = normalizeLocationQuery(query);
  if (!normalizedQuery || !config.googleMapsApiKey) {
    return null;
  }

  const url = new URL(GEOCODE_URL);
  url.searchParams.set("address", normalizedQuery);
  url.searchParams.set("key", config.googleMapsApiKey);

  if (config.googleMapsRegion) {
    url.searchParams.set("region", config.googleMapsRegion);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data?.status !== "OK") {
      return null;
    }

    const result = data?.results?.[0];
    const lat = toFiniteNumber(result?.geometry?.location?.lat);
    const lng = toFiniteNumber(result?.geometry?.location?.lng);

    if (lat === null || lng === null) {
      return null;
    }

    return {
      locationLabel: result?.formatted_address ?? normalizedQuery,
      locationPlaceId: result?.place_id ?? null,
      locationLat: lat,
      locationLng: lng,
    };
  } catch {
    return null;
  }
}

export function calculateDistanceKm(pointA, pointB) {
  const lat1 = toFiniteNumber(pointA?.locationLat ?? pointA?.lat);
  const lng1 = toFiniteNumber(pointA?.locationLng ?? pointA?.lng);
  const lat2 = toFiniteNumber(pointB?.locationLat ?? pointB?.lat);
  const lng2 = toFiniteNumber(pointB?.locationLng ?? pointB?.lng);

  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return roundToSingleDecimal(earthRadiusKm * c);
}

export function buildMapsDirectionsLink(point) {
  const lat = toFiniteNumber(point?.locationLat ?? point?.lat);
  const lng = toFiniteNumber(point?.locationLng ?? point?.lng);
  if (lat === null || lng === null) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

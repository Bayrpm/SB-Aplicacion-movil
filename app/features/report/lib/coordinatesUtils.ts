/**
 * Utilidades para normalización y validación de coordenadas geográficas.
 * Convierte coordenadas de diferentes sistemas (Leaflet, Google Maps) a un formato estándar.
 */

/**
 * Coordenadas de referencia para San Bernardo, Chile
 * San Bernardo está aproximadamente en:
 * - Latitud: -33.6° (sur, negativa)
 * - Longitud: -70.7° (oeste, negativa)
 */
const SAN_BERNARDO_BOUNDS = {
    // Límites amplios para toda la comuna de San Bernardo y alrededores
    minLat: -33.8,
    maxLat: -33.4,
    minLng: -71.0,
    maxLng: -70.4,
};

/**
 * Límites para toda la Región Metropolitana (más permisivo)
 */
const SANTIAGO_REGION_BOUNDS = {
    minLat: -34.0,
    maxLat: -33.0,
    minLng: -71.5,
    maxLng: -70.0,
};

/**
 * Límites para todo Chile (validación más amplia)
 */
const CHILE_BOUNDS = {
    minLat: -56.0, // Cabo de Hornos
    maxLat: -17.5, // Arica
    minLng: -76.0, // Isla de Pascua
    maxLng: -66.0, // Frontera con Argentina
};

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface ValidationResult {
    isValid: boolean;
    coordinates: Coordinates;
    wasConverted: boolean;
    originalFormat: 'correct' | 'inverted' | 'invalid';
    location: 'san_bernardo' | 'santiago' | 'chile' | 'outside_chile';
}

/**
 * Verifica si las coordenadas están dentro de los límites especificados
 */
function isWithinBounds(
    lat: number,
    lng: number,
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): boolean {
    return (
        lat >= bounds.minLat &&
        lat <= bounds.maxLat &&
        lng >= bounds.minLng &&
        lng <= bounds.maxLng
    );
}

/**
 * Determina la ubicación geográfica basada en las coordenadas
 */
function determineLocation(lat: number, lng: number): ValidationResult['location'] {
    if (isWithinBounds(lat, lng, SAN_BERNARDO_BOUNDS)) {
        return 'san_bernardo';
    }
    if (isWithinBounds(lat, lng, SANTIAGO_REGION_BOUNDS)) {
        return 'santiago';
    }
    if (isWithinBounds(lat, lng, CHILE_BOUNDS)) {
        return 'chile';
    }
    return 'outside_chile';
}

/**
 * Valida y normaliza coordenadas para Google Maps API.
 * 
 * Esta función:
 * 1. Verifica si las coordenadas son válidas para Chile
 * 2. Detecta si están invertidas (Leaflet usa [lat, lng], algunos sistemas usan [lng, lat])
 * 3. Corrige automáticamente si están invertidas
 * 4. Retorna las coordenadas en formato estándar { latitude, longitude }
 * 
 * @param coords_x - Primera coordenada (puede ser latitud o longitud)
 * @param coords_y - Segunda coordenada (puede ser longitud o latitud)
 * @returns Objeto con información de validación y coordenadas normalizadas
 * 
 * @example
 * // Coordenadas correctas (coords_x = lat, coords_y = lng)
 * const result = validateAndNormalizeCoordinates(-33.6, -70.7);
 * // result.isValid = true, result.wasConverted = false
 * 
 * @example
 * // Coordenadas invertidas (coords_x = lng, coords_y = lat)
 * const result = validateAndNormalizeCoordinates(-70.7, -33.6);
 * // result.isValid = true, result.wasConverted = true
 */
export function validateAndNormalizeCoordinates(
    coords_x: number | null | undefined,
    coords_y: number | null | undefined
): ValidationResult {
    // Valores por defecto (centro de San Bernardo) si las coordenadas son inválidas
    const defaultCoords: Coordinates = {
        latitude: -33.5927,
        longitude: -70.7012,
    };

    // Validación de entrada
    if (
        coords_x == null ||
        coords_y == null ||
        !Number.isFinite(coords_x) ||
        !Number.isFinite(coords_y)
    ) {
        return {
            isValid: false,
            coordinates: defaultCoords,
            wasConverted: false,
            originalFormat: 'invalid',
            location: 'san_bernardo',
        };
    }

    // Caso 1: coords_x = latitude, coords_y = longitude (formato estándar)
    const location1 = determineLocation(coords_x, coords_y);
    const isValidFormat1 = location1 !== 'outside_chile';

    // Caso 2: coords_x = longitude, coords_y = latitude (formato invertido)
    const location2 = determineLocation(coords_y, coords_x);
    const isValidFormat2 = location2 !== 'outside_chile';

    // Si ambos formatos son válidos, preferir el que esté en San Bernardo
    if (isValidFormat1 && isValidFormat2) {
        if (location1 === 'san_bernardo') {
            return {
                isValid: true,
                coordinates: { latitude: coords_x, longitude: coords_y },
                wasConverted: false,
                originalFormat: 'correct',
                location: location1,
            };
        }
        if (location2 === 'san_bernardo') {
            return {
                isValid: true,
                coordinates: { latitude: coords_y, longitude: coords_x },
                wasConverted: true,
                originalFormat: 'inverted',
                location: location2,
            };
        }
        // Si ninguno está en San Bernardo, preferir el formato estándar
        return {
            isValid: true,
            coordinates: { latitude: coords_x, longitude: coords_y },
            wasConverted: false,
            originalFormat: 'correct',
            location: location1,
        };
    }

    // Si solo el formato 1 es válido (coords_x = lat, coords_y = lng)
    if (isValidFormat1) {
        return {
            isValid: true,
            coordinates: { latitude: coords_x, longitude: coords_y },
            wasConverted: false,
            originalFormat: 'correct',
            location: location1,
        };
    }

    // Si solo el formato 2 es válido (coords_x = lng, coords_y = lat)
    if (isValidFormat2) {
        return {
            isValid: true,
            coordinates: { latitude: coords_y, longitude: coords_x },
            wasConverted: true,
            originalFormat: 'inverted',
            location: location2,
        };
    }

    // Ningún formato es válido, usar coordenadas por defecto
    return {
        isValid: false,
        coordinates: defaultCoords,
        wasConverted: false,
        originalFormat: 'invalid',
        location: 'san_bernardo',
    };
}

/**
 * Normaliza un array de reportes con coordenadas
 * Útil para procesar múltiples denuncias de la API
 */
export function normalizeReportCoordinates<T extends { coords_x: number; coords_y: number }>(
    reports: T[]
): (T & { normalized_latitude: number; normalized_longitude: number; coords_validation: ValidationResult })[] {
    return reports.map((report) => {
        const validation = validateAndNormalizeCoordinates(report.coords_x, report.coords_y);
        return {
            ...report,
            normalized_latitude: validation.coordinates.latitude,
            normalized_longitude: validation.coordinates.longitude,
            coords_validation: validation,
        };
    });
}

/**
 * Calcula la distancia en metros entre dos puntos usando la fórmula de Haversine
 */
export function calculateDistance(
    coord1: Coordinates,
    coord2: Coordinates
): number {
    const R = 6371000; // Radio de la Tierra en metros
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(coord1.latitude)) *
        Math.cos(toRad(coord2.latitude)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

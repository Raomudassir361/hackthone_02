"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDistanceMeters = calculateDistanceMeters;
exports.isWithinRadius = isWithinRadius;
/**
 * Haversine formula to calculate the distance between two coordinates in meters.
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}
function isWithinRadius(currentLat, currentLng, officeLat, officeLng, radiusMeters) {
    const distance = calculateDistanceMeters(currentLat, currentLng, officeLat, officeLng);
    return distance <= radiusMeters;
}

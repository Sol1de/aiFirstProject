/**
 * Fonctions utilitaires et helpers
 */

// Fonction pour limiter la valeur dans une plage donnée
function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Mapper une valeur d'une plage à une autre
function mapValue(value, fromLow, fromHigh, toLow, toHigh) {
    return toLow + (toHigh - toLow) * ((value - fromLow) / (fromHigh - fromLow));
}

// Calculer la distance euclidienne entre deux points
function distanceBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Vérifier si un point est dans un cercle
function isPointInCircle(px, py, cx, cy, radius) {
    const distance = distanceBetweenPoints(px, py, cx, cy);
    return distance <= radius;
}

// Appliquer un lissage exponentiel à une valeur
function smoothValue(newValue, oldValue, smoothFactor) {
    return oldValue + (newValue - oldValue) * (1 - smoothFactor);
}

// Créer un délai
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Vérifier si la valeur est dans la plage
function inRange(value, min, max) {
    return value >= min && value <= max;
}

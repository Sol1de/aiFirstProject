/**
 * Fonctions utilitaires et helpers
 */

function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function mapValue(value, fromLow, fromHigh, toLow, toHigh) {
    return toLow + (toHigh - toLow) * ((value - fromLow) / (fromHigh - fromLow));
}

function distanceBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function isPointInCircle(px, py, cx, cy, radius) {
    const distance = distanceBetweenPoints(px, py, cx, cy);
    return distance <= radius;
}

function smoothValue(newValue, oldValue, smoothFactor) {
    return oldValue + (newValue - oldValue) * (1 - smoothFactor);
}

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

function inRange(value, min, max) {
    return value >= min && value <= max;
}

document.dispatchEvent(new CustomEvent('resourceLoaded', { detail: { name: 'handDetection' } }));
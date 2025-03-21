/**
 * Fonctions de détection et de suivi des mains
 */

function gotHands(results) {
    const currentHandIds = new Set(results.map(hand => hand.handedness));
    const previousHandIds = new Set(hands.map(hand => hand.handedness));

    results.forEach(hand => {
        if (!previousHandIds.has(hand.handedness)) {
            handDetectionTimes[hand.handedness] = millis();
            pinchesDetected = {};
            lastPinchState = {};
            gesturePhase = null;
        }
    });

    if (activeHandId === null && results.length > 0) {
        determineActiveHand(results);
    }

    if (activeHandId !== null && !currentHandIds.has(activeHandId)) {
        activeHandId = null;
        if (results.length > 0) {
            determineActiveHand(results);
        }
        resetGestureStates();
    }
    hands = results;
}

function determineActiveHand(handsList) {
    if (handsList.length === 0) return;

    if (handsList.length === 1) {
        activeHandId = handsList[0].handedness;
    } else {
        activeHandId = null;
    }
}

function resetGestureStates() {
    isPinching = false;
    singleHandZoomActive = false;
    previousPinchPosition = null;
    gesturePhase = null;
    pinchesDetected = {};
    lastPinchState = {};
    isZooming = false;
    pinchDistanceHistory = [];
}

function detectFistState(hand) {
    if (!hand || !hand.keypoints || hand.keypoints.length < 21) return false;

    const palm = hand.keypoints[0];
    const index = hand.keypoints[8];
    const middle = hand.keypoints[12];
    const ring = hand.keypoints[16];
    const pinky = hand.keypoints[20];

    if (!palm || !index || !middle || !ring || !pinky) return false;
    const indexToPalmDistance = dist(index.x, index.y, palm.x, palm.y);
    const middleToPalmDistance = dist(middle.x, middle.y, palm.x, palm.y);
    const ringToPalmDistance = dist(ring.x, ring.y, palm.x, palm.y);
    const pinkyToPalmDistance = dist(pinky.x, pinky.y, palm.x, palm.y);
    const avgFingerToPalmDistance = (indexToPalmDistance + middleToPalmDistance + ringToPalmDistance + pinkyToPalmDistance) / 4;
    const wasFistClosed = isFistClosed;
    isFistClosed = avgFingerToPalmDistance < fingerCloseThreshold;

    if (wasFistClosed !== isFistClosed) {
        const currentTime = millis();
        if (currentTime - lastFistChangeTime > fistChangeDelay) {
            fistStateChanged = true;
            lastFistChangeTime = currentTime;
            saveScrollPosition();
            return true;
        }
    } else {
        fistStateChanged = false;
    }

    return false;
}

document.dispatchEvent(new CustomEvent('resourceLoaded', { detail: { name: 'handDetection' } }));
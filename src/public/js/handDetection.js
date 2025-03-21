/**
 * Fonctions de détection et de suivi des mains
 */

function gotHands(results) {
    // Vérifier si de nouvelles mains apparaissent
    const currentHandIds = new Set(results.map(hand => hand.handedness));
    const previousHandIds = new Set(hands.map(hand => hand.handedness));

    // Pour chaque nouvelle main détectée, enregistrer son temps d'apparition
    results.forEach(hand => {
        if (!previousHandIds.has(hand.handedness)) {
            handDetectionTimes[hand.handedness] = millis();

            // Réinitialiser les états de pincement pour la nouvelle main
            pinchesDetected = {};
            lastPinchState = {};
            gesturePhase = null;
        }
    });

    // Définir la main active si ce n'est pas déjà fait
    if (activeHandId === null && results.length > 0) {
        determineActiveHand(results);
    }

    // Si la main active disparaît, réinitialiser
    if (activeHandId !== null && !currentHandIds.has(activeHandId)) {
        activeHandId = null;
        // Redéterminer la main active s'il reste des mains
        if (results.length > 0) {
            determineActiveHand(results);
        }

        // Réinitialiser les états des gestes
        resetGestureStates();
    }

    // Mettre à jour la variable hands
    hands = results;
}

function determineActiveHand(handsList) {
    if (handsList.length === 0) return;

    if (handsList.length === 1) {
        // S'il n'y a qu'une main, elle devient active
        activeHandId = handsList[0].handedness;
    } else {
        // S'il y a deux mains, on laisse les deux actives pour le zoom à deux mains
        activeHandId = null;
    }
}

function resetGestureStates() {
    // Réinitialiser les états des gestes
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

    // Calculer la distance moyenne entre les bouts des doigts et la paume
    const indexToPalmDistance = dist(index.x, index.y, palm.x, palm.y);
    const middleToPalmDistance = dist(middle.x, middle.y, palm.x, palm.y);
    const ringToPalmDistance = dist(ring.x, ring.y, palm.x, palm.y);
    const pinkyToPalmDistance = dist(pinky.x, pinky.y, palm.x, palm.y);

    // Moyenne des distances
    const avgFingerToPalmDistance = (indexToPalmDistance + middleToPalmDistance + ringToPalmDistance + pinkyToPalmDistance) / 4;

    // Déterminer si le poing est fermé ou ouvert
    const wasFistClosed = isFistClosed;
    isFistClosed = avgFingerToPalmDistance < fingerCloseThreshold;

    // Détecter le changement d'état du poing
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
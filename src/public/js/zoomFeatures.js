/**
 * Fonctionnalités de zoom (une main et deux mains)
 */

// ZOOM/DÉZOOM À UNE MAIN

function detectSingleHandZoomGestures() {
    if (hands.length === 0 || !activeHandId) return;

    // Trouver la main active
    const activeHand = hands.find(hand => hand.handedness === activeHandId);
    if (!activeHand || !activeHand.keypoints || activeHand.keypoints.length < 21) return;

    const thumb = activeHand.keypoints[4];
    const index = activeHand.keypoints[8];
    const middle = activeHand.keypoints[12];
    const ring = activeHand.keypoints[16];

    if (!thumb || !index || !middle || !ring) return;

    // Distances entre le pouce et les autres doigts
    const thumbMiddleDistance = dist(thumb.x, thumb.y, middle.x, middle.y);
    const thumbRingDistance = dist(thumb.x, thumb.y, ring.x, ring.y);
    const thumbIndexDistance = dist(thumb.x, thumb.y, index.x, index.y);

    // Point central de la main pour le zoom
    const handCenter = {
        x: (thumb.x + index.x + middle.x + ring.x) / 4,
        y: (thumb.y + index.y + middle.y + ring.y) / 4
    };

    // Définir le point central du zoom (avec inversion horizontale)
    zoomCenterX = (width - handCenter.x) / width;
    zoomCenterY = handCenter.y / height;

    // -------- NOUVEAUX GESTES DE ZOOM/DÉZOOM --------

    // 1. État actuel des pincements
    const middlePinched = thumbMiddleDistance < pinchThreshold;
    const ringPinched = thumbRingDistance < pinchThreshold;

    // Mise à jour des états de pincement
    pinchesDetected.middle = middlePinched;
    pinchesDetected.ring = ringPinched;

    // 2. Détection des transitions
    const middleJustPinched = pinchesDetected.middle && !lastPinchState.middle;
    const middleJustReleased = !pinchesDetected.middle && lastPinchState.middle;
    const ringJustPinched = pinchesDetected.ring && !lastPinchState.ring;
    const ringJustReleased = !pinchesDetected.ring && lastPinchState.ring;

    // 3. ZOOM IN (pouce + majeur d'abord pincés, puis qui s'écartent)
    if (pinchesDetected.middle && gesturePhase === null && !pinchesDetected.ring && canZoomAgain) {
        // Début du geste de zoom in
        gesturePhase = 'start-zoom-in';
        initialFingerDistance = thumbMiddleDistance;
        console.log('Début geste ZOOM IN - Pouce et majeur pincés');
    }
    else if (gesturePhase === 'start-zoom-in' && !pinchesDetected.middle) {
        // Les doigts s'écartent, activation du zoom
        gesturePhase = 'spreading';
        fingerSpreadDistance = thumbMiddleDistance;
        console.log('ZOOM IN en cours - Écartement des doigts');
    }
    else if (gesturePhase === 'spreading') {
        // Calculer l'augmentation de la distance
        const spreadDelta = thumbMiddleDistance - fingerSpreadDistance;

        // Si les doigts continuent de s'écarter suffisamment
        if (spreadDelta > fingerDistanceThreshold && currentZoomIndex < zoomLevels.length - 1 && canZoomAgain) {
            // Effectuer le zoom in
            startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
            currentZoomIndex++;

            // Mettre à jour pour la prochaine étape
            fingerSpreadDistance = thumbMiddleDistance;

            // Empêcher les zooms trop rapides
            canZoomAgain = false;
            setTimeout(() => { canZoomAgain = true; }, 800);

            console.log(`ZOOM IN: ${currentZoomLevel.toFixed(2)}x`);
        }

        // Si les doigts se referment complètement, terminer le geste
        if (pinchesDetected.middle) {
            gesturePhase = null;
            console.log('Fin du geste ZOOM IN');
        }
    }

    // 4. ZOOM OUT (pouce + annulaire d'abord écartés, puis qui se rapprochent jusqu'au pincement)
    else if (!pinchesDetected.ring && gesturePhase === null && thumbRingDistance > pinchThreshold*3 && !pinchesDetected.middle && canZoomAgain) {
        // Début du geste de zoom out - doigts écartés
        gesturePhase = 'start-zoom-out';
        initialFingerDistance = thumbRingDistance;
        console.log('Début geste ZOOM OUT - Pouce et annulaire écartés');
    }
    else if (gesturePhase === 'start-zoom-out' && pinchesDetected.ring) {
        // Les doigts se sont rapprochés jusqu'au pincement, activer le dézoom
        if (currentZoomIndex > 0 && canZoomAgain) {
            // Effectuer le zoom out
            startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
            currentZoomIndex--;

            // Empêcher les zooms trop rapides
            canZoomAgain = false;
            setTimeout(() => { canZoomAgain = true; }, 800);

            console.log(`ZOOM OUT: ${currentZoomLevel.toFixed(2)}x`);
        }

        // Réinitialiser l'état du geste
        gesturePhase = null;
        console.log('Fin du geste ZOOM OUT');
    }

    // 5. Mémoriser les états actuels pour la prochaine frame
    lastPinchState.middle = pinchesDetected.middle;
    lastPinchState.ring = pinchesDetected.ring;
}

// ZOOM À DEUX MAINS

function detectTwoHandsZoomGesture() {
    if (hands.length < 2) {
        isZooming = false;
        pinchDistanceHistory = [];
        return;
    }

    // Extraire les deux mains
    const hand1 = hands[0];
    const hand2 = hands[1];

    if (!hand1 || !hand2 ||
        !hand1.keypoints || !hand2.keypoints ||
        hand1.keypoints.length < 21 || hand2.keypoints.length < 21) {
        return;
    }

    // Points utilisés pour le pincement
    const thumb1 = hand1.keypoints[4];
    const index1 = hand1.keypoints[8];
    const thumb2 = hand2.keypoints[4];
    const index2 = hand2.keypoints[8];

    // Vérifier si les deux mains font un pincement
    const pinch1 = dist(thumb1.x, thumb1.y, index1.x, index1.y) < pinchThreshold;
    const pinch2 = dist(thumb2.x, thumb2.y, index2.x, index2.y) < pinchThreshold;

    if (pinch1 && pinch2) {
        // Centres des pincements
        const center1 = {
            x: (thumb1.x + index1.x) / 2,
            y: (thumb1.y + index1.y) / 2
        };

        const center2 = {
            x: (thumb2.x + index2.x) / 2,
            y: (thumb2.y + index2.y) / 2
        };

        // Point central entre les deux pincements pour l'origine du zoom
        const midX = (center1.x + center2.x) / 2;
        const midY = (center1.y + center2.y) / 2;

        // Convertir avec le miroir
        zoomCenterX = (width - midX) / width;
        zoomCenterY = midY / height;

        // Distance entre les pincements
        const currentPinchDistance = dist(center1.x, center1.y, center2.x, center2.y);

        // Historique pour lissage
        pinchDistanceHistory.push(currentPinchDistance);
        if (pinchDistanceHistory.length > pinchHistorySize) {
            pinchDistanceHistory.shift();
        }

        // Moyenne des dernières distances
        const avgPinchDistance = pinchDistanceHistory.reduce((sum, val) => sum + val, 0) / pinchDistanceHistory.length;

        if (!isZooming) {
            // Début du zoom à deux mains
            isZooming = true;
            initialPinchDistance = avgPinchDistance;
            lastPinchDistance = avgPinchDistance;
            saveScrollPosition();
        } else {
            // Modifier le zoom en fonction de la variation de distance
            const pinchDelta = avgPinchDistance - lastPinchDistance;

            // Vérifier si le mouvement est suffisant et si assez de temps s'est écoulé
            const currentTime = millis();
            if (Math.abs(pinchDelta) > zoomThreshold &&
                currentTime - lastZoomStepTime > zoomStepDebounce) {

                // Direction du zoom
                const newZoomDirection = pinchDelta > 0 ? 1 : -1;

                // Si la direction a changé, réinitialiser
                if (newZoomDirection !== zoomDirection) {
                    lastPinchDistance = avgPinchDistance;
                    zoomDirection = newZoomDirection;
                    return;
                }

                // Zoom in/out selon la direction
                if (newZoomDirection > 0 && currentZoomIndex < zoomLevels.length - 1) {
                    // ZOOM IN
                    startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
                    currentZoomIndex++;
                } else if (newZoomDirection < 0 && currentZoomIndex > 0) {
                    // ZOOM OUT
                    startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
                    currentZoomIndex--;
                }

                // Mettre à jour pour le prochain calcul
                lastPinchDistance = avgPinchDistance;
                lastZoomStepTime = currentTime;
            }
        }
    } else {
        // Fin du geste de zoom
        isZooming = false;
        pinchDistanceHistory = [];
    }
}

// FONCTIONS D'ANIMATION DE ZOOM

function startZoomAnimation(startLevel, endLevel) {
    // Sauvegarder les positions de départ et d'arrivée
    zoomAnimationStartLevel = startLevel;
    zoomAnimationEndLevel = endLevel;

    // Marquer le début de l'animation
    zoomAnimationStartTime = millis();
    isZoomAnimating = true;

    // Message de retour
    if (endLevel > startLevel) {
        console.log("Zoom IN");
    } else {
        console.log("Zoom OUT");
    }
}

function updateZoom() {
    if (!isZoomAnimating) return;

    const currentTime = millis();
    const elapsed = currentTime - zoomAnimationStartTime;
    const duration = zoomAnimationDuration;

    // Calculer la progression (0 à 1)
    let progress = Math.min(elapsed / duration, 1);

    // Appliquer une courbe d'easing pour une animation fluide
    let easedProgress;
    if (progress < 0.5) {
        easedProgress = 4 * progress * progress * progress;
    } else {
        const f = progress - 1;
        easedProgress = 1 + 4 * f * f * f;
    }

    // Interpoler entre les niveaux de zoom
    currentZoomLevel = zoomAnimationStartLevel + (zoomAnimationEndLevel - zoomAnimationStartLevel) * easedProgress;

    // Appliquer le zoom
    applyCurrentZoom();

    // Animation terminée
    if (progress >= 1) {
        isZoomAnimating = false;
        currentZoomLevel = zoomAnimationEndLevel;
        applyCurrentZoom();
    }
}

function applyCurrentZoom() {
    // Appliquer le zoom avec un point d'origine spécifique
    document.body.style.transformOrigin = `${zoomCenterX * 100}% ${zoomCenterY * 100}%`;
    document.body.style.transform = `scale(${currentZoomLevel})`;

    // Ajuster l'espace
    if (currentZoomLevel > 1) {
        document.body.style.minHeight = `${100 * currentZoomLevel}vh`;
        document.body.style.minWidth = `${100 * currentZoomLevel}vw`;
    } else {
        document.body.style.minHeight = '100vh';
        document.body.style.minWidth = '100vw';
    }
}

function saveScrollPosition() {
    initialScrollX = window.scrollX;
    initialScrollY = window.scrollY;
}

function adjustScrollToMaintainFocus(zoomRatio) {
    // Calculer le nouveau scroll pour maintenir le point focal visible
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const focalPointX = zoomCenterX * viewportWidth;
    const focalPointY = zoomCenterY * viewportHeight;

    const absoluteFocalX = initialScrollX + focalPointX;
    const absoluteFocalY = initialScrollY + focalPointY;

    const newScrollX = absoluteFocalX * zoomRatio - focalPointX;
    const newScrollY = absoluteFocalY * zoomRatio - focalPointY;

    if (!isNaN(newScrollX) && !isNaN(newScrollY)) {
        window.scrollTo(newScrollX, newScrollY);
    }
}

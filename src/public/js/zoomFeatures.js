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
    const pinky = activeHand.keypoints[20];

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

    // -------- DÉTECTION AMÉLIORÉE DE GESTES --------

    // Redéfinir les seuils pour améliorer la détection
    const tightPinchThreshold = pinchThreshold * 0.8;       // Seuil plus strict pour pincement
    const looseSpreadThreshold = pinchThreshold * 2.5;      // Seuil plus large pour écartement
    const veryLooseSpreadThreshold = pinchThreshold * 4;    // Pour détecter un grand écartement

    // 1. État actuel des pincements (avec seuils ajustés)
    const middlePinched = thumbMiddleDistance < tightPinchThreshold;
    const middleSpread = thumbMiddleDistance > looseSpreadThreshold;
    const ringPinched = thumbRingDistance < tightPinchThreshold;
    const ringSpread = thumbRingDistance > looseSpreadThreshold;

    // Mise à jour des états de pincement
    pinchesDetected.middle = middlePinched;
    pinchesDetected.middleSpread = middleSpread;
    pinchesDetected.ring = ringPinched;
    pinchesDetected.ringSpread = ringSpread;

    // Afficher les valeurs de distance dans la console pour le débogage
    if (debugMode && frameCount % 30 === 0) {
        console.log(`Thumb-Middle: ${thumbMiddleDistance.toFixed(1)}, Thumb-Ring: ${thumbRingDistance.toFixed(1)}`);
    }

    // 2. Détection des transitions d'état (plus simple et fiable)
    const justStartedMiddlePinch = pinchesDetected.middle && !lastPinchState.middle;
    const justEndedMiddlePinch = !pinchesDetected.middle && lastPinchState.middle;
    const justStartedRingPinch = pinchesDetected.ring && !lastPinchState.ring;

    // 3. LOGIQUE AMÉLIORÉE POUR LE ZOOM IN (plus sensible)

    // État: Début du pincement pouce-majeur (première étape pour zoom in)
    if (justStartedMiddlePinch && !pinchesDetected.ring && canZoomAgain && gesturePhase === null) {
        gesturePhase = 'start-zoom-in';
        initialFingerDistance = thumbMiddleDistance;
        console.log('👉 Début geste ZOOM IN - Pouce et majeur pincés');
    }
    // État: Le pincement pouce-majeur se termine, transition vers écartement
    else if (gesturePhase === 'start-zoom-in' && justEndedMiddlePinch) {
        gesturePhase = 'spreading';
        fingerSpreadDistance = thumbMiddleDistance;
        console.log('👐 ZOOM IN en cours - Écartement des doigts');
    }
    // État: Les doigts continuent de s'écarter pour zoomer
    else if (gesturePhase === 'spreading') {
        // Vérifier si les doigts se sont suffisamment écartés
        if (thumbMiddleDistance > fingerSpreadDistance + fingerDistanceThreshold &&
            canZoomAgain && currentZoomIndex < zoomLevels.length - 1) {

            // Déclencher le zoom
            startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
            currentZoomIndex++;

            // Mettre à jour la distance de référence
            fingerSpreadDistance = thumbMiddleDistance;

            // Empêcher les zooms trop rapides
            canZoomAgain = false;
            setTimeout(() => {
                canZoomAgain = true;
                console.log("✅ Prêt pour un nouveau palier de zoom");
            }, 600);

            console.log(`🔍 ZOOM IN: ${zoomLevels[currentZoomIndex].toFixed(2)}x`);
        }

        // Vérifier si le geste se termine (repincement ou autre geste)
        if (middlePinched || ringPinched || thumbMiddleDistance < fingerSpreadDistance) {
            gesturePhase = null;
            console.log('👋 Fin du geste ZOOM IN');
        }
    }

    // 4. LOGIQUE AMÉLIORÉE POUR LE ZOOM OUT (plus fiable)

    // Condition pour démarrer le dézoom: l'écart est large entre pouce et annulaire
    // ET il n'y a pas de geste en cours ET le pouce et majeur ne sont pas pincés
    if (thumbRingDistance > veryLooseSpreadThreshold && gesturePhase === null &&
        !pinchesDetected.middle && canZoomAgain &&
        !pinchesDetected.ring && currentZoomIndex > 0) {

        gesturePhase = 'start-zoom-out';
        initialFingerDistance = thumbRingDistance;
        console.log('👉 Début geste ZOOM OUT - Pouce et annulaire écartés');

        // Feedback visuel qui montre que le geste est reconnu
        // (pourrait être une vibration ou un effet visuel)
    }
    // Détecter quand l'utilisateur pince pouce et annulaire pour finaliser le dézoom
    else if (gesturePhase === 'start-zoom-out' && justStartedRingPinch) {
        if (currentZoomIndex > 0 && canZoomAgain) {
            // Effectuer le zoom out
            startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
            currentZoomIndex--;

            console.log(`🔍 ZOOM OUT: ${zoomLevels[currentZoomIndex].toFixed(2)}x`);

            // Empêcher les zooms trop rapides
            canZoomAgain = false;
            setTimeout(() => { canZoomAgain = true; }, 600);
        }

        // Réinitialiser l'état du geste
        gesturePhase = null;
        console.log('👋 Fin du geste ZOOM OUT');
    }
    // Si l'utilisateur arrête la posture d'écartement, annuler le geste
    else if (gesturePhase === 'start-zoom-out' && thumbRingDistance < looseSpreadThreshold) {
        gesturePhase = null;
        console.log('❌ Geste ZOOM OUT annulé - Écartement insuffisant');
    }

    // 5. MÉTHODE ALTERNATIVE DE ZOOM OUT (simplement pincer l'annulaire)
    // Cette alternative peut aider si la méthode principale est difficile
    if (currentZoomIndex > 0 && justStartedRingPinch && !pinchesDetected.middle &&
        gesturePhase === null && canZoomAgain) {

        // Confirmer que le majeur n'est pas pincé (pour éviter les confusions)
        if (!pinchesDetected.middle) {
            // Effectuer le zoom out
            startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
            currentZoomIndex--;

            console.log(`🔍 ZOOM OUT alternatif: ${zoomLevels[currentZoomIndex].toFixed(2)}x`);

            // Empêcher les zooms trop rapides
            canZoomAgain = false;
            setTimeout(() => { canZoomAgain = true; }, 700);
        }
    }

    // 6. MÉTHODE ALTERNATIVE DE ZOOM IN (pour les cas où la méthode principale est difficile)
    // Pincer puis relâcher rapidement le majeur dans un délai court
    if (justEndedMiddlePinch && gesturePhase === null && canZoomAgain &&
        millis() - lastGestureTime < 500 && currentZoomIndex < zoomLevels.length - 1) {

        // Le majeur vient d'être relâché rapidement après un pincement, effectuer un zoom in
        startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
        currentZoomIndex++;

        console.log(`🔍 ZOOM IN alternatif: ${zoomLevels[currentZoomIndex].toFixed(2)}x`);

        canZoomAgain = false;
        setTimeout(() => { canZoomAgain = true; }, 700);
    }

    // Mettre à jour le temps du dernier geste
    if (justStartedMiddlePinch || justStartedRingPinch) {
        lastGestureTime = millis();
    }

    // Mémoriser les états actuels pour la prochaine frame
    lastPinchState.middle = pinchesDetected.middle;
    lastPinchState.middleSpread = pinchesDetected.middleSpread;
    lastPinchState.ring = pinchesDetected.ring;
    lastPinchState.ringSpread = pinchesDetected.ringSpread;
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

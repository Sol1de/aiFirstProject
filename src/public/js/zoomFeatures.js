/**
 * Fonctionnalités de zoom (une main et deux mains)
 */

function detectSingleHandZoomGestures() {
    if (hands.length === 0 || !activeHandId) return;

    const activeHand = hands.find(hand => hand.handedness === activeHandId);
    if (!activeHand || !activeHandId || !activeHand.keypoints || activeHand.keypoints.length < 21) return;

    const thumb = activeHand.keypoints[4];
    const index = activeHand.keypoints[8];
    const middle = activeHand.keypoints[12];
    const ring = activeHand.keypoints[16];

    if (!thumb || !index || !middle || !ring) return;

    const thumbMiddleDistance = dist(thumb.x, thumb.y, middle.x, middle.y);
    const thumbRingDistance = dist(thumb.x, thumb.y, ring.x, ring.y);
    const thumbIndexDistance = dist(thumb.x, thumb.y, index.x, index.y);

    const handCenter = {
        x: (thumb.x + index.x + middle.x + ring.x) / 4,
        y: (thumb.y + index.y + middle.y + ring.y) / 4
    };

    zoomCenterX = (width - handCenter.x) / width;
    zoomCenterY = handCenter.y / height;

    const tightPinchThreshold = pinchThreshold * 0.8;
    const looseSpreadThreshold = pinchThreshold * 2.5;
    const veryLooseSpreadThreshold = pinchThreshold * 4;
    const middlePinched = thumbMiddleDistance < tightPinchThreshold;
    const middleSpread = thumbMiddleDistance > looseSpreadThreshold;
    const ringPinched = thumbRingDistance < tightPinchThreshold;
    const ringSpread = thumbRingDistance > looseSpreadThreshold;

    if (!pinchesDetected) pinchesDetected = {};
    pinchesDetected.middle = middlePinched;
    pinchesDetected.ring = ringPinched;

    if (debugMode && frameCount % 30 === 0) {
        console.log(`Thumb-Middle: ${thumbMiddleDistance.toFixed(1)}, Thumb-Ring: ${thumbRingDistance.toFixed(1)}`);
    }

    const middleJustPinched = pinchesDetected.middle && !lastPinchState.middle;
    const middleJustReleased = !pinchesDetected.middle && lastPinchState.middle;
    const ringJustPinched = pinchesDetected.ring && !lastPinchState.ring;

    if (middleJustPinched && !pinchesDetected.ring && canZoomAgain && gesturePhase === null) {
        gesturePhase = 'start-zoom-in';
        initialFingerDistance = thumbMiddleDistance;
        console.log('👉 Début geste ZOOM IN - Pouce et majeur pincés');
    }
    else if (gesturePhase === 'start-zoom-in' && middleJustReleased) {
        gesturePhase = 'spreading';
        fingerSpreadDistance = thumbMiddleDistance;
        console.log('👐 ZOOM IN en cours - Écartement des doigts');
    }

    else if (gesturePhase === 'spreading') {
        if (thumbMiddleDistance > fingerSpreadDistance + fingerDistanceThreshold &&
            canZoomAgain && currentZoomIndex < zoomLevels.length - 1) {
            startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
            currentZoomIndex++;
            fingerSpreadDistance = thumbMiddleDistance;
            canZoomAgain = false;

            setTimeout(() => {
                canZoomAgain = true;
                console.log("✅ Prêt pour un nouveau palier de zoom");
            }, 600);

            console.log(`🔍 ZOOM IN: ${zoomLevels[currentZoomIndex].toFixed(2)}x`);
        }

        if (middlePinched || ringPinched || thumbMiddleDistance < fingerSpreadDistance) {
            gesturePhase = null;
            console.log('👋 Fin du geste ZOOM IN');
        }
    }

    if (thumbRingDistance > veryLooseSpreadThreshold && gesturePhase === null &&
        !pinchesDetected.middle && canZoomAgain &&
        !pinchesDetected.ring && currentZoomIndex > 0) {

        gesturePhase = 'start-zoom-out';
        initialFingerDistance = thumbRingDistance;
        lastZoomTime = millis();
        console.log('👉 Début geste ZOOM OUT - Pouce et annulaire écartés');
    }

    else if (gesturePhase === 'start-zoom-out' && ringJustPinched) {
        if (currentZoomIndex > 0 && canZoomAgain) {
            startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
            currentZoomIndex--;

            console.log(`🔍 ZOOM OUT: ${zoomLevels[currentZoomIndex].toFixed(2)}x`);

            canZoomAgain = false;
            setTimeout(() => { canZoomAgain = true; }, 600);
        }

        gesturePhase = null;
        console.log('👋 Fin du geste ZOOM OUT');
    }
    else if (gesturePhase === 'start-zoom-out' && thumbRingDistance < looseSpreadThreshold) {
        gesturePhase = null;
        console.log('❌ Geste ZOOM OUT annulé - Écartement insuffisant');
    }

    if (currentZoomIndex > 0 && ringJustPinched && !pinchesDetected.middle &&
        gesturePhase === null && canZoomAgain) {

        if (!pinchesDetected.middle) {
            startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
            currentZoomIndex--;

            console.log(`🔍 ZOOM OUT alternatif: ${zoomLevels[currentZoomIndex].toFixed(2)}x`);

            canZoomAgain = false;
            setTimeout(() => { canZoomAgain = true; }, 700);
        }
    }

    const currentTime = millis();
    if (middleJustReleased && gesturePhase === null && canZoomAgain &&
        currentTime - lastZoomTime < 500 && currentZoomIndex < zoomLevels.length - 1) {

        startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
        currentZoomIndex++;

        console.log(`🔍 ZOOM IN alternatif: ${zoomLevels[currentZoomIndex].toFixed(2)}x`);

        canZoomAgain = false;
        setTimeout(() => { canZoomAgain = true; }, 700);
    }

    if (middleJustPinched || ringJustPinched) {
        lastZoomTime = currentTime;
    }

    if (!lastPinchState) lastPinchState = {};
    lastPinchState.middle = pinchesDetected.middle;
    lastPinchState.ring = pinchesDetected.ring;
}

function detectTwoHandsZoomGesture() {
    if (hands.length < 2) {
        isZooming = false;
        pinchDistanceHistory = [];
        return;
    }

    const hand1 = hands[0];
    const hand2 = hands[1];

    if (!hand1 || !hand2 ||
        !hand1.keypoints || !hand2.keypoints ||
        hand1.keypoints.length < 21 || hand2.keypoints.length < 21) {
        return;
    }

    const thumb1 = hand1.keypoints[4];
    const index1 = hand1.keypoints[8];
    const thumb2 = hand2.keypoints[4];
    const index2 = hand2.keypoints[8];
    const pinch1 = dist(thumb1.x, thumb1.y, index1.x, index1.y) < pinchThreshold;
    const pinch2 = dist(thumb2.x, thumb2.y, index2.x, index2.y) < pinchThreshold;

    if (pinch1 && pinch2) {
        const center1 = {
            x: (thumb1.x + index1.x) / 2,
            y: (thumb1.y + index1.y) / 2
        };

        const center2 = {
            x: (thumb2.x + index2.x) / 2,
            y: (thumb2.y + index2.y) / 2
        };

        const midX = (center1.x + center2.x) / 2;
        const midY = (center1.y + center2.y) / 2;
        zoomCenterX = (width - midX) / width;
        zoomCenterY = midY / height;

        const currentPinchDistance = dist(center1.x, center1.y, center2.x, center2.y);

        pinchDistanceHistory.push(currentPinchDistance);
        if (pinchDistanceHistory.length > pinchHistorySize) {
            pinchDistanceHistory.shift();
        }

        const avgPinchDistance = pinchDistanceHistory.reduce((sum, val) => sum + val, 0) / pinchDistanceHistory.length;

        if (!isZooming) {
            isZooming = true;
            initialPinchDistance = avgPinchDistance;
            lastPinchDistance = avgPinchDistance;
            saveScrollPosition();
        } else {
            const pinchDelta = avgPinchDistance - lastPinchDistance;
            const currentTime = millis();

            if (Math.abs(pinchDelta) > zoomThreshold &&
                currentTime - lastZoomStepTime > zoomStepDebounce) {

                const newZoomDirection = pinchDelta > 0 ? 1 : -1;

                if (newZoomDirection !== zoomDirection) {
                    lastPinchDistance = avgPinchDistance;
                    zoomDirection = newZoomDirection;
                    return;
                }

                if (newZoomDirection > 0 && currentZoomIndex < zoomLevels.length - 1) {
                    startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
                    currentZoomIndex++;
                } else if (newZoomDirection < 0 && currentZoomIndex > 0) {
                    startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
                    currentZoomIndex--;
                }

                lastPinchDistance = avgPinchDistance;
                lastZoomStepTime = currentTime;
            }
        }
    } else {
        isZooming = false;
        pinchDistanceHistory = [];
    }
}

function startZoomAnimation(startLevel, endLevel) {
    zoomAnimationStartLevel = startLevel;
    zoomAnimationEndLevel = endLevel;
    zoomAnimationStartTime = millis();
    isZoomAnimating = true;

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

    let progress = Math.min(elapsed / duration, 1);

    let easedProgress;
    if (progress < 0.5) {
        easedProgress = 4 * progress * progress * progress;
    } else {
        const f = progress - 1;
        easedProgress = 1 + 4 * f * f * f;
    }

    currentZoomLevel = zoomAnimationStartLevel + (zoomAnimationEndLevel - zoomAnimationStartLevel) * easedProgress;

    applyCurrentZoom();

    if (progress >= 1) {
        isZoomAnimating = false;
        currentZoomLevel = zoomAnimationEndLevel;
        applyCurrentZoom();
    }
}

function applyCurrentZoom() {
    document.body.style.transformOrigin = `${zoomCenterX * 100}% ${zoomCenterY * 100}%`;
    document.body.style.transform = `scale(${currentZoomLevel})`;

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

document.dispatchEvent(new CustomEvent('resourceLoaded', { detail: { name: 'handDetection' } }));

/**
 * Fonctionnalités de défilement
 */

function detectScrollGesture() {
    if (hands.length === 0 || activeHandId === null) {
        isPinching = false;
        previousPinchPosition = null;
        return;
    }

    // Trouver la main active
    const activeHand = hands.find(hand => hand.handedness === activeHandId);
    if (!activeHand || !activeHand.keypoints || activeHand.keypoints.length < 21) return;

    // Points utilisés pour le pincement
    const thumb = activeHand.keypoints[4];
    const index = activeHand.keypoints[8];

    if (!thumb || !index) return;

    // Vérifier si un pincement est en cours (pouce et index proches)
    const pinchDistance = dist(thumb.x, thumb.y, index.x, index.y);

    // Position moyenne entre le pouce et l'index
    const pinchPosition = {
        x: (thumb.x + index.x) / 2,
        y: (thumb.y + index.y) / 2
    };

    // Détecter le pincement
    if (pinchDistance < pinchThreshold) {
        if (!isPinching) {
            // Début du pincement
            isPinching = true;
            previousPinchPosition = pinchPosition;
        } else if (previousPinchPosition) {
            // Pincement en cours
            const verticalMovement = pinchPosition.y - previousPinchPosition.y;

            // Si le mouvement vertical est assez grand et le temps écoulé suffisant
            const currentTime = millis();
            if (Math.abs(verticalMovement) > scrollThreshold &&
                currentTime - lastScrollTime > scrollDebounce) {

                // Déclencher le scroll
                triggerScroll(verticalMovement > 0 ? 'down' : 'up');

                // Mettre à jour le temps et la position
                lastScrollTime = currentTime;
                previousPinchPosition = pinchPosition;
            }
        }
    } else {
        // Fin du pincement
        isPinching = false;
        previousPinchPosition = null;
    }
}

function triggerScroll(direction) {
    // Distance de défilement
    const scrollDistance = direction === 'down' ? 300 : -300;

    // Effectuer le défilement
    window.scrollBy({
        top: scrollDistance,
        behavior: 'smooth'
    });

    console.log(`Défilement: ${direction}`);
}

function setScrollingEnabled(enabled) {
    document.body.style.overflow = enabled ? 'auto' : 'hidden';
}

document.dispatchEvent(new CustomEvent('resourceLoaded', { detail: { name: 'handDetection' } }));
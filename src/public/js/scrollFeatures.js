/**
 * Fonctionnalités de défilement
 */

function detectScrollGesture() {
    if (hands.length === 0 || activeHandId === null) {
        isPinching = false;
        previousPinchPosition = null;
        return;
    }

    const activeHand = hands.find(hand => hand.handedness === activeHandId);

    if (!activeHand || !activeHand.keypoints || activeHand.keypoints.length < 21) return;

    const thumb = activeHand.keypoints[4];
    const index = activeHand.keypoints[8];

    if (!thumb || !index) return;

    const pinchDistance = dist(thumb.x, thumb.y, index.x, index.y);
    const pinchPosition = {
        x: (thumb.x + index.x) / 2,
        y: (thumb.y + index.y) / 2
    };
    if (pinchDistance < pinchThreshold) {
        if (!isPinching) {
            isPinching = true;
            previousPinchPosition = pinchPosition;
        } else if (previousPinchPosition) {
            const verticalMovement = pinchPosition.y - previousPinchPosition.y;
            const currentTime = millis();
            if (Math.abs(verticalMovement) > scrollThreshold &&
                currentTime - lastScrollTime > scrollDebounce) {
                triggerScroll(verticalMovement > 0 ? 'down' : 'up');
                lastScrollTime = currentTime;
                previousPinchPosition = pinchPosition;
            }
        }
    } else {
        isPinching = false;
        previousPinchPosition = null;
    }
}

function triggerScroll(direction) {
    const scrollDistance = direction === 'down' ? 300 : -300;

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
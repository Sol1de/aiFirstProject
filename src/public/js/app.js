/**
 * Application principale - intègre tous les modules
 */

function preload() {
    handPose = ml5.handPose();
}

function setup() {
    createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
    handPose.detectStart(video, gotHands);
    resetGestureStates();
    document.addEventListener('dblclick', resetZoom);
}

function draw() {
    image(video, 0, 0, width, height);
    drawHandPoints();
    updateZoom();

    if (hands.length === 2) {
        detectTwoHandsZoomGesture();
    } else if (hands.length === 1) {
        detectScrollGesture();
        detectSingleHandZoomGestures();
    }

    drawGestureInstructions();

    if (debugMode) {
        displayDebugInfo();
    }
}

function resetZoom() {
    if (currentZoomIndex !== 0) {
        startZoomAnimation(currentZoomLevel, zoomLevels[0]);
        currentZoomIndex = 0;
    }
    setScrollingEnabled(true);
    console.log("Réinitialisation du zoom");
    return false;
}

function windowResized() {
    resizeCanvas(640, 480);
}

function cleanup() {
    document.body.style.transform = 'scale(1)';
    document.body.style.minHeight = '100vh';
    document.body.style.minWidth = '100vw';
}

window.addEventListener('beforeunload', cleanup);

function keyPressed() {
    if (key === 'd' || key === 'D') {
        debugMode = !debugMode;
        console.log("Mode debug:", debugMode ? "activé" : "désactivé");
    }
}

document.dispatchEvent(new CustomEvent('resourceLoaded', { detail: { name: 'handDetection' } }));
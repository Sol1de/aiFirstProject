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

    // Démarrer la détection de main
    handPose.detectStart(video, gotHands);

    // Initialiser les états des gestes
    resetGestureStates();

    // Activer le double-clic pour réinitialiser le zoom
    document.addEventListener('dblclick', resetZoom);
}

function draw() {
    // Afficher la vidéo
    image(video, 0, 0, width, height);

    // Dessiner les points de la main
    drawHandPoints();

    // Animer et mettre à jour le zoom
    updateZoom();

    // Détecter les gestes selon le nombre de mains
    if (hands.length === 2) {
        // Priorité au zoom à deux mains
        detectTwoHandsZoomGesture();
    } else if (hands.length === 1) {
        // Gestes à une main
        detectScrollGesture();      // Défilement
        detectSingleHandZoomGestures();  // Zoom/dézoom
    }

    // Afficher les instructions
    drawGestureInstructions();

    // Afficher les informations de débogage
    if (debugMode) {
        displayDebugInfo();
    }
}

function resetZoom() {
    // Réinitialiser à 100% avec animation
    if (currentZoomIndex !== 0) {
        startZoomAnimation(currentZoomLevel, zoomLevels[0]);
        currentZoomIndex = 0;
    }
    setScrollingEnabled(true);
    console.log("Réinitialisation du zoom");
    return false; // Empêcher le comportement par défaut
}

// Nettoyer lors de la fermeture de la page
function windowResized() {
    // Ajuster le canvas si nécessaire
    resizeCanvas(640, 480);
}

// Fonction de nettoyage en quittant la page
function cleanup() {
    document.body.style.transform = 'scale(1)';
    document.body.style.minHeight = '100vh';
    document.body.style.minWidth = '100vw';
}

// Ajouter un gestionnaire pour nettoyer
window.addEventListener('beforeunload', cleanup);

// Gestionnaire pour la touche 'D' (activer/désactiver le mode debug)
function keyPressed() {
    if (key === 'd' || key === 'D') {
        debugMode = !debugMode;
        console.log("Mode debug:", debugMode ? "activé" : "désactivé");
    }
}

document.dispatchEvent(new CustomEvent('resourceLoaded', { detail: { name: 'handDetection' } }));
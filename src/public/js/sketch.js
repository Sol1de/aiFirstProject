/*
 * ML5.js HandPose avec geste de scroll simple
 */

let handPose;
let video;
let hands = [];

// Variables pour le suivi des gestes
let isPinching = false;
let previousPinchPosition = null;
let scrollThreshold = 15;
let pinchThreshold = 20;
let debugMode = true;
let scrollDebounce = 500; // ms entre les déclenchements de scroll
let lastScrollTime = 0;

// Variables pour la gestion des mains multiples
let activeHandId = null;
let handDetectionTimes = {};

function preload() {
    handPose = ml5.handPose();
}

function setup() {
    createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
    handPose.detectStart(video, gotHands);
}

function draw() {
    // Afficher la vidéo
    image(video, 0, 0, width, height);

    // Dessiner les points de la main
    for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];
        const isActiveHand = (activeHandId === null) || (hand.handedness === activeHandId);

        for (let j = 0; j < hand.keypoints.length; j++) {
            let keypoint = hand.keypoints[j];
            const invertedX = width - keypoint.x;

            if (isActiveHand) {
                fill(0, 255, 0);
                noStroke();
                circle(invertedX, keypoint.y, 10);
            } else {
                fill(100, 200, 100, 150);
                noStroke();
                circle(invertedX, keypoint.y, 8);
            }
        }
    }

    // Détecter les gestes de scroll
    detectScrollGesture();

    if (debugMode) {
        displayDebugInfo();
    }
}

// Callback function for when handPose outputs data
function gotHands(results) {
    // Vérifier si de nouvelles mains apparaissent
    const currentHandIds = new Set(results.map(hand => hand.handedness));
    const previousHandIds = new Set(hands.map(hand => hand.handedness));

    // Pour chaque nouvelle main détectée, enregistrer son temps d'apparition
    results.forEach(hand => {
        if (!previousHandIds.has(hand.handedness)) {
            handDetectionTimes[hand.handedness] = millis();
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
    }

    // save the output to the hands variable
    hands = results;
}

// Déterminer quelle main doit être active
function determineActiveHand(handsList) {
    if (handsList.length === 0) return;

    if (handsList.length === 1) {
        // S'il n'y a qu'une main, elle devient active
        activeHandId = handsList[0].handedness;
    } else {
        // S'il y a deux mains qui apparaissent en même temps
        const rightHand = handsList.find(hand => hand.handedness === 'Right');
        const leftHand = handsList.find(hand => hand.handedness === 'Left');

        if (rightHand && leftHand) {
            const timeDifference = Math.abs(handDetectionTimes['Right'] - handDetectionTimes['Left']);

            if (timeDifference < 500) {
                // Si les deux mains apparaissent presque simultanément, priorité à la main droite
                activeHandId = 'Right';
            } else {
                // Sinon, priorité à la main qui est apparue en premier
                activeHandId = handDetectionTimes['Right'] < handDetectionTimes['Left'] ? 'Right' : 'Left';
            }
        } else if (rightHand) {
            activeHandId = 'Right';
        } else if (leftHand) {
            activeHandId = 'Left';
        }
    }
}

// Détecter le geste de scroll
function detectScrollGesture() {
    if (hands.length === 0 || activeHandId === null) {
        previousPinchPosition = null;
        isPinching = false;
        return;
    }

    // Trouver la main active
    const activeHand = hands.find(hand => hand.handedness === activeHandId);
    if (!activeHand) return;

    // Vérifier si un pincement est en cours (pouce et index proches)
    const thumb = activeHand.keypoints[4];
    const index = activeHand.keypoints[8];
    const pinchDistance = dist(thumb.x, thumb.y, index.x, index.y);

    // Position moyenne entre le pouce et l'index (pour le scroll)
    const pinchPosition = {
        x: (thumb.x + index.x) / 2,
        y: (thumb.y + index.y) / 2
    };

    // Détecter le pincement (pouce et index proches)
    if (pinchDistance < pinchThreshold) {
        if (!isPinching) {
            // Début du pincement
            isPinching = true;
            previousPinchPosition = pinchPosition;
        } else {
            // Pincement en cours
            // Vérifier s'il s'agit d'un scroll
            if (previousPinchPosition) {
                const verticalMovement = pinchPosition.y - previousPinchPosition.y;

                // Si le mouvement vertical dépasse le seuil, déclencher un scroll
                const currentTime = millis();
                if (Math.abs(verticalMovement) > scrollThreshold &&
                    currentTime - lastScrollTime > scrollDebounce) {

                    // Scroll (positif pour descendre, négatif pour monter)
                    triggerSweetScroll(verticalMovement > 0 ? 'down' : 'up');

                    // Mettre à jour le temps du dernier scroll
                    lastScrollTime = currentTime;

                    // Mettre à jour la position précédente
                    previousPinchPosition = pinchPosition;
                }
            }
        }
    } else {
        // Fin du pincement
        isPinching = false;
        previousPinchPosition = null;
    }
}

// Déclencher le scroll avec SweetScroll
function triggerSweetScroll(direction) {
    console.log(`Déclenchement scroll: ${direction}`);

    // Option 1: Scroll d'une distance fixe
    const scrollDistance = direction === 'down' ? 500 : -500;

    // Pour le test, on utilise le scroll standard du navigateur
    window.scrollBy({
        top: scrollDistance,
        behavior: 'smooth'
    });

    // Avec SweetScroll (à décommenter et adapter)
    /*
    if (window.sweetScroll) {
        // Pour scroll relatif à la position actuelle
        window.sweetScroll.to(scrollDistance, {
            relative: true
        });

        // OU pour scroll vers des sections spécifiques
        // const targetSection = direction === 'down' ? '#section-next' : '#section-prev';
        // window.sweetScroll.to(targetSection);
    }
    */
}

// Afficher les informations de débogage
function displayDebugInfo() {
    fill(255);
    noStroke();
    textSize(16);
    textAlign(LEFT);

    let y = 30;
    const lineHeight = 24;

    text(`Nombre de mains: ${hands.length}`, 20, y);
    y += lineHeight;

    text(`Main active: ${activeHandId || 'Aucune'}`, 20, y);
    y += lineHeight;

    if (hands.length > 0) {
        const activeHand = hands.find(h => h.handedness === activeHandId) || hands[0];
        const thumb = activeHand.keypoints[4];
        const index = activeHand.keypoints[8];
        const pinchDistance = dist(thumb.x, thumb.y, index.x, index.y);

        text(`Distance pouce-index: ${pinchDistance.toFixed(1)}`, 20, y);
        y += lineHeight;

        text(`Pincement: ${isPinching ? 'Oui' : 'Non'}`, 20, y);
        y += lineHeight;

        if (isPinching && previousPinchPosition) {
            const pinchPosition = {
                x: (thumb.x + index.x) / 2,
                y: (thumb.y + index.y) / 2
            };

            const verticalMovement = pinchPosition.y - previousPinchPosition.y;
            text(`Mouvement vertical: ${verticalMovement.toFixed(1)}`, 20, y);
            y += lineHeight;
        }
    }
}
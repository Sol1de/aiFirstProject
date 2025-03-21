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
let scrollDebounce = 1000; // ms entre les déclenchements de scroll
let lastScrollTime = 0;
let isZooming = false;
let initialPinchDistance = 0;
let currentZoomLevel = 1.0;
let zoomThreshold = 5; // Seuil de mouvement pour déclencher un zoom
let zoomDebounce = 100; // Intervalle minimal entre chaque mise à jour du zoom
let lastZoomTime = 0;
let zoomSensitivity = 0.0008;
let maxZoom = 3.0;
let minZoom = 0.5;
let targetZoomLevel = 1.0;    // Niveau de zoom cible
let zoomLerpFactor = 0.15;    // Facteur de lissage (0-1)
let lastPinchDistance = 0;    // Stocke la dernière distance entre les doigts
let pinchHistorySize = 3;     // Nombre de positions à conserver pour lissage
let pinchDistanceHistory = []; // Historique des distances pour lissage
let zoomCenterX = 0.5;        // Point central du zoom (X) - relatif à la fenêtre
let zoomCenterY = 0.0;        // Point central du zoom (Y) - relatif à la fenêtre
let initialScrollX = 0;
let initialScrollY = 0;
let zoomLevels = [1.0, 1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0]; // Paliers de zoom disponibles
let currentZoomIndex = 0;                // Index du niveau de zoom actuel
let zoomStepDebounce = 500;              // Délai minimal entre chaque changement de palier (ms)
let lastZoomStepTime = 0;                // Horodatage du dernier changement de palier
let zoomAnimationDuration = 500;         // Durée de l'animation de zoom (ms)
let zoomAnimationStartTime = 0;          // Horodatage du début de l'animation
let zoomAnimationStartLevel = 1.0;       // Niveau de zoom au début de l'animation
let zoomAnimationEndLevel = 1.0;         // Niveau de zoom cible de l'animation
let isZoomAnimating = false;             // Indique si une animation de zoom est en cours
let zoomDirection = 0;

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

// Modifiez la fonction draw pour inclure la mise à jour du zoom
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

    // Mettre à jour le zoom progressivement
    updateZoom();

    // Détecter les gestes
    if (hands.length === 2) {
        // Si deux mains sont présentes, priorité au zoom
        detectZoomGesture();
    } else {
        // Sinon, scroll avec une seule main
        detectScrollGesture();
    }

    if (debugMode) {
        displayDebugInfo();
    }
}

function detectZoomGesture() {
    // Vérifier s'il y a deux mains
    if (hands.length < 2) {
        if (isZooming) {
            isZooming = false;
            setScrollingEnabled(true);
            pinchDistanceHistory = [];
        }
        return;
    }

    // Récupérer les mains droite et gauche
    const rightHand = hands.find(hand => hand.handedness === 'Right');
    const leftHand = hands.find(hand => hand.handedness === 'Left');

    if (!rightHand || !leftHand) return;

    // Vérifier si les deux mains font un pincement (pouce et index proches)
    const rightThumb = rightHand.keypoints[4];
    const rightIndex = rightHand.keypoints[8];
    const leftThumb = leftHand.keypoints[4];
    const leftIndex = leftHand.keypoints[8];

    const rightPinchDistance = dist(rightThumb.x, rightThumb.y, rightIndex.x, rightIndex.y);
    const leftPinchDistance = dist(leftThumb.x, leftThumb.y, leftIndex.x, leftIndex.y);

    // Considérer que le pincement est actif si les deux distances sont inférieures au seuil
    const bothPinching = rightPinchDistance < pinchThreshold && leftPinchDistance < pinchThreshold;

    if (bothPinching) {
        // Calculer le point central de chaque pincement
        const rightCenter = {
            x: (rightThumb.x + rightIndex.x) / 2,
            y: (rightThumb.y + rightIndex.y) / 2
        };

        const leftCenter = {
            x: (leftThumb.x + leftIndex.x) / 2,
            y: (leftThumb.y + leftIndex.y) / 2
        };

        // Calculer le point central entre les deux mains
        const midPoint = {
            x: (rightCenter.x + leftCenter.x) / 2,
            y: (rightCenter.y + leftCenter.y) / 2
        };

        // Convertir les coordonnées pour la vidéo inversée
        const invertedMidPointX = width - midPoint.x;

        // Calculer la position relative dans la fenêtre (en pourcentage)
        zoomCenterX = invertedMidPointX / width;
        zoomCenterY = midPoint.y / height;

        // Calculer la distance entre les deux points de pincement
        const currentPinchDistance = dist(rightCenter.x, rightCenter.y, leftCenter.x, leftCenter.y);

        // Ajouter à l'historique des distances pour lissage
        pinchDistanceHistory.push(currentPinchDistance);

        // Limiter la taille de l'historique
        if (pinchDistanceHistory.length > pinchHistorySize) {
            pinchDistanceHistory.shift();
        }

        // Calculer la moyenne des distances récentes
        const avgPinchDistance = pinchDistanceHistory.reduce((sum, val) => sum + val, 0) / pinchDistanceHistory.length;

        if (!isZooming) {
            // Début du geste de zoom
            isZooming = true;
            setScrollingEnabled(false);
            initialPinchDistance = avgPinchDistance;
            lastPinchDistance = avgPinchDistance;

            // Mémoriser la position de scroll actuelle
            saveScrollPosition();
        } else {
            // Geste de zoom en cours
            const pinchDelta = avgPinchDistance - lastPinchDistance;

            // Si le mouvement dépasse le seuil et le temps minimal est écoulé
            const currentTime = millis();
            if (Math.abs(pinchDelta) > zoomThreshold &&
                currentTime - lastZoomStepTime > zoomStepDebounce) {

                // Déterminer la direction du zoom (éloignement ou rapprochement)
                const newZoomDirection = pinchDelta > 0 ? 1 : -1;

                // Si la direction a changé, réinitialiser la distance de référence
                if (newZoomDirection !== zoomDirection) {
                    lastPinchDistance = avgPinchDistance;
                    zoomDirection = newZoomDirection;
                    return;
                }

                // Changer le niveau de zoom par palier
                if (pinchDelta > 0) {
                    // Zoom in - passer au palier supérieur
                    if (currentZoomIndex < zoomLevels.length - 1) {
                        startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
                        currentZoomIndex++;
                    }
                } else {
                    // Zoom out - passer au palier inférieur
                    if (currentZoomIndex > 0) {
                        startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
                        currentZoomIndex--;
                    }
                }

                // Mettre à jour le temps du dernier changement de palier
                lastZoomStepTime = currentTime;

                // Mettre à jour la distance de référence
                lastPinchDistance = avgPinchDistance;
            }
        }
    } else {
        // Fin du geste de zoom
        if (isZooming) {
            isZooming = false;
            setScrollingEnabled(true);
            pinchDistanceHistory = [];
        }
    }
}

function saveScrollPosition() {
    initialScrollX = window.scrollX;
    initialScrollY = window.scrollY;
}

function applyZoom(zoomFactor) {
    // Calculer le niveau de zoom cible (pas de mise à jour directe)
    targetZoomLevel *= zoomFactor;

    // Limiter le zoom aux valeurs min et max
    targetZoomLevel = constrain(targetZoomLevel, minZoom, maxZoom);

    console.log(`Nouveau zoom cible: ${targetZoomLevel.toFixed(2)}x`);
}

function setScrollingEnabled(enabled) {
    if (enabled) {
        // Réactiver le scroll
        document.body.style.overflow = 'auto';
    } else {
        // Désactiver le scroll
        document.body.style.overflow = 'hidden';
    }
}

function startZoomAnimation(startLevel, endLevel) {
    zoomAnimationStartTime = millis();
    zoomAnimationStartLevel = startLevel;
    zoomAnimationEndLevel = endLevel;
    isZoomAnimating = true;
    console.log(`Animation de zoom: ${startLevel.toFixed(2)}x → ${endLevel.toFixed(2)}x`);
}

function updateZoom() {
    if (isZoomAnimating) {
        // Calculer la progression de l'animation (0 à 1)
        const currentTime = millis();
        const elapsed = currentTime - zoomAnimationStartTime;
        const progress = constrain(elapsed / zoomAnimationDuration, 0, 1);

        // Appliquer une courbe d'accélération-décélération (easeInOutCubic)
        let easedProgress;
        if (progress < 0.5) {
            easedProgress = 4 * progress * progress * progress;
        } else {
            const f = progress - 1;
            easedProgress = 1 + 4 * f * f * f;
        }

        // Interpoler entre les niveaux de zoom de départ et d'arrivée
        currentZoomLevel = zoomAnimationStartLevel + (zoomAnimationEndLevel - zoomAnimationStartLevel) * easedProgress;

        // Appliquer le zoom
        applyCurrentZoom();

        // Vérifier si l'animation est terminée
        if (progress >= 1) {
            isZoomAnimating = false;
            currentZoomLevel = zoomAnimationEndLevel;
            applyCurrentZoom();
        }
    }
}

function applyCurrentZoom() {
    // Appliquer le zoom avec un point d'origine spécifique
    document.body.style.transformOrigin = `${zoomCenterX * 100}% ${zoomCenterY * 100}%`;
    document.body.style.transform = `scale(${currentZoomLevel})`;

    // Ajuster l'espace de la page pour éviter les problèmes de scroll
    if (currentZoomLevel > 1) {
        document.body.style.minHeight = `${100 * currentZoomLevel}vh`;
        document.body.style.minWidth = `${100 * currentZoomLevel}vw`;
    } else {
        document.body.style.minHeight = '100vh';
        document.body.style.minWidth = '100vw';
    }
}

function adjustScrollToMaintainFocus(zoomRatio) {
    // Calcul du point focal en pixels absolus
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position du point focal par rapport à la fenêtre visible
    const focalPointX = zoomCenterX * viewportWidth;
    const focalPointY = zoomCenterY * viewportHeight;

    // Position absolue du point focal dans le document
    const absoluteFocalX = initialScrollX + focalPointX;
    const absoluteFocalY = initialScrollY + focalPointY;

    // Calculer la nouvelle position de défilement pour maintenir le point focal
    // quand le zoom change
    const newScrollX = absoluteFocalX * zoomRatio - focalPointX;
    const newScrollY = absoluteFocalY * zoomRatio - focalPointY;

    // Appliquer le nouveau défilement
    if (!isNaN(newScrollX) && !isNaN(newScrollY)) {
        window.scrollTo(newScrollX, newScrollY);
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

    // Inverser la direction du scroll
    const scrollDistance = direction === 'down' ? -500 : 500;

    // Pour le test, on utilise le scroll standard du navigateur
    window.scrollBy({
        top: scrollDistance,
        behavior: 'smooth'
    });

    // Avec SweetScroll (à décommenter et adapter)
    /*
    if (window.sweetScroll) {
        // Pour scroll relatif à la position actuelle avec direction inversée
        window.sweetScroll.to(scrollDistance, {
            relative: true
        });

        // OU pour scroll vers des sections spécifiques avec direction inversée
        // const targetSection = direction === 'down' ? '#section-prev' : '#section-next';
        // window.sweetScroll.to(targetSection);
    }
    */
}

function cleanup() {
    setScrollingEnabled(true);
    document.body.style.transform = 'scale(1)';
    document.body.style.minHeight = '100%';
    document.body.style.minWidth = '100%';
    document.body.style.transformOrigin = '50% 0%';
    currentZoomLevel = 1.0;
    currentZoomIndex = 0;
    isZoomAnimating = false;

    // Réinitialiser la position de défilement
    window.scrollTo(0, 0);
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

    text(`Zoom: ${currentZoomLevel.toFixed(2)}x`, 20, y);
    y += lineHeight;

    text(`Zoom actif: ${isZooming ? 'Oui' : 'Non'}`, 20, y);
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

        if (isPinching && previousPinchPosition && hands.length === 1) {
            const pinchPosition = {
                x: (thumb.x + index.x) / 2,
                y: (thumb.y + index.y) / 2
            };

            const verticalMovement = pinchPosition.y - previousPinchPosition.y;
            text(`Mouvement vertical: ${verticalMovement.toFixed(1)}`, 20, y);
            y += lineHeight;
        }
    }

    if (hands.length === 2 && isZooming) {
        const rightHand = hands.find(hand => hand.handedness === 'Right');
        const leftHand = hands.find(hand => hand.handedness === 'Left');

        if (rightHand && leftHand) {
            const rightCenter = {
                x: (rightHand.keypoints[4].x + rightHand.keypoints[8].x) / 2,
                y: (rightHand.keypoints[4].y + rightHand.keypoints[8].y) / 2
            };

            const leftCenter = {
                x: (leftHand.keypoints[4].x + leftHand.keypoints[8].x) / 2,
                y: (leftHand.keypoints[4].y + leftHand.keypoints[8].y) / 2
            };

            const currentDistance = dist(rightCenter.x, rightCenter.y, leftCenter.x, leftCenter.y);
            text(`Distance entre mains: ${currentDistance.toFixed(1)}`, 20, y);
            y += lineHeight;
        }
    }
}

document.addEventListener('dblclick', function() {
    // Réinitialiser à 100% avec animation
    if (currentZoomIndex !== 0) {
        startZoomAnimation(currentZoomLevel, zoomLevels[0]);
        currentZoomIndex = 0;
    }
    setScrollingEnabled(true);
    console.log("Réinitialisation du zoom");
});
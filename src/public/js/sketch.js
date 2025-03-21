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
let pinchThreshold = 30;
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
let zoomStepDebounce = 300;              // Délai minimal entre chaque changement de palier (ms)
let lastZoomStepTime = 0;                // Horodatage du dernier changement de palier
let zoomAnimationDuration = 500;         // Durée de l'animation de zoom (ms)
let zoomAnimationStartTime = 0;          // Horodatage du début de l'animation
let zoomAnimationStartLevel = 1.0;       // Niveau de zoom au début de l'animation
let zoomAnimationEndLevel = 1.0;         // Niveau de zoom cible de l'animation
let isZoomAnimating = false;             // Indique si une animation de zoom est en cours
let zoomDirection = 0;
let singleHandZoomActive = false;  // Si un zoom à une main est en cours
let initialFingerDistance = 0;     // Distance initiale entre le pouce et l'index
let fingerDistanceThreshold = 20;  // Seuil pour déclencher un zoom à une main
let canZoomAgain = true;           // Si un nouveau zoom peut être déclenché
let gestureCompleted = false;
let fullPinchThreshold = 35;  // Distance maximale entre le pouce et les autres doigts pour une pince complète
let fingerPinchCount = 0;
let initialFingerState = null;    // "pinched" ou "spread" ou null
let fingerStateChanging = false;  // Si un changement d'état est en cours
let fingerSpreadThreshold = 150;  // Seuil pour considérer les doigts comme écartés

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

// Fonction pour dessiner les points de la main avec information sur les pincements
function drawHandPoints() {
    if (!hands || hands.length === 0) return;

    for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];
        if (!hand || !hand.keypoints || hand.keypoints.length < 21) continue;

        const isActiveHand = (activeHandId === null) || (hand.handedness === activeHandId);

        if (isActiveHand) {
            // Pour la main active, colorer différemment selon l'état
            const thumb = hand.keypoints[4];
            if (!thumb) continue;

            // Dessiner les connexions de la main avec vérification
            stroke(0, 200, 0, 150);
            strokeWeight(2);

            // Connecter les articulations avec vérification de sécurité
            for (let j = 0; j < 20; j += 4) {
                if (j > 0 && hand.keypoints[j] && hand.keypoints[j+1]) {
                    line(width - hand.keypoints[j].x, hand.keypoints[j].y,
                        width - hand.keypoints[j+1].x, hand.keypoints[j+1].y);
                }
                if (j < 17 && hand.keypoints[j+1] && hand.keypoints[j+5]) {
                    line(width - hand.keypoints[j+1].x, hand.keypoints[j+1].y,
                        width - hand.keypoints[j+5].x, hand.keypoints[j+5].y);
                }
            }

            // Connecter les articulations des doigts avec vérification
            for (let j = 1; j <= 20; j++) {
                if (j % 4 !== 0 && j < 20 && hand.keypoints[j] && hand.keypoints[j+1]) {
                    line(width - hand.keypoints[j].x, hand.keypoints[j].y,
                        width - hand.keypoints[j+1].x, hand.keypoints[j+1].y);
                }
            }

            // Dessiner tous les points avec vérification
            for (let j = 0; j < hand.keypoints.length; j++) {
                let keypoint = hand.keypoints[j];
                if (!keypoint) continue;

                const invertedX = width - keypoint.x;

                // Déterminer si c'est un bout de doigt
                const isFingerTip = [4, 8, 12, 16, 20].includes(j);

                // Dessiner avec une couleur différente selon l'état
                if (isFingerTip) {
                    // Points du bout des doigts
                    if (j === 4) {
                        // Pouce toujours en bleu
                        fill(0, 100, 255);
                        noStroke();
                        circle(invertedX, keypoint.y, 15);
                    } else {
                        // Autres doigts selon leur proximité avec le pouce
                        if (thumb) {
                            const distanceToThumb = dist(thumb.x, thumb.y, keypoint.x, keypoint.y);
                            const isPinching = distanceToThumb < fullPinchThreshold;

                            if (isPinching) {
                                // Doigt qui pince le pouce
                                fill(255, 0, 0);
                                noStroke();
                                circle(invertedX, keypoint.y, 15);
                            } else {
                                // Doigt écarté
                                fill(0, 255, 0);
                                noStroke();
                                circle(invertedX, keypoint.y, 12);
                            }
                        }
                    }
                } else {
                    // Points des articulations
                    fill(0, 200, 0);
                    noStroke();
                    circle(invertedX, keypoint.y, 6);
                }
            }

            // Afficher l'état des doigts
            fill(255);
            noStroke();
            textSize(16);
            textAlign(LEFT);

            if (initialFingerState === "pinched") {
                text("Écarter les doigts pour zoomer", 20, height - 30);
            } else if (initialFingerState === "spread") {
                text("Pincer pour dézoomer", 20, height - 30);
            } else if (fingerPinchCount >= 3) {
                text("Doigts pincés détectés", 20, height - 30);
            } else if (isPinching) {
                text("Mode scroll actif", 20, height - 30);
            }

        } else {
            // Main non active
            for (let j = 0; j < hand.keypoints.length; j++) {
                let keypoint = hand.keypoints[j];
                if (!keypoint) continue;

                const invertedX = width - keypoint.x;

                fill(100, 200, 100, 150);
                noStroke();
                circle(invertedX, keypoint.y, 8);
            }
        }
    }
}

// Modifiez la fonction draw pour inclure la mise à jour du zoom
function draw() {
    // Afficher la vidéo
    image(video, 0, 0, width, height);

    // Dessiner les points de la main avec information visuelle
    drawHandPoints();

    // Mettre à jour le zoom progressivement
    updateZoom();

    // Détecter les gestes en fonction du nombre de mains
    if (hands.length === 2) {
        // Si deux mains sont présentes, priorité au zoom à deux mains
        detectTwoHandsZoomGesture();
    } else if (hands.length === 1) {
        // Avec une seule main, on peut soit scroller soit zoomer
        detectSingleHandGestures();
    }

    if (debugMode) {
        displayDebugInfo();
    }
}

function detectSingleHandGestures() {
    if (hands.length === 0 || activeHandId === null) {
        // Réinitialiser les états
        isPinching = false;
        singleHandZoomActive = false;
        initialFingerState = null;
        previousPinchPosition = null;
        return;
    }

    // Trouver la main active
    const activeHand = hands.find(hand => hand.handedness === activeHandId);
    if (!activeHand || !activeHand.keypoints || activeHand.keypoints.length < 21) return;

    // Points des doigts
    const thumb = activeHand.keypoints[4];
    const index = activeHand.keypoints[8];
    const middle = activeHand.keypoints[12];
    const ring = activeHand.keypoints[16];
    const pinky = activeHand.keypoints[20];

    if (!thumb || !index || !middle || !ring || !pinky) return;

    // Calcul des distances
    const thumbIndexDistance = dist(thumb.x, thumb.y, index.x, index.y);
    const thumbMiddleDistance = dist(thumb.x, thumb.y, middle.x, middle.y);
    const thumbRingDistance = dist(thumb.x, thumb.y, ring.x, ring.y);
    const thumbPinkyDistance = dist(thumb.x, thumb.y, pinky.x, pinky.y);

    // Calcul du centre de la main (pour le point focal du zoom)
    const handCenter = {
        x: (thumb.x + index.x + middle.x + ring.x + pinky.x) / 5,
        y: (thumb.y + index.y + middle.y + ring.y + pinky.y) / 5
    };

    // Définition des positions de zoom à l'écran (inverse l'axe X pour l'effet mirroir)
    zoomCenterX = (width - handCenter.x) / width;
    zoomCenterY = handCenter.y / height;

    // ------- DÉTECTION ZOOM IN (3 doigts pincés puis écartés) -------
    const threeFingersPinched =
        thumbIndexDistance < fullPinchThreshold &&
        thumbMiddleDistance < fullPinchThreshold &&
        thumbRingDistance > fullPinchThreshold;

    // ------- DÉTECTION ZOOM OUT (4 doigts écartés puis pincés) -------
    const fourFingersPinched =
        thumbIndexDistance < fullPinchThreshold &&
        thumbMiddleDistance < fullPinchThreshold &&
        thumbRingDistance < fullPinchThreshold &&
        thumbPinkyDistance > fullPinchThreshold;

    // Calcul de la distance totale de pincement (pour mesurer l'écartement)
    const totalPinchDistance = thumbIndexDistance + thumbMiddleDistance + thumbRingDistance;

    // ------- LOGIQUE DE ZOOM -------

    // Affichage pour le debug - IMPORTANT: GARDEZ CES LOGS ACTIFS
    console.log({
        threeFingersPinched,
        fourFingersPinched,
        totalPinchDistance,
        initialFingerState,
        singleHandZoomActive
    });

    if (!singleHandZoomActive) {
        // INITIALISATION DU ZOOM selon la configuration des doigts
        if (threeFingersPinched) {
            console.log("INIT: Geste de ZOOM IN détecté (3 doigts pincés)");
            singleHandZoomActive = true;
            initialFingerState = "pinched";
            initialFingerDistance = totalPinchDistance;
            saveScrollPosition(); // Sauvegarder la position de défilement
            canZoomAgain = true;
        }
        else if (fourFingersPinched) {
            console.log("INIT: Geste de ZOOM OUT détecté (4 doigts écartés)");
            singleHandZoomActive = true;
            initialFingerState = "spread";
            initialFingerDistance = totalPinchDistance;
            saveScrollPosition(); // Sauvegarder la position de défilement
            canZoomAgain = true;
        }
    }
    else {
        // ZOOM EN COURS - Vérifier les changements

        // Pour ZOOM IN (écartement après pincement)
        if (initialFingerState === "pinched") {
            const distanceDelta = totalPinchDistance - initialFingerDistance;
            console.log(`ZOOM IN: Delta=${distanceDelta}, Seuil=${fingerDistanceThreshold}`);

            // Si l'écartement est suffisant
            if (distanceDelta > fingerDistanceThreshold && canZoomAgain) {
                console.log("EXÉCUTION: ZOOM IN");

                // Déclencher le zoom
                if (currentZoomIndex < zoomLevels.length - 1) {
                    startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
                    currentZoomIndex++;

                    // Bloquer temporairement pour éviter les déclenchements multiples
                    canZoomAgain = false;
                    setTimeout(() => {
                        canZoomAgain = true;
                        console.log("Zoom réactivé");
                    }, 700);
                }
            }
        }

        // Pour ZOOM OUT (pincement après écartement)
        else if (initialFingerState === "spread") {
            const distanceDelta = initialFingerDistance - totalPinchDistance;
            console.log(`ZOOM OUT: Delta=${distanceDelta}, Seuil=${fingerDistanceThreshold}`);

            // Si le pincement est suffisant
            if (distanceDelta > fingerDistanceThreshold && canZoomAgain) {
                console.log("EXÉCUTION: ZOOM OUT");

                // Déclencher le dézoom
                if (currentZoomIndex > 0) {
                    startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
                    currentZoomIndex--;

                    // Bloquer temporairement
                    canZoomAgain = false;
                    setTimeout(() => {
                        canZoomAgain = true;
                        console.log("Dézoom réactivé");
                    }, 700);
                }
            }
        }

        // Réinitialiser si les conditions de base ne sont plus remplies
        if ((!threeFingersPinched && initialFingerState === "pinched") ||
            (!fourFingersPinched && initialFingerState === "spread")) {
            console.log("RESET: Conditions de zoom non remplies");
            singleHandZoomActive = false;
            initialFingerState = null;
        }
    }

    // ------- SCROLL (si aucun zoom n'est actif) -------
    if (!singleHandZoomActive) {
        // Position moyenne pour le pincement index-pouce
        const pinchPosition = {
            x: (thumb.x + index.x) / 2,
            y: (thumb.y + index.y) / 2
        };

        // Détecter le pincement simple (pouce-index) pour le scroll
        if (thumbIndexDistance < pinchThreshold &&
            thumbMiddleDistance > fullPinchThreshold &&
            thumbRingDistance > fullPinchThreshold) {

            if (!isPinching) {
                // Début du pincement
                isPinching = true;
                previousPinchPosition = pinchPosition;
            } else if (previousPinchPosition) {
                // Calculer mouvement vertical
                const verticalMovement = pinchPosition.y - previousPinchPosition.y;

                // Déclencher le scroll si mouvement suffisant
                const currentTime = millis();
                if (Math.abs(verticalMovement) > scrollThreshold &&
                    currentTime - lastScrollTime > scrollDebounce) {

                    triggerSweetScroll(verticalMovement > 0 ? 'down' : 'up');
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
}

function detectTwoHandsZoomGesture() {
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

    if (!rightHand || !leftHand || !rightHand.keypoints || !leftHand.keypoints) return;

    // Vérifier si les deux mains font un pincement
    const rightThumb = rightHand.keypoints[4];
    const rightIndex = rightHand.keypoints[8];
    const leftThumb = leftHand.keypoints[4];
    const leftIndex = leftHand.keypoints[8];

    // Vérifier que tous les points nécessaires sont définis
    if (!rightThumb || !rightIndex || !leftThumb || !leftIndex) return;

    const rightPinchDistance = dist(rightThumb.x, rightThumb.y, rightIndex.x, rightIndex.y);
    const leftPinchDistance = dist(leftThumb.x, leftThumb.y, leftIndex.x, leftIndex.y);

    // Les deux mains doivent pincer
    const bothPinching = rightPinchDistance < pinchThreshold && leftPinchDistance < pinchThreshold;

    if (bothPinching) {
        // Calculer les centres de pincement
        const rightCenter = {
            x: (rightThumb.x + rightIndex.x) / 2,
            y: (rightThumb.y + rightIndex.y) / 2
        };

        const leftCenter = {
            x: (leftThumb.x + leftIndex.x) / 2,
            y: (leftThumb.y + leftIndex.y) / 2
        };

        // Point central pour le zoom
        const midPoint = {
            x: (rightCenter.x + leftCenter.x) / 2,
            y: (rightCenter.y + leftCenter.y) / 2
        };

        // Inverser horizontalement
        const invertedMidPointX = width - midPoint.x;

        // Position relative pour le zoom
        zoomCenterX = invertedMidPointX / width;
        zoomCenterY = midPoint.y / height;

        // Distance entre les points de pincement
        const currentPinchDistance = dist(rightCenter.x, rightCenter.y, leftCenter.x, leftCenter.y);

        // Historique pour le lissage
        pinchDistanceHistory.push(currentPinchDistance);
        if (pinchDistanceHistory.length > pinchHistorySize) {
            pinchDistanceHistory.shift();
        }
        const avgPinchDistance = pinchDistanceHistory.reduce((sum, val) => sum + val, 0) / pinchDistanceHistory.length;

        if (!isZooming) {
            // Début du zoom à deux mains
            isZooming = true;
            setScrollingEnabled(false);
            initialPinchDistance = avgPinchDistance;
            lastPinchDistance = avgPinchDistance;
            saveScrollPosition();

            // Réinitialiser la gestuelle complète
            gestureCompleted = false;

            // Autoriser un nouveau zoom
            canZoomAgain = true;
        } else {
            // Zoom en cours
            const pinchDelta = avgPinchDistance - initialPinchDistance;

            // Déterminer si on zoome ou dézoome en fonction de la direction du mouvement
            // mais seulement une fois par geste
            if (Math.abs(pinchDelta) > zoomThreshold * 3 && canZoomAgain) {
                if (pinchDelta > 0) {
                    // Zoom avant
                    if (currentZoomIndex < zoomLevels.length - 1) {
                        startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex + 1]);
                        currentZoomIndex++;
                    }
                } else {
                    // Zoom arrière
                    if (currentZoomIndex > 0) {
                        startZoomAnimation(zoomLevels[currentZoomIndex], zoomLevels[currentZoomIndex - 1]);
                        currentZoomIndex--;
                    }
                }

                // Bloquer tout nouveau zoom tant qu'on n'a pas relâché puis pincé à nouveau
                canZoomAgain = false;
                gestureCompleted = true;
            }
        }
    } else {
        // Fin du geste de zoom
        if (isZooming) {
            isZooming = false;
            setScrollingEnabled(true);
            pinchDistanceHistory = [];

            // Si les mains ne pincent plus du tout, on peut considérer que
            // la gestuelle est terminée et réinitialiser
            gestureCompleted = false;
        }
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

function drawGestureStatus() {
    const textY = height - 30;
    fill(255);
    strokeWeight(2);
    stroke(0);
    textSize(18);
    textAlign(CENTER);

    let statusText = "";

    if (initialFingerState === "pinched") {
        statusText = "✋ ZOOM IN: Écartez les doigts";
        fill(0, 255, 0);
    } else if (initialFingerState === "spread") {
        statusText = "✋ ZOOM OUT: Pincez les doigts";
        fill(255, 200, 0);
    } else if (isPinching) {
        statusText = "☝️ SCROLL: Déplacez vers haut/bas";
        fill(0, 200, 255);
    }

    if (statusText) {
        text(statusText, width/2, textY);
    }

    // Afficher le niveau de zoom actuel
    fill(255);
    text(`Zoom: ${currentZoomLevel.toFixed(2)}x`, width/2, textY - 30);
}

function saveScrollPosition() {
    initialScrollX = window.scrollX || window.pageXOffset;
    initialScrollY = window.scrollY || window.pageYOffset;
    console.log(`Position de scroll sauvegardée: (${initialScrollX}, ${initialScrollY})`);
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
    console.log(`Animation de zoom: ${startLevel.toFixed(2)} → ${endLevel.toFixed(2)}`);

    // Sauvegarder les positions de départ et d'arrivée
    zoomAnimationStartLevel = startLevel;
    zoomAnimationEndLevel = endLevel;

    // Marquer le début de l'animation
    zoomAnimationStartTime = millis();
    isZoomAnimating = true;

    // Jouer le son de feedback (optionnel)
    if (endLevel > startLevel) {
        // Son de zoom in
        console.log("Zoom IN");
    } else {
        // Son de zoom out
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

    // Interpoler entre les niveaux de zoom de départ et d'arrivée
    currentZoomLevel = zoomAnimationStartLevel + (zoomAnimationEndLevel - zoomAnimationStartLevel) * easedProgress;

    // Appliquer le zoom
    applyCurrentZoom();

    // Vérifier si l'animation est terminée
    if (progress >= 1) {
        isZoomAnimating = false;
        currentZoomLevel = zoomAnimationEndLevel;
        applyCurrentZoom();
        console.log(`Animation terminée: Zoom=${currentZoomLevel.toFixed(2)}x`);
    }
}

function applyCurrentZoom() {
    // Appliquer le zoom avec un point d'origine spécifique
    console.log(`Applying zoom: ${currentZoomLevel.toFixed(2)}x at (${zoomCenterX.toFixed(2)}, ${zoomCenterY.toFixed(2)})`);
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

    // Distance de défilement - ajustez selon vos besoins
    const scrollDistance = direction === 'down' ? 300 : -300;

    // Activer temporairement le scroll si nécessaire
    const wasDisabled = document.body.style.overflow === 'hidden';
    if (wasDisabled) document.body.style.overflow = 'auto';

    // Effectuer le scroll
    window.scrollBy({
        top: scrollDistance,
        behavior: 'smooth'
    });

    // Remettre le scroll dans son état précédent si nécessaire
    if (wasDisabled) {
        setTimeout(() => {
            document.body.style.overflow = 'hidden';
        }, 500); // Délai pour permettre au scroll de s'effectuer
    }
}

function cleanup() {
    setScrollingEnabled(true); // Réactiver le scroll
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

    if (initialFingerState === "pinched") {
        text("⬆️ ZOOM: Écarter les doigts pour zoomer", 20, y);
    } else if (initialFingerState === "spread") {
        text("⬇️ DÉZOOM: Pincer pour dézoomer", 20, y);
    } else if (isPinching) {
        text("🔄 SCROLL: Déplacer la main vers le haut/bas", 20, y);
    } else {
        text("En attente d'un geste...", 20, y);
    }
    y += lineHeight;

    text(`Zoom: ${currentZoomLevel.toFixed(2)}x`, 20, y);
    y += lineHeight;
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
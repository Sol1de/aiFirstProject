/**
 * Fonctions de visualisation et d'interface utilisateur
 */

function drawHandPoints() {
    if (!hands || hands.length === 0) return;

    for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];
        if (!hand || !hand.keypoints || hand.keypoints.length < 21) continue;

        const isActiveHand = (activeHandId === null) || (hand.handedness === activeHandId);

        if (isActiveHand) {
            // Pour la main active, colorer différemment selon l'état
            const palm = hand.keypoints[0];
            const thumb = hand.keypoints[4];
            if (!thumb || !palm) continue;

            // Dessiner les connexions de la main
            stroke(0, 200, 0, 150);
            strokeWeight(2);

            // Connecter les articulations
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

            // Connecter les articulations des doigts
            for (let j = 1; j <= 20; j++) {
                if (j % 4 !== 0 && j < 20 && hand.keypoints[j] && hand.keypoints[j+1]) {
                    line(width - hand.keypoints[j].x, hand.keypoints[j].y,
                        width - hand.keypoints[j+1].x, hand.keypoints[j+1].y);
                }
            }

            // Dessiner tous les points avec couleur selon l'état
            for (let j = 0; j < hand.keypoints.length; j++) {
                let keypoint = hand.keypoints[j];
                if (!keypoint) continue;

                const invertedX = width - keypoint.x;

                // Si c'est la paume, la colorier selon l'état du poing
                if (j === 0) {
                    if (isFistClosed) {
                        fill(255, 0, 0); // Rouge pour poing fermé
                    } else {
                        fill(0, 255, 0); // Vert pour poing ouvert
                    }
                    noStroke();
                    circle(invertedX, keypoint.y, 20);
                    continue;
                }

                // Déterminer si c'est un bout de doigt
                const isFingerTip = [4, 8, 12, 16, 20].includes(j);

                // Dessiner avec une couleur différente selon l'état
                if (isFingerTip) {
                    // Points du bout des doigts
                    if (j === 4) {
                        // Pouce en bleu
                        fill(0, 100, 255);
                        noStroke();
                        circle(invertedX, keypoint.y, 12);
                    } else if (j === 12 && gesturePhase === 'spreading') {
                        // Majeur spécial pour zoom in
                        fill(255, 255, 0); // Jaune vif
                        noStroke();
                        circle(invertedX, keypoint.y, 14);
                    } else if (j === 16 && gesturePhase === 'start-zoom-out') {
                        // Annulaire spécial pour zoom out
                        fill(255, 100, 255); // Rose vif
                        noStroke();
                        circle(invertedX, keypoint.y, 14);
                    } else {
                        // Autres doigts
                        if (isFistClosed) {
                            // Doigts en rouge pour poing fermé
                            fill(255, 50, 50);
                        } else {
                            // Doigts en vert pour poing ouvert
                            fill(50, 255, 50);
                        }
                        noStroke();
                        circle(invertedX, keypoint.y, 12);
                    }
                } else {
                    // Points des articulations
                    fill(0, 200, 0);
                    noStroke();
                    circle(invertedX, keypoint.y, 6);
                }
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

function drawGestureInstructions() {
    // Fond semi-transparent
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, height - 60, width, 60);

    // Texte d'instructions
    fill(255);
    textSize(16);
    textAlign(CENTER);

    const textY = height - 22;

    if (hands.length === 0) {
        text("Montrez vos mains à la caméra", width/2, textY);
    } else if (hands.length === 2) {
        text("Deux mains: Pincez pouce-index des deux mains et écartez pour zoomer", width/2, textY);
    } else if (gesturePhase === 'start-zoom-in') {
        fill(255, 255, 0);
        text("✨ ZOOM IN: Écartez le pouce et le majeur", width/2, textY);
    } else if (gesturePhase === 'spreading') {
        fill(255, 255, 0);
        text("✨ ZOOM IN: Continuez à écarter pour zoomer davantage", width/2, textY);
    } else if (gesturePhase === 'start-zoom-out') {
        fill(255, 150, 150);
        text("✨ ZOOM OUT: Rapprochez le pouce et l'annulaire", width/2, textY);
    } else if (isPinching) {
        fill(100, 200, 255);
        text("🔄 SCROLL: Déplacez la main vers le haut/bas", width/2, textY);
    } else {
        text("👆 Pincez pouce-index pour SCROLL | Pouce-majeur (écarter) pour ZOOM+ | Pouce-annulaire pour ZOOM-", width/2, textY-10);
        text("Double-clic pour réinitialiser le zoom", width/2, textY+15);
    }

    // Afficher le niveau de zoom
    fill(255);
    textSize(14);
    text(`Zoom: ${currentZoomLevel.toFixed(2)}x`, width/2, height - 40);
}

function displayDebugInfo() {
    // Fond semi-transparent pour les infos de débogage
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, 0, 220, 130);

    fill(255);
    textSize(14);
    textAlign(LEFT);

    let y = 20;
    text(`Mains: ${hands.length}`, 10, y); y += 20;
    text(`Main active: ${activeHandId}`, 10, y); y += 20;
    text(`Zoom: ${currentZoomLevel.toFixed(2)}x`, 10, y); y += 20;
    text(`Phase: ${gesturePhase || "aucune"}`, 10, y); y += 20;

    if (hands.length > 0) {
        const pinchStates = [];
        if (pinchesDetected.middle) pinchStates.push("majeur");
        if (pinchesDetected.ring) pinchStates.push("annulaire");
        text(`Pincements: ${pinchStates.join(", ") || "aucun"}`, 10, y); y += 20;
    }

    if (isPinching) text(`Scroll actif`, 10, y);
}

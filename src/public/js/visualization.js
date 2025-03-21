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
            const palm = hand.keypoints[0];
            const thumb = hand.keypoints[4];
            if (!thumb || !palm) continue;

            stroke(0, 200, 0, 150);
            strokeWeight(2);

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

            for (let j = 1; j <= 20; j++) {
                if (j % 4 !== 0 && j < 20 && hand.keypoints[j] && hand.keypoints[j+1]) {
                    line(width - hand.keypoints[j].x, hand.keypoints[j].y,
                        width - hand.keypoints[j+1].x, hand.keypoints[j+1].y);
                }
            }

            for (let j = 0; j < hand.keypoints.length; j++) {
                let keypoint = hand.keypoints[j];
                if (!keypoint) continue;

                const invertedX = width - keypoint.x;

                if (j === 0) {
                    if (isFistClosed) {
                        fill(255, 0, 0);
                    } else {
                        fill(0, 255, 0);
                    }
                    noStroke();
                    circle(invertedX, keypoint.y, 20);
                    continue;
                }

                const isFingerTip = [4, 8, 12, 16, 20].includes(j);

                if (isFingerTip) {
                    if (j === 4) {
                        fill(0, 100, 255);
                        noStroke();
                        circle(invertedX, keypoint.y, 12);
                    } else if (j === 12 && gesturePhase === 'spreading') {
                        fill(255, 255, 0);
                        noStroke();
                        circle(invertedX, keypoint.y, 14);
                    } else if (j === 16 && gesturePhase === 'start-zoom-out') {
                        fill(255, 100, 255);
                        noStroke();
                        circle(invertedX, keypoint.y, 14);
                    } else {
                        if (isFistClosed) {
                            fill(255, 50, 50);
                        } else {
                            fill(50, 255, 50);
                        }
                        noStroke();
                        circle(invertedX, keypoint.y, 12);
                    }
                } else {
                    fill(0, 200, 0);
                    noStroke();
                    circle(invertedX, keypoint.y, 6);
                }
            }
        } else {
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
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, height - 70, width, 70);

    textSize(16);
    textAlign(CENTER);

    const textY = height - 30;

    if (hands.length === 0) {
        fill(255);
        text("Montrez vos mains à la caméra", width/2, textY);
    } else if (hands.length === 2) {
        fill(255);
        text("Deux mains: Pincez pouce-index des deux mains et écartez pour zoomer", width/2, textY);
    } else {
        if (gesturePhase === 'start-zoom-in') {
            fill(255, 255, 0);
            text("✨ ZOOM IN: Maintenant écartez progressivement le pouce et le majeur", width/2, textY);
        } else if (gesturePhase === 'spreading') {
            fill(255, 255, 0);
            text("✨ ZOOM IN: Continuez à écarter pour zoomer davantage", width/2, textY);
        } else if (gesturePhase === 'start-zoom-out') {
            fill(255, 150, 150);
            text("✨ ZOOM OUT: Maintenant rapprochez le pouce et l'annulaire jusqu'à les pincer", width/2, textY);
        } else if (isPinching) {
            fill(100, 200, 255);
            text("🔄 SCROLL: Déplacez la main vers le haut/bas", width/2, textY);
        } else {
            fill(255);
            text("Gestes disponibles:", width/2, textY - 35);

            fill(100, 200, 255);
            text("👆 Pincez pouce-index pour DÉFILER", width/2, textY - 15);

            fill(255, 255, 0);
            text("👌 Pincez puis écartez pouce-majeur pour ZOOMER", width/2, textY + 5);

            fill(255, 150, 150);
            text("👐 Écartez puis pincez pouce-annulaire pour DÉZOOMER", width/2, textY + 25);
        }
    }

    fill(255);
    textSize(14);
    text(`Zoom: ${currentZoomLevel.toFixed(2)}x`, width/2, height - 50);
}


function displayDebugInfo() {
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

document.dispatchEvent(new CustomEvent('resourceLoaded', { detail: { name: 'handDetection' } }));

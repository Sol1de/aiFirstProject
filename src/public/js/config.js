/**
 * Configuration et variables globales
 */

// Variables principales
let handPose;
let video;
let hands = [];

// Variables pour le suivi des mains
let activeHandId = null;
let handDetectionTimes = {};
let isFistClosed = false;
let fistStateChanged = false;
let lastFistChangeTime = 0;

// Variables pour le zoom
let currentZoomLevel = 1.0;
let zoomLevels = [1.0, 1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0];
let currentZoomIndex = 0;
let zoomCenterX = 0.5;
let zoomCenterY = 0.5;
let lastZoomTime = 0;
let initialScrollX = 0;
let initialScrollY = 0;

// Variables pour l'animation de zoom
let zoomAnimationDuration = 500;
let zoomAnimationStartTime = 0;
let zoomAnimationStartLevel = 1.0;
let zoomAnimationEndLevel = 1.0;
let isZoomAnimating = false;

// Variables pour le zoom à deux mains
let isZooming = false;
let initialPinchDistance = 0;
let lastPinchDistance = 0;
let pinchHistorySize = 3;
let pinchDistanceHistory = [];
let zoomDirection = 0;
let zoomThreshold = 5;
let zoomStepDebounce = 300;
let lastZoomStepTime = 0;

// Variables pour zoom à une main
let singleHandZoomActive = false;
let initialFingerDistance = 0;
let canZoomAgain = true;
let fingerDistanceThreshold = 20;
let pinchesDetected = {};  // Pour suivre l'état des pincements {majeur: true/false, annulaire: true/false}
let lastPinchState = {};   // Pour suivre l'état précédent
let gesturePhase = null;   // 'start', 'spreading', 'pinching' ou null
let fingerSpreadDistance = 0;

// Variables pour le scroll
let isPinching = false;
let previousPinchPosition = null;
let scrollThreshold = 15;
let pinchThreshold = 35;
let scrollDebounce = 300;
let lastScrollTime = 0;

// Variables pour la détection du poing
let fingerCloseThreshold = 40;
let fistChangeDelay = 1000;

// Variables d'interface utilisateur
let debugMode = true;
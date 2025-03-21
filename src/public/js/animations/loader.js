document.addEventListener("DOMContentLoaded", function() {
    const loader = document.getElementById('loader');
    const progressText = document.getElementById('loading-progress');
    let resourcesLoaded = 0;
    const totalResources = 100; // Valeur arbitraire pour la progression

    // Fonction pour mettre à jour la progression
    function updateProgress(increment) {
        resourcesLoaded += increment;
        const percentage = Math.min(Math.floor((resourcesLoaded / totalResources) * 100), 100);
        progressText.textContent = `Chargement... ${percentage}%`;

        // Si le chargement est terminé, masquer le loader
        if (percentage >= 100) {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500);
            }, 500);
        }
    }

    // Vérifier si ml5 est chargé
    function checkML5Loaded() {
        if (typeof ml5 !== 'undefined') {
            updateProgress(30);
        } else {
            setTimeout(checkML5Loaded, 100);
        }
    }

    // Vérifier si p5 est chargé
    function checkP5Loaded() {
        if (typeof p5 !== 'undefined') {
            updateProgress(20);
        } else {
            setTimeout(checkP5Loaded, 100);
        }
    }

    // Initialisation des vérifications de chargement
    checkML5Loaded();
    checkP5Loaded();

    // Simuler le chargement progressif des autres ressources
    let loadedCount = 0;
    const intervalId = setInterval(() => {
        loadedCount += 5;
        updateProgress(5);

        if (loadedCount >= 50) { // 50% restants seront chargés progressivement
            clearInterval(intervalId);
        }
    }, 200);

    // Assurer que le loader disparaît même si certaines ressources ne se chargent pas
    window.addEventListener("load", function() {
        setTimeout(() => {
            updateProgress(totalResources - resourcesLoaded);
        }, 3000);
    });
});

document.addEventListener('resourceLoaded', function(e) {
    console.log(`Resource loaded: ${e.detail.name}`);
    updateProgress(5);
});
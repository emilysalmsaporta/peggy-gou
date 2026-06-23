let currentRoom = 0;
let isTransitioning = false;

window.addEventListener('DOMContentLoaded', () => {


  document.fonts.ready.then(() => {


const entryScreen = document.getElementById('entry-screen');
if (entryScreen) {
  entryScreen.addEventListener('click', () => {


    const audio = document.getElementById('ambient-audio');
    if (audio) { audio.volume = 0.4; audio.play(); }

    gsap.to(entryScreen, {
      opacity: 0,
      duration: 1.2,
      ease: "power2.inOut",
      onComplete: () => {
        entryScreen.style.display = 'none';
        currentRoom = 1;
        loadRoom(1);
      }
    });
  }, { once: true });
}

    initScene();

    const arrow = document.getElementById('nav-arrow');

function goToNextRoom() {
  if (isTransitioning) return;
  isTransitioning = true;

  gsap.to(camera.position, {
    z: camera.position.z - 15,
    y: 1.7,
    duration: 1.8,
    ease: "power3.in",
    onComplete: () => {
      camera.position.z = 30;
      camera.position.y = 1.7;

      currentRoom++;
      if (currentRoom >= ROOMS.length) currentRoom = 0;

      loadRoom(currentRoom);
      if (window.audioCtx) window.audioCtx.resume();

      gsap.to(camera.position, {
        z: 8,
        y: 1.7,
        duration: 1.8,
        ease: "power3.out",
        onComplete: () => {
          isTransitioning = false;
        }
      });
    }
  });
}

    // Click arrow
    arrow.addEventListener('click', goToNextRoom);

    // Keyboard — arrow down or space
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToNextRoom();
      }
    });

  });
});
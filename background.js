

(function(){
  const imgUrls = [
    'https://i.ibb.co/twtZ5yC3/Untitled865-20260424185720.png',
    'https://i.ibb.co/vxX7Cw5Z/Untitled865-20260424185646.png'
  ];

  // create and style bg container if not present (index.html insertion should exist but guard anyway)
  let bgContainer = document.getElementById('bg-container');
  if (!bgContainer) {
    bgContainer = document.createElement('div');
    bgContainer.id = 'bg-container';
    document.body.insertBefore(bgContainer, document.body.firstChild);
  }

  // inject minimal required styles to ensure background sits behind UI and is non-interactive
  const styleId = 'bg-container-styles';
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      #bg-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: -1;
        overflow: hidden;
        pointer-events: none;
      }
      .bg-tile {
        position: absolute;
        top: 0;
        left: 0;
        width: 120px;
        height: 120px;
        padding: 12px;
        box-sizing: border-box;
        object-fit: contain;
        opacity: 0.36;
        will-change: transform;
        transform: translate3d(0,0,0);
      }
    `;
    document.head.appendChild(s);
  }

  // smaller cell size increases count of tiles (higher density)
  const CELL_SIZE = 120;
  // Reduced speed to make the background movement noticeably slower and more relaxed
  const SPEED_X = 0.45;
  const SPEED_Y = 0.45;

  let originX = 0;
  let originY = 0;

  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;

  window.addEventListener('resize', () => {
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
  });

  const activeTiles = new Map();

  function updateBackground() {
    originX += SPEED_X;
    originY -= SPEED_Y;

    const minC = Math.floor(-originX / CELL_SIZE) - 1;
    const maxC = Math.ceil((viewWidth - originX) / CELL_SIZE) + 1;
    const minR = Math.floor(-originY / CELL_SIZE) - 1;
    const maxR = Math.ceil((viewHeight - originY) / CELL_SIZE) + 1;

    const neededTiles = new Set();

    for (let c = minC; c <= maxC; c++) {
      for (let r = minR; r <= maxR; r++) {
        const key = `${c},${r}`;
        neededTiles.add(key);
        if (!activeTiles.has(key)) {
          const img = document.createElement('img');
          const imgIndex = Math.abs(c + r) % 2;
          img.src = imgUrls[imgIndex];
          img.className = 'bg-tile';
          img.alt = '';
          img.decoding = 'async';

          // initial transform to avoid a layout tick
          img.style.transform = `translate3d(${originX + c*CELL_SIZE}px, ${originY + r*CELL_SIZE}px, 0)`;
          bgContainer.appendChild(img);
          activeTiles.set(key, { element: img, c: c, r: r });
        }
      }
    }

    for (const [key, tile] of activeTiles.entries()) {
      if (!neededTiles.has(key)) {
        tile.element.remove();
        activeTiles.delete(key);
      } else {
        const x = originX + tile.c * CELL_SIZE;
        const y = originY + tile.r * CELL_SIZE;
        tile.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    }

    requestAnimationFrame(updateBackground);
  }

  // kick off engine after a brief delay (lets main UI parse)
  requestAnimationFrame(updateBackground);

})();

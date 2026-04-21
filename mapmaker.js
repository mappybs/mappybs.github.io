// mapmaker.js — Brawl Stars Map Maker (realtime filters + bg removal + undo)

(function(){
    "use strict";

    // ---------- CONFIG ----------
    const GRID_SIZE = 60;
    const BORDER_TILE = 1;
    const TOTAL_TILES = GRID_SIZE + 2 * BORDER_TILE;
    const TILE_SIZE = 32;
    const FINAL_SIZE = TOTAL_TILES * TILE_SIZE;

    const DARK_BG = [224, 161, 118];
    const LIGHT_BG = [236, 169, 126];
    const BORDER_COLOR = [0, 0, 139];
    const WATER_FILL = [73, 149, 216];
    const WATER_BORDER1 = [128, 69, 48];
    const WATER_BORDER2 = [169, 106, 85];
    const WATER_BORDER3 = [108, 183, 241];

    const ASSET_URLS = {
        "skull": "https://i.ibb.co/7Jfcx61G/Untitled858-20260420185327.png",
        "speed_pad": "https://i.ibb.co/ZRbTLWd4/Untitled858-20260420191549.png",
        "slow_pad": "https://i.ibb.co/TMrTR020/Untitled858-20260420191654.png",
        "wall_stone": "https://i.ibb.co/8DvfGnWY/Untitled859-20260420203302.png",
        "wall_wood": "https://i.ibb.co/yBMbcyw9/Untitled859-20260420203418.png",
        "barrel": "https://i.ibb.co/S4ckCmTg/Untitled859-20260420203544.png",
        "grass": "https://i.ibb.co/VpmcbRCp/Untitled859-20260420203720.png",
        "cactus": "https://i.ibb.co/4GpnBsP/Untitled859-20260420204113.png",
        "fence": "https://i.ibb.co/VW3S4Fqh/Untitled859-20260420204338.png",
        "fence2": "https://i.ibb.co/Kx1kyKSr/Untitled859-20260420204420.png",
        "fenceStart": "https://i.ibb.co/BHmbnyY1/Untitled859-20260420204459.png",
        "rope_fence": "https://i.ibb.co/x8PLQTKH/Untitled859-20260420205832.png",
        "rope_fence_both_down": "https://i.ibb.co/hF03fzqd/Untitled859-20260420210346.png",
        "rope_fence_both": "https://i.ibb.co/hJnB4wK9/Untitled859-20260420205619.png",
        "rope_fence_left": "https://i.ibb.co/SZcdj3F/Untitled859-20260420205733.png",
        "rope_fence_right": "https://i.ibb.co/pjZ0NCV1/Untitled859-20260420205811.png",
        "rope_fence_down": "https://i.ibb.co/spNCVyKH/Untitled859-20260420210020.png",
        "poison": "https://i.ibb.co/DgYnkZw7/Untitled860-20260420211246.png",
        "spikes": "https://i.ibb.co/WpsyxCN6/Untitled859-20260420211429.png",
        "heal_pad": "https://i.ibb.co/PsMBF8WB/Untitled861-20260420211625.png",
        "teleport_blue": "https://i.ibb.co/1Yx4KrPz/Untitled861-20260420211850.png",
        "teleport_green": "https://i.ibb.co/4ZPq225J/Untitled861-20260420211846.png",
        "teleport_red": "https://i.ibb.co/tMc453GX/Untitled861-20260420211843.png",
        "teleport_yellow": "https://i.ibb.co/qMLWs6rJ/Untitled861-20260420211840.png",
        "jump_pad": "https://i.ibb.co/DgKwtwPz/Untitled861-20260420212454.png"
    };

    const flat_1x1 = new Set(["skull", "speed_pad", "slow_pad", "spikes"]);
    const tall_1x1 = new Set(["wall_stone", "wall_wood", "barrel", "grass", "cactus", 
        "fence", "fence2", "fenceStart", "rope_fence", "rope_fence_both_down", 
        "rope_fence_both", "rope_fence_left", "rope_fence_right", "rope_fence_down", "poison"]);
    const available1x1 = ["skull", "speed_pad", "slow_pad", "spikes", "wall_stone", "wall_wood", "barrel", "cactus", "fence", "rope_fence", "poison", "grass"];

    // ----- state -----
    let originalImage = null;               // raw uploaded image (never modified)
    let baseImage = null;                  // current source for filters (after bg removal etc)
    let filteredImageData = null;          // ImageData after applying sliders (used for map generation)
    let previewImageData = null;           // what's shown on canvas (could be map or filtered)
    
    let assetImages = {};
    let assetsLoaded = false;
    let generatedMapBlob = null;
    
    // history for undo (store ImageData snapshots)
    const historyStack = [];
    const MAX_HISTORY = 20;

    // DOM elements
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const fileInput = document.getElementById('fileInput');
    const brightnessInput = document.getElementById('brightness');
    const contrastInput = document.getElementById('contrast');
    const pixelateInput = document.getElementById('pixelate');
    const stretchXInput = document.getElementById('stretchX');
    const stretchYInput = document.getElementById('stretchY');
    const brightSpan = document.getElementById('brightVal');
    const contrastSpan = document.getElementById('contrastVal');
    const pixelSpan = document.getElementById('pixelateVal');
    const stretchXSpan = document.getElementById('stretchXVal');
    const stretchYSpan = document.getElementById('stretchYVal');
    const imageInfo = document.getElementById('imageInfo');
    const generateBtn = document.getElementById('generateMapBtn');
    const downloadBtn = document.getElementById('downloadMapBtn');
    const resetBtn = document.getElementById('resetImageBtn');
    const removeBgBtn = document.getElementById('removeBgBtn');
    const undoBtn = document.getElementById('undoBtn');

    // ---------- helpers ----------
    function colorDistance(c1, c2) {
        return Math.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2 + (c1[2]-c2[2])**2);
    }
    function getBrightness([r,g,b]) {
        return 0.299*r + 0.587*g + 0.114*b;
    }

    // update slider labels
    function updateSliderLabels() {
        brightSpan.textContent = brightnessInput.value + '%';
        contrastSpan.textContent = contrastInput.value + '%';
        pixelSpan.textContent = pixelateInput.value + 'x';
        stretchXSpan.textContent = parseFloat(stretchXInput.value).toFixed(2);
        stretchYSpan.textContent = parseFloat(stretchYInput.value).toFixed(2);
    }

    // push current filtered image to history
    function pushHistory() {
        if (!filteredImageData) return;
        // clone ImageData
        const clone = new ImageData(new Uint8ClampedArray(filteredImageData.data), filteredImageData.width, filteredImageData.height);
        historyStack.push(clone);
        if (historyStack.length > MAX_HISTORY) historyStack.shift();
        undoBtn.disabled = false;
    }

    // apply filters to baseImage and update filteredImageData + preview
    function applyFilters() {
        if (!baseImage) return;
        
        const w = baseImage.width, h = baseImage.height;
        canvas.width = w; canvas.height = h;
        ctx.clearRect(0,0,w,h);
        
        const bright = parseInt(brightnessInput.value);
        const contrast = parseInt(contrastInput.value);
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        ctx.filter = `brightness(${100 + bright}%) contrast(${contrastFactor})`;
        ctx.drawImage(baseImage, 0, 0, w, h);
        ctx.filter = 'none';
        
        // stretch
        const stretchX = parseFloat(stretchXInput.value);
        const stretchY = parseFloat(stretchYInput.value);
        if (stretchX !== 1.0 || stretchY !== 1.0) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w * stretchX; tempCanvas.height = h * stretchY;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            canvas.width = tempCanvas.width; canvas.height = tempCanvas.height;
            ctx.drawImage(tempCanvas, 0,0);
        }
        
        // pixelate
        const pixelSize = parseInt(pixelateInput.value);
        if (pixelSize > 1) {
            const smallW = Math.max(1, Math.floor(canvas.width / pixelSize));
            const smallH = Math.max(1, Math.floor(canvas.height / pixelSize));
            const smallCanvas = document.createElement('canvas'); smallCanvas.width=smallW; smallCanvas.height=smallH;
            const sCtx = smallCanvas.getContext('2d');
            sCtx.drawImage(canvas, 0,0,smallW,smallH);
            canvas.width = smallW * pixelSize; canvas.height = smallH * pixelSize;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(smallCanvas, 0,0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
        }
        
        filteredImageData = ctx.getImageData(0,0,canvas.width,canvas.height);
        previewImageData = filteredImageData;
        
        // show on canvas
        ctx.putImageData(filteredImageData, 0, 0);
        imageInfo.textContent = `📐 ${canvas.width}x${canvas.height} · filters active`;
    }

    // debounced version for sliders
    let filterTimeout;
    function scheduleFilterUpdate() {
        if (filterTimeout) clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            if (baseImage) {
                pushHistory(); // save state before change
                applyFilters();
            }
            filterTimeout = null;
        }, 30);
    }

    // set baseImage and reapply filters
    function setBaseImage(img) {
        baseImage = img;
        // clear history and push initial state
        historyStack.length = 0;
        applyFilters();
        if (filteredImageData) pushHistory();
        undoBtn.disabled = true;
    }

    // load default stickman
    function createStickmanImage() {
        const c = document.createElement('canvas'); c.width = 200; c.height = 200;
        const cx = c.getContext('2d');
        cx.fillStyle = '#ffffff'; cx.fillRect(0,0,200,200);
        cx.fillStyle = '#000000';
        cx.beginPath(); cx.arc(100,60,30,0,2*Math.PI); cx.fill();
        cx.lineWidth = 8; cx.strokeStyle = '#000';
        cx.beginPath(); cx.moveTo(100,90); cx.lineTo(100,140); cx.stroke();
        cx.beginPath(); cx.moveTo(100,105); cx.lineTo(70,130); cx.stroke();
        cx.beginPath(); cx.moveTo(100,105); cx.lineTo(130,130); cx.stroke();
        cx.beginPath(); cx.moveTo(100,140); cx.lineTo(75,180); cx.stroke();
        cx.beginPath(); cx.moveTo(100,140); cx.lineTo(125,180); cx.stroke();
        cx.fillStyle = '#4488ff'; cx.fillRect(20,20,40,30);
        cx.fillStyle = '#ff6644'; cx.fillRect(140,30,40,30);
        cx.fillStyle = '#66cc44'; cx.fillRect(30,150,50,30);
        return c;
    }

    async function loadDefaultImage() {
        const defCanvas = createStickmanImage();
        const img = new Image();
        img.src = defCanvas.toDataURL('image/png');
        await new Promise(r => { img.onload = r; });
        originalImage = img;
        setBaseImage(img);
    }

    // ---------- asset loading ----------
    async function loadAssets() {
        if (assetsLoaded) return true;
        imageInfo.textContent = 'Loading assets...';
        const promises = Object.entries(ASSET_URLS).map(([name, url]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => { assetImages[name] = img; resolve(); };
                img.onerror = () => { 
                    const c = document.createElement('canvas'); c.width=c.height=32;
                    const cx = c.getContext('2d'); cx.fillStyle='#FF00FF'; cx.fillRect(0,0,32,32);
                    assetImages[name] = c; 
                    resolve(); 
                };
                img.src = url;
            });
        });
        await Promise.all(promises);
        const waterCanvas = document.createElement('canvas'); waterCanvas.width=waterCanvas.height=32;
        const wCtx = waterCanvas.getContext('2d');
        wCtx.fillStyle = `rgb(${WATER_FILL[0]},${WATER_FILL[1]},${WATER_FILL[2]})`;
        wCtx.fillRect(0,0,32,32);
        assetImages['water'] = waterCanvas;
        assetsLoaded = true;
        imageInfo.textContent = 'Assets loaded ✓';
        return true;
    }

    // ---------- background removal ----------
    async function removeBackground() {
        if (!filteredImageData) {
            alert('No image to process.');
            return;
        }
        removeBgBtn.disabled = true;
        removeBgBtn.textContent = '⏳ Removing...';
        imageInfo.textContent = '✂️ Removing background... (may take a moment)';
        
        try {
            // convert current filtered image to blob
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = filteredImageData.width;
            tempCanvas.height = filteredImageData.height;
            tempCanvas.getContext('2d').putImageData(filteredImageData, 0, 0);
            
            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
            
            // use the global removeBackground function from the library
            const resultBlob = await window.removeBackground(blob, {
                progress: (key, current, total) => {
                    imageInfo.textContent = `✂️ Removing background: ${Math.round(current/total*100)}%`;
                }
            });
            
            const url = URL.createObjectURL(resultBlob);
            const newImg = new Image();
            newImg.onload = () => {
                pushHistory(); // save before replacement
                setBaseImage(newImg);
                URL.revokeObjectURL(url);
                imageInfo.textContent = `✅ Background removed · ${newImg.width}x${newImg.height}`;
            };
            newImg.src = url;
        } catch (e) {
            console.error(e);
            alert('Background removal failed. See console.');
            imageInfo.textContent = '❌ Background removal failed.';
        } finally {
            removeBgBtn.disabled = false;
            removeBgBtn.textContent = '✂️ Remove BG';
        }
    }

    // ---------- undo ----------
    function undo() {
        if (historyStack.length < 2) return;
        historyStack.pop(); // discard current
        const prev = historyStack[historyStack.length-1];
        filteredImageData = new ImageData(new Uint8ClampedArray(prev.data), prev.width, prev.height);
        previewImageData = filteredImageData;
        
        canvas.width = filteredImageData.width;
        canvas.height = filteredImageData.height;
        ctx.putImageData(filteredImageData, 0, 0);
        
        // also update baseImage? we need to reflect the source that produced this. 
        // We'll create a new Image from filteredImageData (since sliders are already applied)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = filteredImageData.width;
        tempCanvas.height = filteredImageData.height;
        tempCanvas.getContext('2d').putImageData(filteredImageData, 0, 0);
        const newImg = new Image();
        newImg.src = tempCanvas.toDataURL();
        newImg.onload = () => { baseImage = newImg; };
        
        imageInfo.textContent = `↩️ Undo · ${canvas.width}x${canvas.height}`;
        if (historyStack.length <= 1) undoBtn.disabled = true;
    }

    // ---------- map generation (uses filteredImageData) ----------
    async function generateMap() {
        if (!assetsLoaded) await loadAssets();
        if (!filteredImageData) { alert('No image. Upload or apply filters.'); return; }
        
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = filteredImageData.width;
        srcCanvas.height = filteredImageData.height;
        srcCanvas.getContext('2d').putImageData(filteredImageData, 0, 0);
        
        const small = document.createElement('canvas'); small.width = 60; small.height = 60;
        const smallCtx = small.getContext('2d');
        smallCtx.drawImage(srcCanvas, 0,0,60,60);
        const imgData = smallCtx.getImageData(0,0,60,60);
        const pixels = [];
        for (let i=0; i<imgData.data.length; i+=4) {
            pixels.push([imgData.data[i], imgData.data[i+1], imgData.data[i+2]]);
        }
        
        const freq = new Map();
        pixels.forEach(p => { const k = p.join(','); freq.set(k, (freq.get(k)||0)+1); });
        let bgColor = [255,255,255]; let maxC=0;
        for (let [k,v] of freq) { if(v>maxC) { maxC=v; bgColor = k.split(',').map(Number); } }
        
        const BG_THRESHOLD = 30;
        const nonBg = pixels.filter(p => colorDistance(p, bgColor) > BG_THRESHOLD);
        
        let clusterCenters, clusters;
        if (nonBg.length === 0) {
            clusterCenters = []; clusters = [];
            const allPixels = [...pixels];
            const CLUSTER_THRESHOLD = 40;
            allPixels.forEach(color => {
                let found = false;
                for (let i=0; i<clusterCenters.length; i++) {
                    if (colorDistance(color, clusterCenters[i]) < CLUSTER_THRESHOLD) {
                        clusters[i].push(color);
                        const sum = clusters[i].reduce((a,c)=> [a[0]+c[0], a[1]+c[1], a[2]+c[2]], [0,0,0]);
                        clusterCenters[i] = sum.map(v=> Math.round(v/clusters[i].length));
                        found = true; break;
                    }
                }
                if (!found && clusterCenters.length < 8) {
                    clusterCenters.push([...color]); clusters.push([color]);
                } else if (!found) {
                    let idx = 0, minD=Infinity;
                    clusterCenters.forEach((c,i)=>{ const d=colorDistance(color,c); if(d<minD){minD=d; idx=i;} });
                    clusters[idx].push(color);
                    const sum = clusters[idx].reduce((a,c)=> [a[0]+c[0], a[1]+c[1], a[2]+c[2]], [0,0,0]);
                    clusterCenters[idx] = sum.map(v=> Math.round(v/clusters[idx].length));
                }
            });
        } else {
            const CLUSTER_THRESHOLD = 45;
            clusters = []; clusterCenters = [];
            nonBg.forEach(color => {
                let found = false;
                for (let i=0; i<clusterCenters.length; i++) {
                    if (colorDistance(color, clusterCenters[i]) < CLUSTER_THRESHOLD) {
                        clusters[i].push(color);
                        const sum = clusters[i].reduce((a,c)=> [a[0]+c[0], a[1]+c[1], a[2]+c[2]], [0,0,0]);
                        clusterCenters[i] = sum.map(v=> Math.round(v/clusters[i].length));
                        found = true; break;
                    }
                }
                if (!found && clusterCenters.length < 10) {
                    clusterCenters.push([...color]); clusters.push([color]);
                } else if (!found) {
                    let idx = 0, minD=Infinity;
                    clusterCenters.forEach((c,i)=>{ const d=colorDistance(color,c); if(d<minD){minD=d; idx=i;} });
                    clusters[idx].push(color);
                    const sum = clusters[idx].reduce((a,c)=> [a[0]+c[0], a[1]+c[1], a[2]+c[2]], [0,0,0]);
                    clusterCenters[idx] = sum.map(v=> Math.round(v/clusters[idx].length));
                }
            });
        }
        
        const used = new Set(); const assignment = {};
        const sorted = [...clusterCenters].sort((a,b)=> getBrightness(a)-getBrightness(b));
        const darkList = ["wall_stone","wall_wood","barrel","spikes","cactus","poison"];
        const medList = ["fence","rope_fence","speed_pad","slow_pad"];
        const lightList = ["skull","jump_pad","grass"];
        
        sorted.forEach(c => { const key = c.join(','); if (c[2] > c[0]+20 && c[2] > c[1]+20 && c[2] > 80) { assignment[key] = 'water'; used.add('water'); } });
        sorted.forEach(c => {
            const key = c.join(','); if (assignment[key]) return;
            const bright = getBrightness(c);
            let pool = bright<80 ? darkList : (bright<140 ? medList : lightList);
            let chosen = pool.find(a => !used.has(a) && assetImages[a]);
            if (!chosen) chosen = available1x1.find(a=>!used.has(a) && assetImages[a]);
            if (!chosen) { const availableAssets = Object.keys(assetImages).filter(a => a !== 'water'); chosen = availableAssets[Math.floor(Math.random() * availableAssets.length)]; }
            assignment[key] = chosen; used.add(chosen);
        });
        
        const grid = Array(60).fill().map(()=>Array(60).fill(null));
        const waterGrid = Array(60).fill().map(()=>Array(60).fill(false));
        
        for (let y=0; y<60; y++) {
            for (let x=0; x<60; x++) {
                const idx = (y*60+x)*4;
                const col = [imgData.data[idx], imgData.data[idx+1], imgData.data[idx+2]];
                if (colorDistance(col, bgColor) < BG_THRESHOLD) continue;
                let minD=Infinity, bestKey='';
                clusterCenters.forEach(c => { const d=colorDistance(col,c); if(d<minD){minD=d; bestKey=c.join(',');} });
                let asset = assignment[bestKey];
                if (!asset) { const bright = getBrightness(col); asset = (col[2] > col[0]+20 && col[2] > col[1]+20) ? 'water' : (bright < 80 ? 'wall_stone' : (bright < 140 ? 'fence' : 'grass')); }
                if (asset === 'water') { waterGrid[y][x] = true; grid[y][x] = 'water'; } else { grid[y][x] = asset; }
            }
        }
        
        for (let y=0; y<60; y++) {
            for (let x=0; x<60; x++) {
                const idx = (y*60+x)*4;
                const col = [imgData.data[idx], imgData.data[idx+1], imgData.data[idx+2]];
                if (colorDistance(col, bgColor) >= BG_THRESHOLD && !grid[y][x]) {
                    const neighbors = [];
                    if (y>0 && grid[y-1][x]) neighbors.push(grid[y-1][x]);
                    if (y<59 && grid[y+1][x]) neighbors.push(grid[y+1][x]);
                    if (x>0 && grid[y][x-1]) neighbors.push(grid[y][x-1]);
                    if (x<59 && grid[y][x+1]) neighbors.push(grid[y][x+1]);
                    if (neighbors.length > 0) {
                        const neighborCounts = {}; neighbors.forEach(n => neighborCounts[n] = (neighborCounts[n]||0)+1);
                        let mostCommon = null, maxCount = 0;
                        for (let n in neighborCounts) { if (neighborCounts[n] > maxCount) { maxCount = neighborCounts[n]; mostCommon = n; } }
                        grid[y][x] = mostCommon; if (mostCommon === 'water') waterGrid[y][x] = true;
                    } else { grid[y][x] = 'fence'; }
                }
            }
        }
        
        const finalGrid = grid.map(row=>[...row]);
        for (let y=0; y<60; y++) {
            for (let x=0; x<60; x++) {
                if (grid[y][x] === 'fence') {
                    const left = x>0 && grid[y][x-1] && grid[y][x-1].includes('fence');
                    const right = x<59 && grid[y][x+1] && grid[y][x+1].includes('fence');
                    const up = y>0 && grid[y-1][x] && grid[y-1][x].includes('fence');
                    const down = y<59 && grid[y+1][x] && grid[y+1][x].includes('fence');
                    const connections = [left, right, up, down].filter(Boolean).length;
                    if (connections === 0) finalGrid[y][x] = 'fence';
                    else if (connections === 1) finalGrid[y][x] = 'fenceStart';
                    else if (connections === 2 && ((left&&right) || (up&&down))) finalGrid[y][x] = 'fence2';
                    else finalGrid[y][x] = 'fence2';
                } else if (grid[y][x] === 'rope_fence') {
                    const left = x>0 && grid[y][x-1] && grid[y][x-1].includes('rope_fence');
                    const right = x<59 && grid[y][x+1] && grid[y][x+1].includes('rope_fence');
                    const down = y<59 && grid[y+1][x] && grid[y+1][x].includes('rope_fence');
                    if (left && right) finalGrid[y][x] = down ? 'rope_fence_both_down' : 'rope_fence_both';
                    else if (left) finalGrid[y][x] = 'rope_fence_right';
                    else if (right) finalGrid[y][x] = 'rope_fence_left';
                    else if (down) finalGrid[y][x] = 'rope_fence_down';
                    else finalGrid[y][x] = 'rope_fence';
                }
            }
        }
        
        const outCanvas = document.createElement('canvas'); outCanvas.width = outCanvas.height = FINAL_SIZE;
        const outCtx = outCanvas.getContext('2d');
        outCtx.fillStyle = `rgb(${BORDER_COLOR})`; outCtx.fillRect(0,0,FINAL_SIZE,FINAL_SIZE);
        for (let y=0; y<60; y++) {
            for (let x=0; x<60; x++) {
                const isDark = (x+y)%2 === 0;
                outCtx.fillStyle = isDark ? `rgb(${DARK_BG})` : `rgb(${LIGHT_BG})`;
                outCtx.fillRect((x+1)*TILE_SIZE, (y+1)*TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
        for (let y=0; y<60; y++) {
            for (let x=0; x<60; x++) {
                if (waterGrid[y][x]) {
                    outCtx.fillStyle = `rgb(${WATER_FILL})`;
                    outCtx.fillRect((x+1)*TILE_SIZE, (y+1)*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    const hasTop = y>0 && waterGrid[y-1][x], hasBottom = y<59 && waterGrid[y+1][x], hasLeft = x>0 && waterGrid[y][x-1], hasRight = x<59 && waterGrid[y][x+1];
                    outCtx.fillStyle = `rgb(${WATER_BORDER3})`;
                    if (!hasTop) outCtx.fillRect((x+1)*TILE_SIZE, (y+1)*TILE_SIZE, TILE_SIZE, 2);
                    if (!hasBottom) outCtx.fillRect((x+1)*TILE_SIZE, (y+2)*TILE_SIZE-2, TILE_SIZE, 2);
                    if (!hasLeft) outCtx.fillRect((x+1)*TILE_SIZE, (y+1)*TILE_SIZE, 2, TILE_SIZE);
                    if (!hasRight) outCtx.fillRect((x+2)*TILE_SIZE-2, (y+1)*TILE_SIZE, 2, TILE_SIZE);
                }
            }
        }
        for (let y=0; y<60; y++) {
            for (let x=0; x<60; x++) {
                const cell = finalGrid[y][x]; if (!cell || cell === 'water') continue;
                const asset = assetImages[cell]; if (!asset) continue;
                const px = (x+1)*TILE_SIZE, py = (y+1)*TILE_SIZE;
                if (flat_1x1.has(cell)) outCtx.drawImage(asset, px, py, TILE_SIZE, TILE_SIZE);
                else if (tall_1x1.has(cell) || cell.includes('fence')) outCtx.drawImage(asset, px, py-16, TILE_SIZE, 48);
                else outCtx.drawImage(asset, px, py, TILE_SIZE, TILE_SIZE);
            }
        }
        
        canvas.width = 496; canvas.height = 496;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(outCanvas, 0,0,496,496);
        previewImageData = ctx.getImageData(0,0,496,496);
        
        outCanvas.toBlob(blob => { generatedMapBlob = blob; downloadBtn.disabled = false; });
        
        generateBtn.disabled = false; generateBtn.textContent = '🎮 Generate map';
        imageInfo.textContent = '🗺️ Map generated! Download ready.';
    }

    // ---------- event listeners ----------
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            setBaseImage(img);
        };
        img.src = URL.createObjectURL(file);
    });
    
    // sliders: realtime update
    [brightnessInput, contrastInput, pixelateInput, stretchXInput, stretchYInput].forEach(s => {
        s.addEventListener('input', () => {
            updateSliderLabels();
            scheduleFilterUpdate();
        });
    });
    
    // reset to default for each slider
    document.querySelectorAll('.slider-reset').forEach(btn => {
        btn.addEventListener('click', () => {
            const sliderId = btn.dataset.slider;
            const defaultValue = parseFloat(btn.dataset.default);
            const slider = document.getElementById(sliderId);
            slider.value = defaultValue;
            updateSliderLabels();
            scheduleFilterUpdate();
        });
    });
    
    resetBtn.addEventListener('click', () => {
        if (originalImage) setBaseImage(originalImage);
        else loadDefaultImage();
    });
    
    removeBgBtn.addEventListener('click', removeBackground);
    undoBtn.addEventListener('click', undo);
    generateBtn.addEventListener('click', generateMap);
    downloadBtn.addEventListener('click', () => {
        if (generatedMapBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(generatedMapBlob);
            a.download = 'brawl_map.png';
            a.click();
        }
    });
    
    // Initialize
    (async () => {
        await loadAssets();
        await loadDefaultImage();
        updateSliderLabels();
    })();

})();

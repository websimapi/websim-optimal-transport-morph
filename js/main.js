import { OptimalTransport } from './ot.js';
import { ParticleSystem } from './particles.js';
import { sampleImagePoints } from './utils.js';

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const ot = new OptimalTransport();

// Canvas Sizing
const resize = () => {
    const parent = canvas.parentElement;
    canvas.width = Math.min(parent.clientWidth, 600); // Limit resolution for performance
    canvas.height = Math.min(parent.clientHeight, 600);
};
window.addEventListener('resize', resize);
resize();

const particles = new ParticleSystem(ctx, canvas.width, canvas.height);
let isDrawing = false;
let isMorphing = false;
let morphSpeed = 0.01;

// Drawing State (on a separate temp canvas to persist strokes before converting to particles)
const drawCanvas = document.createElement('canvas');
drawCanvas.width = canvas.width;
drawCanvas.height = canvas.height;
const drawCtx = drawCanvas.getContext('2d');
drawCtx.lineCap = 'round';
drawCtx.lineJoin = 'round';
drawCtx.strokeStyle = '#000';
drawCtx.lineWidth = 15;
let hue = 0;

// UI Elements
const btnDraw = document.getElementById('btn-draw');
const btnNoise = document.getElementById('btn-noise');
const btnMorph = document.getElementById('btn-morph');
const targetUpload = document.getElementById('target-upload');
const targetPreview = document.getElementById('target-preview');
const statusText = document.getElementById('status-text');
const speedSlider = document.getElementById('speed-slider');

// --- Input Handling ---

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchmove', draw);
window.addEventListener('mouseup', stopDraw);
window.addEventListener('touchend', stopDraw);

function startDraw(e) {
    if (isMorphing) return;
    isDrawing = true;
    const p = getPos(e);
    drawCtx.beginPath();
    drawCtx.moveTo(p.x, p.y);
    draw(e); // Draw dot
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    drawCtx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    hue = (hue + 2) % 360;

    const p = getPos(e);
    drawCtx.lineTo(p.x, p.y);
    drawCtx.stroke();
    
    // Live update particles to match drawing
    particles.initFromData(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
}

function stopDraw() {
    isDrawing = false;
}

// --- Logic ---

speedSlider.addEventListener('input', (e) => {
    morphSpeed = parseFloat(e.target.value);
});

btnNoise.addEventListener('click', () => {
    isMorphing = false;
    drawCtx.clearRect(0,0,drawCanvas.width, drawCanvas.height);
    particles.initRandom();
    statusText.textContent = "Reset to random noise.";
});

btnDraw.addEventListener('click', () => {
    isMorphing = false;
    // Clearing noise? No, just keep particles as is, ready to be redrawn
    statusText.textContent = "Draw on the canvas!";
});

targetUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            targetPreview.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    }
});

let targetPoints = [];

btnMorph.addEventListener('click', () => {
    if (isMorphing) {
        // Stop functionality
        isMorphing = false;
        btnMorph.textContent = "MORPH";
        statusText.textContent = "Morphing paused.";
        return;
    }

    if (particles.particles.length === 0) {
        statusText.textContent = "Draw something first!";
        return;
    }
    
    // 1. Prepare Target
    // We sample once when starting the morph.
    statusText.textContent = "Sampling target...";
    const pCount = particles.particles.length;
    targetPoints = sampleImagePoints(targetPreview, pCount, canvas.width, canvas.height);
    
    if (targetPoints.length < pCount) {
        statusText.textContent = "Could not sample enough target points.";
        return;
    }

    // 2. Start Loop
    isMorphing = true;
    btnMorph.textContent = "PAUSE";
    statusText.textContent = "Morphing...";
    
    // Switch to animate loop if not already running (renderLoop is just draw, animate handles logic)
    // We'll merge them.
});

function renderLoop() {
    // If morphing, apply OT advection step
    if (isMorphing) {
        // Continuous Sliced Optimal Transport
        // This runs every frame, gently nudging particles towards the target distribution
        ot.advect(particles.particles, targetPoints, morphSpeed);
    }

    particles.draw();
    requestAnimationFrame(renderLoop);
}

// Init
particles.initRandom();
renderLoop(); // Start the loop immediately
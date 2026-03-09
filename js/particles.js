export class ParticleSystem {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.particles = [];
        this.maxParticles = 3000; // Cap for performance
        this.pointSize = 2;
    }

    // Initialize random noise particles
    initRandom() {
        this.particles = [];
        for(let i=0; i<this.maxParticles; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            this.particles.push({
                x: x,
                y: y,
                r: Math.random() * 255,
                g: Math.random() * 255,
                b: Math.random() * 255
            });
        }
    }

    // Initialize from Canvas Image Data (drawing or image)
    initFromData(imageData) {
        this.particles = [];
        const data = imageData.data;
        const w = imageData.width;
        const h = imageData.height;
        
        // Sampling stride to keep particle count manageable
        // We want approx maxParticles.
        const totalPixels = w * h;
        // Estimate density
        let pixelCount = 0;
        for(let i=3; i<data.length; i+=4) {
            if(data[i] > 10) pixelCount++; // Count non-transparent
        }
        
        // Stride
        const step = Math.max(1, Math.floor(Math.sqrt(pixelCount / this.maxParticles)));
        
        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
                const index = (y * w + x) * 4;
                const alpha = data[index + 3];
                
                // Only take visible pixels
                if (alpha > 20) {
                    // Random dropout to exact match count if needed, or just take them
                    if (Math.random() > 0.8 && this.particles.length > this.maxParticles) continue;

                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    
                    this.particles.push({
                        x: x,
                        y: y,
                        r: r,
                        g: g,
                        b: b
                    });
                }
            }
        }
        
        // If too few, fill with noise? No, let user draw more.
        console.log(`Initialized ${this.particles.length} particles`);
    }

    setTargets(destinationPoints) {
        // destinationPoints is array of {x, y}
        // We match indices. destinations[i] corresponds to particles[i]
        
        const count = Math.min(this.particles.length, destinationPoints.length);
        for(let i=0; i<count; i++) {
            this.particles[i].targetX = destinationPoints[i].x;
            this.particles[i].targetY = destinationPoints[i].y;
            // Also update origin to current pos for smooth interpolation from current state
            this.particles[i].originX = this.particles[i].x;
            this.particles[i].originY = this.particles[i].y;
        }
    }

    update(dt, speed) {
        // Deprecated: OT advection handles movement now directly
        // Keeping this for potential future usage or fallback
        return false;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw particles
        for(let p of this.particles) {
            this.ctx.fillStyle = `rgb(${p.r|0},${p.g|0},${p.b|0})`;
            this.ctx.fillRect(p.x, p.y, this.pointSize, this.pointSize);
        }
    }

    getPoints() {
        return this.particles.map(p => ({x: p.x, y: p.y}));
    }
}
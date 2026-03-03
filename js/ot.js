/**
 * Iterative Sliced Optimal Transport Solver
 * 
 * Instead of computing the full O(N^2) cost matrix, this approach
 * projects points onto a random 1D line, sorts them, and matches by rank.
 * By doing this repeatedly with random angles (Slicing), the particles
 * descend the gradient of the Wasserstein distance (Advection).
 * 
 * Complexity: O(N log N) per frame.
 * Result: Fluid, organic morphing that doesn't freeze the browser.
 */

export class OptimalTransport {
    constructor() {
    }

    /**
     * Advects particles towards the target distribution for one time step.
     * @param {Array} particles - Array of particle objects {x, y, ...}
     * @param {Array} targets - Array of target points {x, y}
     * @param {Number} rate - Speed of advection (0 to 1)
     */
    advect(particles, targets, rate = 0.05) {
        const n = particles.length;
        const m = targets.length;
        if (n === 0 || m === 0) return;

        // Ensure we only process the matching count to avoid out of bounds
        const count = Math.min(n, m);

        // 1. Pick a random projection direction
        const angle = Math.random() * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        // 2. Project Particles onto this line
        // We need to keep track of original indices to apply the move
        // Using a typed array for sorting indices is faster than objects
        const pProjs = new Float32Array(count);
        const pIndices = new Int32Array(count);
        
        for(let i=0; i<count; i++) {
            pProjs[i] = particles[i].x * dx + particles[i].y * dy;
            pIndices[i] = i;
        }

        // 3. Project Targets onto this line
        const tProjs = new Float32Array(count);
        for(let i=0; i<count; i++) {
            tProjs[i] = targets[i].x * dx + targets[i].y * dy;
        }

        // 4. Sort
        // Sort particle indices based on their projected value
        pIndices.sort((a, b) => pProjs[a] - pProjs[b]);
        
        // Sort target projection values directly
        tProjs.sort();

        // 5. Match and Advect
        // The i-th particle in the sorted source should move towards the i-th target value
        for(let i=0; i<count; i++) {
            const particleIdx = pIndices[i];
            
            // The value of this particle on the line is pProjs[particleIdx]
            const currentVal = pProjs[particleIdx];
            const targetVal = tProjs[i];
            
            // The 1D displacement required
            const diff = targetVal - currentVal;
            
            // Apply displacement along the projection vector
            // We scale by rate to get smooth motion over many frames
            particles[particleIdx].x += dx * diff * rate;
            particles[particleIdx].y += dy * diff * rate;
        }
    }
}
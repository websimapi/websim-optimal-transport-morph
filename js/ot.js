/**
 * Optimal Transport Solver using Sinkhorn Algorithm
 * 
 * Computes the coupling matrix P between source distribution u and target distribution v
 * with cost matrix M.
 */

export class OptimalTransport {
    constructor() {
        // Regularization parameter
        this.epsilon = 0.01; 
        // Max iterations for Sinkhorn
        this.maxIter = 50; 
        this.threshold = 1e-5;
    }

    /**
     * Solves the OT problem and returns the target coordinates for each source point.
     * @param {Array} sourcePoints - Array of {x, y}
     * @param {Array} targetPoints - Array of {x, y}
     * @returns {Array} - Array of {x, y} corresponding to optimal destination for each source point
     */
    solve(sourcePoints, targetPoints) {
        const n = sourcePoints.length;
        const m = targetPoints.length;

        if (n === 0 || m === 0) return [];

        console.log(`Starting OT Solve: ${n} source -> ${m} target`);

        // 1. Compute Cost Matrix (Squared Euclidean Distance)
        // We flatten this into a 1D Float32Array for performance: index = i * m + j
        const C = new Float32Array(n * m);
        let maxC = 0;

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                const dx = sourcePoints[i].x - targetPoints[j].x;
                const dy = sourcePoints[i].y - targetPoints[j].y;
                const distSq = dx * dx + dy * dy;
                C[i * m + j] = distSq;
                if (distSq > maxC) maxC = distSq;
            }
        }

        // Normalize Cost Matrix to avoid numerical issues with exp()
        // Stabilizing by dividing by max distance isn't strictly necessary if epsilon is scaled,
        // but it helps keep epsilon consistent across different canvas sizes.
        const scale = maxC > 0 ? maxC : 1;
        for(let k = 0; k < C.length; k++) {
            C[k] /= scale;
        }

        // 2. Compute Kernel Matrix K = exp(-C/epsilon)
        // Adjust epsilon relative to scale. Since we normalized C to [0,1], 
        // a small epsilon like 0.005 is extremely strict (local), 0.1 is loose (blurry).
        const eps = 0.01; 
        const K = new Float32Array(n * m);
        for (let k = 0; k < C.length; k++) {
            K[k] = Math.exp(-C[k] / eps);
        }

        // 3. Sinkhorn Iterations
        // We assume uniform probability distributions for now (every point has weight 1/n or 1/m)
        // u and v are the scaling vectors.
        const u = new Float64Array(n).fill(1.0 / n);
        const v = new Float64Array(m).fill(1.0 / m);
        
        // Marginal distributions (desired row/col sums)
        // In discrete point-to-point, we usually want uniform mass.
        const r = new Float64Array(n).fill(1.0 / n); // Source marginals
        const c = new Float64Array(m).fill(1.0 / m); // Target marginals

        // Temporary arrays for matrix-vector multiplication
        const K_v = new Float64Array(n); // K * v
        const KT_u = new Float64Array(m); // K_transposed * u

        for (let iter = 0; iter < this.maxIter; iter++) {
            // Update u: u = r / (K * v)
            
            // Compute K * v
            for(let i=0; i<n; i++) {
                let sum = 0;
                for(let j=0; j<m; j++) {
                    sum += K[i * m + j] * v[j];
                }
                K_v[i] = sum;
            }

            // Update u
            let err = 0;
            for(let i=0; i<n; i++) {
                const val = r[i] / (K_v[i] + 1e-15);
                u[i] = val;
            }

            // Update v: v = c / (K^T * u)
            
            // Compute K^T * u
            for(let j=0; j<m; j++) {
                let sum = 0;
                for(let i=0; i<n; i++) {
                    sum += K[i * m + j] * u[i]; // K is symmetric in indices logic, but physically laid out row-major
                }
                KT_u[j] = sum;
            }

            // Update v
            for(let j=0; j<m; j++) {
                const val = c[j] / (KT_u[j] + 1e-15);
                v[j] = val;
            }
        }

        // 4. Barycentric Mapping (Lagrangian Integration)
        // We want to map each source particle i to a new position.
        // Instead of splitting mass (which creates a blur), we move the particle to the 
        // weighted average of its targets (barycentric projection).
        // Target_i = sum_j ( P_ij * y_j ) / sum_j ( P_ij )
        // P_ij = u_i * K_ij * v_j
        
        const destinations = [];

        for (let i = 0; i < n; i++) {
            let sumX = 0;
            let sumY = 0;
            let sumWeights = 0;

            for (let j = 0; j < m; j++) {
                // Calculate P_ij probability mass
                const pij = u[i] * K[i * m + j] * v[j];
                
                sumX += pij * targetPoints[j].x;
                sumY += pij * targetPoints[j].y;
                sumWeights += pij;
            }

            // Normalize
            if (sumWeights > 1e-9) {
                destinations.push({
                    x: sumX / sumWeights,
                    y: sumY / sumWeights
                });
            } else {
                // Fallback (shouldn't happen with valid Sinkhorn)
                destinations.push({ x: sourcePoints[i].x, y: sourcePoints[i].y });
            }
        }

        return destinations;
    }
}
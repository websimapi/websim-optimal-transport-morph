export function sampleImagePoints(img, count, width, height) {
    // Draw image to a temp canvas to read pixel data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Maintain aspect ratio fit
    const scale = Math.min(width / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offsetX = (width - drawW) / 2;
    const offsetY = (height - drawH) / 2;
    
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    
    const idata = ctx.getImageData(0, 0, width, height);
    const data = idata.data;
    
    // We want to sample points based on "importance" (darkness for drawing style, or edge?)
    // Let's assume the target image defines structure. We sample from non-white/non-transparent pixels.
    // Or if it's a photo, we use Canny Edge Detection ideally.
    // For simplicity: Importance Sampling based on (1 - brightness).
    
    const candidates = [];
    
    for(let y=0; y<height; y+=2) {
        for(let x=0; x<width; x+=2) {
            const idx = (y*width + x) * 4;
            const r = data[idx];
            const g = data[idx+1];
            const b = data[idx+2];
            const a = data[idx+3];
            
            if (a < 50) continue;
            
            // Brightness
            const brit = (r+g+b)/3;
            // Importance: Darker = Higher (assuming white background portrait)
            // If image is dark background, we might want Lighter = Higher.
            // Let's deduce based on average brightness.
            
            // For general images, let's look for contrast/edges or just simple density.
            // Let's use simple thresholding to define "shape".
            // If it's the generated portrait (black on white), darker is better.
            const importance = (255 - brit) / 255;
            
            if (Math.random() < importance) {
                candidates.push({x, y});
            }
        }
    }
    
    // Shuffle and slice to match count
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    
    // If we have fewer candidates than count, duplicate some?
    // Or just return what we have.
    // If we have more, slice.
    
    // To fill the shape well, we can repeat.
    while (candidates.length < count && candidates.length > 0) {
        candidates.push(...candidates); // naive filling
    }
    
    return candidates.slice(0, count);
}
// JavaScript file to generate icons programmatically
function generateIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);
    
    // Create diagonal red squares pattern  
    const squareSize = size / 6;
    const numSquares = 4;
    
    ctx.fillStyle = '#ff0000';
    
    // First diagonal line (top-left to bottom-right)
    for (let i = 0; i < numSquares; i++) {
        const x = (size / 8) + (i * squareSize * 1.2);
        const y = (size / 8) + (i * squareSize * 1.2);
        
        if (x + squareSize <= size && y + squareSize <= size) {
            ctx.save();
            ctx.translate(x + squareSize/2, y + squareSize/2);
            ctx.rotate(Math.PI / 4); // 45 degree rotation
            ctx.fillRect(-squareSize/2, -squareSize/2, squareSize, squareSize);
            ctx.restore();
        }
    }
    
    // Second diagonal line (offset)
    ctx.fillStyle = '#cc0000'; // Slightly darker red
    for (let i = 0; i < numSquares - 1; i++) {
        const x = (size / 4) + (i * squareSize * 1.2);
        const y = (size / 4) + (i * squareSize * 1.2);
        
        if (x + squareSize <= size && y + squareSize <= size) {
            ctx.save();
            ctx.translate(x + squareSize/2, y + squareSize/2);
            ctx.rotate(Math.PI / 4); // 45 degree rotation
            ctx.fillRect(-squareSize/2, -squareSize/2, squareSize * 0.8, squareSize * 0.8);
            ctx.restore();
        }
    }
    
    // Third diagonal line (another offset)
    ctx.fillStyle = '#ff4444'; // Lighter red
    for (let i = 0; i < numSquares - 2; i++) {
        const x = (size / 3) + (i * squareSize * 1.2);
        const y = (size / 6) + (i * squareSize * 1.2);
        
        if (x + squareSize <= size && y + squareSize <= size) {
            ctx.save();
            ctx.translate(x + squareSize/2, y + squareSize/2);
            ctx.rotate(Math.PI / 4); // 45 degree rotation
            ctx.fillRect(-squareSize/2, -squareSize/2, squareSize * 0.6, squareSize * 0.6);
            ctx.restore();
        }
    }
    
    // Add some horror effect - subtle noise
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const dotSize = Math.random() * 3 + 1;
        ctx.fillRect(x, y, dotSize, dotSize);
    }
    
    return canvas.toDataURL('image/png');
}

// Auto-generate icons if running in browser
if (typeof window !== 'undefined') {
    window.generateIcon = generateIcon;
    
    // Auto-generate and download icons
    setTimeout(() => {
        const icon192 = generateIcon(192);
        const icon512 = generateIcon(512);
        
        // Create download links
        const link192 = document.createElement('a');
        link192.download = 'icon-192.png';
        link192.href = icon192;
        document.body.appendChild(link192);
        
        const link512 = document.createElement('a');
        link512.download = 'icon-512.png';
        link512.href = icon512;
        document.body.appendChild(link512);
        
        console.log('Icon generation complete. Download links created.');
    }, 100);
}
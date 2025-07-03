import type { TreeSceneryElement, RockSceneryElement, RiverSceneryElement, PineTreeSceneryElement, PuddleSceneryElement, FlowerSceneryElement } from './sceneryTypes';
import type { BiomeData } from '../../types';

export function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rParam: number) {
    let r = rParam;

    if (w < 0) {
        x += w;
        w = -w;
    }
    if (h < 0) {
        y += h;
        h = -h;
    }

    r = Math.max(0, r);

    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;

    r = Math.max(0, r);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export function drawTree(ctx: CanvasRenderingContext2D, scenery: TreeSceneryElement) {
    ctx.save();
    ctx.globalAlpha = scenery.alpha;

    const { x, y, size, biomeName } = scenery;

    const trunkHeightRatio = 0.4;
    const trunkWidthRatio = 0.15;
    const foliageHeightRatio = 0.6;

    const fSize = Math.floor(size);
    const fX = Math.floor(x);
    const fY = Math.floor(y);

    const fTrunkHeight = Math.floor(fSize * trunkHeightRatio);
    const fTrunkWidth = Math.floor(fSize * trunkWidthRatio);
    const fFoliageHeight = Math.floor(fSize * foliageHeightRatio);

    const fTrunkX = Math.floor(fX - fTrunkWidth / 2);
    const fTrunkY = Math.floor(fY - fTrunkHeight);

    switch (biomeName) {
        case 'FLORESTA':
            const foliageColor = `rgba(60, 145, 90, ${scenery.alpha})`;
            const foliageHighlight = `rgba(100, 180, 120, ${scenery.alpha})`;
            const trunkColor = `rgba(100, 60, 20, ${scenery.alpha})`;
            const outlineColor = `rgba(40, 60, 40, ${scenery.alpha * 0.8})`;

            // Trunk
            ctx.fillStyle = trunkColor;
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, fTrunkX, fTrunkY, fTrunkWidth, fTrunkHeight, 3);
            ctx.fill();
            ctx.stroke();

            // Foliage
            ctx.fillStyle = foliageColor;
            const foliageY = fY - fTrunkHeight - (fFoliageHeight * 0.6);
            const foliageRadius = fSize * 0.4;
            ctx.beginPath();
            ctx.ellipse(fX, foliageY, foliageRadius, foliageRadius * 1.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Highlight
            ctx.fillStyle = foliageHighlight;
            ctx.beginPath();
            ctx.ellipse(fX - foliageRadius * 0.2, foliageY - foliageRadius * 0.2, foliageRadius * 0.7, foliageRadius * 0.8, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'NEVE':
            const fSnowFoliageWidth = Math.floor(fSize * 0.4);
            ctx.fillStyle = `rgba(80, 50, 10, ${scenery.alpha})`;
            ctx.fillRect(fTrunkX, fTrunkY, fTrunkWidth, fTrunkHeight);

            const snowFoliageColor = `rgba(0, 100, 0, ${scenery.alpha * 0.9})`;
            const snowColor = `rgba(240, 248, 255, ${scenery.alpha})`;

            ctx.fillStyle = snowFoliageColor;
            ctx.beginPath();
            ctx.moveTo(Math.floor(fX - fSnowFoliageWidth * 0.8), Math.floor(fY - fTrunkHeight));
            ctx.lineTo(Math.floor(fX + fSnowFoliageWidth * 0.8), Math.floor(fY - fTrunkHeight));
            ctx.lineTo(fX, Math.floor(fY - fTrunkHeight - fFoliageHeight * 1.5));
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = snowColor;
            const fSnowLayerHeight = Math.floor(fFoliageHeight * 0.3);
            ctx.beginPath();
            ctx.ellipse(fX, Math.floor(fY - fTrunkHeight - fFoliageHeight * 0.2), Math.floor(fSnowFoliageWidth * 0.7), fSnowLayerHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(fX, Math.floor(fY - fTrunkHeight - fFoliageHeight * 0.7), Math.floor(fSnowFoliageWidth * 0.5), Math.floor(fSnowLayerHeight * 0.8), 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'DESERTO':
            const cactusColor = `rgba(60, 179, 113, ${scenery.alpha})`;
            const cactusOutlineColor = `rgba(46, 139, 87, ${scenery.alpha * 1.2})`;

            const fMainBodyWidth = Math.floor(fSize * 0.3);
            const fMainBodyHeight = Math.floor(fSize * 0.7);
            const fMainBodyX = Math.floor(fX - fMainBodyWidth / 2);
            const fMainBodyY = Math.floor(fY - fMainBodyHeight);

            ctx.fillStyle = cactusColor;
            ctx.strokeStyle = cactusOutlineColor;
            ctx.lineWidth = 2;

            drawRoundedRect(ctx, fMainBodyX, fMainBodyY, fMainBodyWidth, fMainBodyHeight, Math.floor(fMainBodyWidth * 0.3));
            ctx.fill();
            ctx.stroke();

            const numArms = scenery.cactus?.numArms || 0;
            const fArmWidth = Math.floor(fMainBodyWidth * 0.7);

            if (numArms >= 1 && scenery.cactus?.arm1) {
                const fArm1Height = Math.floor(fMainBodyHeight * scenery.cactus.arm1.heightRatio);
                const fArm1X = Math.floor(fMainBodyX - fArmWidth * 0.7);
                const fArm1Y = Math.floor(fMainBodyY + fMainBodyHeight * scenery.cactus.arm1.yOffsetRatio);
                drawRoundedRect(ctx, fArm1X, fArm1Y, fArmWidth, fArm1Height, Math.floor(fArmWidth * 0.4));
                ctx.fill();
                ctx.stroke();
                const fArm1TipX = Math.floor(fArm1X + fArmWidth / 2);
                const fArm1TipY = Math.floor(fArm1Y - fArm1Height * 0.3);
                drawRoundedRect(ctx, Math.floor(fArm1TipX - fArmWidth*0.35), fArm1TipY, Math.floor(fArmWidth*0.7), Math.floor(fArm1Height*0.6), Math.floor(fArmWidth*0.2));
                ctx.fill();
                ctx.stroke();
            }
            if (numArms === 2 && scenery.cactus?.arm2) {
                const fArm2Height = Math.floor(fMainBodyHeight * scenery.cactus.arm2.heightRatio);
                const fArm2X = Math.floor(fMainBodyX + fMainBodyWidth - fArmWidth * 0.3);
                const fArm2Y = Math.floor(fMainBodyY + fMainBodyHeight * scenery.cactus.arm2.yOffsetRatio);
                drawRoundedRect(ctx, fArm2X, fArm2Y, fArmWidth, fArm2Height, Math.floor(fArmWidth * 0.4));
                ctx.fill();
                ctx.stroke();
                const fArm2TipX = Math.floor(fArm2X + fArmWidth / 2);
                const fArm2TipY = Math.floor(fArm2Y - fArm2Height * 0.3);
                drawRoundedRect(ctx, Math.floor(fArm2TipX - fArmWidth*0.35), fArm2TipY, Math.floor(fArmWidth*0.7), Math.floor(fArm2Height*0.6), Math.floor(fArmWidth*0.2));
                ctx.fill();
                ctx.stroke();
            }
            break;
        case 'PANTANO':
            const bushColor = `rgba(46, 139, 87, ${scenery.alpha * 0.9})`; // Seagreen
            const bushHighlight = `rgba(60, 179, 113, ${scenery.alpha})`; // Medium seagreen
            
            ctx.fillStyle = bushColor;
            ctx.beginPath();
            ctx.ellipse(fX, fY, fSize * 0.5, fSize * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = bushHighlight;
            ctx.beginPath();
            ctx.ellipse(fX - fSize * 0.1, fY - fSize * 0.1, fSize * 0.3, fSize * 0.2, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(fX + fSize * 0.15, fY, fSize * 0.35, fSize * 0.25, -Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();
            break;
        default: // Fallback or generic tree
            ctx.fillStyle = `rgba(139, 69, 19, ${scenery.alpha})`; // Brown trunk
            ctx.fillRect(fTrunkX, fTrunkY, fTrunkWidth, fTrunkHeight);
            ctx.fillStyle = `rgba(0, 128, 0, ${scenery.alpha})`; // Green foliage
            ctx.beginPath();
            ctx.arc(fX, Math.floor(fY - fTrunkHeight - fFoliageHeight / 2), Math.floor(fSize * 0.4 * (scenery.foliageWidthMultiplier || 1)) , 0, Math.PI * 2);
            ctx.fill();
            break;
    }
    ctx.restore();
}

export function drawPineTree(ctx: CanvasRenderingContext2D, scenery: PineTreeSceneryElement) {
    ctx.save();
    ctx.globalAlpha = scenery.alpha;

    const { x, y, size } = scenery;
    const fX = Math.floor(x);
    const fY = Math.floor(y);
    const fSize = Math.floor(size);

    const trunkColor = `rgba(80, 50, 10, ${scenery.alpha})`;
    const foliageColor = `rgba(30, 90, 50, ${scenery.alpha})`;
    const foliageHighlight = `rgba(50, 120, 70, ${scenery.alpha})`;
    const outlineColor = `rgba(20, 40, 20, ${scenery.alpha * 0.8})`;

    // Trunk
    const fTrunkWidth = Math.floor(fSize * 0.15);
    const fTrunkHeight = Math.floor(fSize * 0.2);
    const fTrunkX = Math.floor(fX - fTrunkWidth / 2);
    const fTrunkY = Math.floor(fY - fTrunkHeight);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(fTrunkX, fTrunkY, fTrunkWidth, fTrunkHeight);

    // Foliage tiers
    const tiers = 3;
    const tierHeight = (fSize * 0.8) / tiers;
    for (let i = 0; i < tiers; i++) {
        const tierY = fTrunkY - (i * tierHeight * 0.7);
        const tierWidth = fSize * 0.6 * (1 - i * 0.2);
        
        ctx.fillStyle = foliageColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(fX, tierY - tierHeight);
        ctx.lineTo(fX - tierWidth / 2, tierY);
        ctx.lineTo(fX + tierWidth / 2, tierY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Highlight
        ctx.fillStyle = foliageHighlight;
        ctx.beginPath();
        ctx.moveTo(fX, tierY - tierHeight);
        ctx.lineTo(fX - tierWidth / 2, tierY);
        ctx.lineTo(fX, tierY);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

export function drawPuddle(ctx: CanvasRenderingContext2D, scenery: PuddleSceneryElement) {
    if (!scenery.points || scenery.points.length < 3) return;
    ctx.save();
    ctx.globalAlpha = scenery.alpha;
    
    const { x, y } = scenery;
    const waterColor = `rgba(135, 206, 250, ${scenery.alpha * 0.6})`;
    const waterEdge = `rgba(100, 180, 220, ${scenery.alpha * 0.8})`;

    // Main water body
    ctx.beginPath();
    ctx.moveTo(x + scenery.points[0].dx, y + scenery.points[0].dy);
    for (let i = 1; i < scenery.points.length; i++) {
        const p = scenery.points[i];
        const prev = scenery.points[i-1];
        const xc = (p.dx + prev.dx) / 2;
        const yc = (p.dy + prev.dy) / 2;
        ctx.quadraticCurveTo(x + prev.dx, y + prev.dy, x + xc, y + yc);
    }
    const last = scenery.points[scenery.points.length-1];
    const first = scenery.points[0];
    const xc = (last.dx + first.dx) / 2;
    const yc = (last.dy + first.dy) / 2;
    ctx.quadraticCurveTo(x + last.dx, y + last.dy, x + xc, y + yc);

    ctx.closePath();
    ctx.fillStyle = waterColor;
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = waterEdge;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Water shine
    ctx.fillStyle = `rgba(255, 255, 255, ${scenery.alpha * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(x, y - scenery.size * 0.1, scenery.size * 0.3, scenery.size * 0.15, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

export function drawFlower(ctx: CanvasRenderingContext2D, scenery: FlowerSceneryElement) {
    ctx.save();
    ctx.globalAlpha = scenery.alpha;

    const { x, y, size, flowerType } = scenery;
    const petalColor = flowerType === 'pink' ? '#FFC0CB' : '#FFFFFF';
    const centerColor = '#FFD700'; // Gold
    const stemColor = '#006400'; // DarkGreen
    const outlineColor = `rgba(0, 0, 0, ${scenery.alpha * 0.4})`;

    // Stem
    ctx.strokeStyle = stemColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - size);
    ctx.stroke();

    // Petals
    const numPetals = 5;
    const headY = y - size;
    ctx.fillStyle = petalColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < numPetals; i++) {
        const angle = (i / numPetals) * Math.PI * 2;
        const petalX = x + Math.cos(angle) * size * 0.4;
        const petalY = headY + Math.sin(angle) * size * 0.4;
        ctx.beginPath();
        ctx.arc(petalX, petalY, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // Center
    ctx.fillStyle = centerColor;
    ctx.beginPath();
    ctx.arc(x, headY, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

export function drawRock(ctx: CanvasRenderingContext2D, scenery: RockSceneryElement) {
    ctx.save();
    ctx.globalAlpha = scenery.alpha;

    const { x, y, size, biomeName, rockPoints } = scenery;
    const fX = Math.floor(x);
    const fY = Math.floor(y);
    const fSize = Math.floor(size);


    let baseColor = `rgba(128, 128, 128, ${scenery.alpha})`; // Default grey
    let highlightColor = `rgba(169, 169, 169, ${scenery.alpha})`;
    let shadowColor = `rgba(105, 105, 105, ${scenery.alpha})`;

    switch (biomeName) {
        case 'FLORESTA':
            baseColor = `rgba(112, 128, 144, ${scenery.alpha})`; // Slate grey
            highlightColor = `rgba(119, 136, 153, ${scenery.alpha * 0.8})`;
            shadowColor = `rgba(70, 80, 90, ${scenery.alpha})`;
            break;
        case 'NEVE':
            baseColor = `rgba(176, 196, 222, ${scenery.alpha})`; // Light steel blue
            highlightColor = `rgba(220, 220, 220, ${scenery.alpha * 0.9})`; // Gainsboro
            shadowColor = `rgba(119, 136, 153, ${scenery.alpha})`; // Light slate grey
            break;
        case 'DESERTO':
            baseColor = `rgba(188, 143, 143, ${scenery.alpha})`; // Rosy brown
            highlightColor = `rgba(210, 180, 140, ${scenery.alpha * 0.8})`; // Tan
            shadowColor = `rgba(139, 69, 19, ${scenery.alpha * 0.7})`; // Saddle brown
            break;
    }

    if (!rockPoints || rockPoints.length < 3) {
        // Not enough points to draw a polygon
        ctx.restore();
        return;
    }

    // Main rock shape
    ctx.beginPath();
    ctx.moveTo(Math.floor(fX + rockPoints[0].dx), Math.floor(fY + rockPoints[0].dy));
    for (let i = 1; i < rockPoints.length; i++) {
        ctx.lineTo(Math.floor(fX + rockPoints[i].dx), Math.floor(fY + rockPoints[i].dy));
    }
    ctx.closePath();

    ctx.fillStyle = baseColor;
    ctx.fill();

    // Highlight
    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    // Simple highlight on top-left-ish facets
    ctx.moveTo(Math.floor(fX + rockPoints[0].dx), Math.floor(fY + rockPoints[0].dy - fSize*0.03));
    ctx.lineTo(Math.floor(fX + rockPoints[1].dx - fSize*0.03), Math.floor(fY + rockPoints[1].dy - fSize*0.03));
    ctx.lineTo(Math.floor(fX + rockPoints[2].dx), Math.floor(fY + rockPoints[2].dy)); // Example, adjust points as needed
    ctx.closePath();
    ctx.fill();

    // Shadow
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    // Simple shadow on bottom-right-ish facets
    const numRockPoints = rockPoints.length;
    ctx.moveTo(Math.floor(fX + rockPoints[numRockPoints-1].dx), Math.floor(fY + rockPoints[numRockPoints-1].dy + fSize*0.03));
    ctx.lineTo(Math.floor(fX + rockPoints[numRockPoints-2].dx + fSize*0.03), Math.floor(fY + rockPoints[numRockPoints-2].dy + fSize*0.03));
    ctx.lineTo(Math.floor(fX + rockPoints[numRockPoints-3].dx), Math.floor(fY + rockPoints[numRockPoints-3].dy)); // Example
    ctx.closePath();
    ctx.fill();

    if (biomeName === 'PANTANO') {
        ctx.fillStyle = `rgba(85, 107, 47, ${scenery.alpha * 0.6})`; // DarkOliveGreen slime
        ctx.beginPath();
        // A simple dripping shape on top
        ctx.moveTo(fX - fSize * 0.4, fY - fSize * 0.3);
        ctx.bezierCurveTo(
            fX - fSize * 0.5, fY,
            fX + fSize * 0.5, fY,
            fX + fSize * 0.4, fY - fSize * 0.3
        );
        // Drip 1
        ctx.bezierCurveTo(
            fX + fSize * 0.3, fY + fSize * 0.1,
            fX + fSize * 0.1, fY + fSize * 0.3,
            fX, fY + fSize * 0.1
        );
        // Drip 2
        ctx.bezierCurveTo(
            fX - fSize * 0.1, fY + fSize * 0.3,
            fX - fSize * 0.3, fY + fSize * 0.1,
            fX - fSize * 0.4, fY - fSize * 0.3
        );
        ctx.closePath();
        ctx.fill();
    }

    // Outline
    ctx.strokeStyle = `rgba(50, 50, 50, ${scenery.alpha * 0.4})`; // Darker outline
    ctx.lineWidth = 1;

    // Re-stroke the main polygon shape using floored coordinates
    ctx.beginPath();
    ctx.moveTo(Math.floor(fX + rockPoints[0].dx), Math.floor(fY + rockPoints[0].dy));
    for (let i = 1; i < rockPoints.length; i++) {
        ctx.lineTo(Math.floor(fX + rockPoints[i].dx), Math.floor(fY + rockPoints[i].dy));
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

export function drawRiver(ctx: CanvasRenderingContext2D, scenery: RiverSceneryElement) {
    if (!scenery.path || scenery.path.length < 2) return;

    ctx.save();
    
    const waterColor = `rgba(85, 107, 47, 0.7)`; // DarkOliveGreen
    const bankColor = `rgba(67, 89, 27, 0.8)`;  // Darker green for banks

    // Draw river banks first (wider line)
    ctx.strokeStyle = bankColor;
    ctx.lineWidth = scenery.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(scenery.path[0].x, scenery.path[0].y);
    for (let i = 0; i < scenery.path.length - 2; i++) {
        const xc = (scenery.path[i].x + scenery.path[i + 1].x) / 2;
        const yc = (scenery.path[i].y + scenery.path[i + 1].y) / 2;
        ctx.quadraticCurveTo(scenery.path[i].x, scenery.path[i].y, xc, yc);
    }
    // For the last segment, curve to the last point
    const last = scenery.path.length - 1;
    ctx.quadraticCurveTo(scenery.path[last-1].x, scenery.path[last-1].y, scenery.path[last].x, scenery.path[last].y);
    ctx.stroke();

    // Draw main water body (thinner line on top)
    ctx.strokeStyle = waterColor;
    ctx.lineWidth = scenery.width * 0.8; // slightly thinner
    ctx.beginPath();
    ctx.moveTo(scenery.path[0].x, scenery.path[0].y);
    for (let i = 0; i < scenery.path.length - 2; i++) {
        const xc = (scenery.path[i].x + scenery.path[i + 1].x) / 2;
        const yc = (scenery.path[i].y + scenery.path[i + 1].y) / 2;
        ctx.quadraticCurveTo(scenery.path[i].x, scenery.path[i].y, xc, yc);
    }
    const last2 = scenery.path.length - 1;
    ctx.quadraticCurveTo(scenery.path[last2-1].x, scenery.path[last2-1].y, scenery.path[last2].x, scenery.path[last2].y);
    ctx.stroke();
    
    ctx.restore();
}

export function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, fletchingColor: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const length = 18; // total length
    const headL = 6;
    const headW = 5;

    // Fletching
    ctx.beginPath();
    ctx.moveTo(-length/2, 0);
    ctx.lineTo(-length/2-5, 3);
    ctx.moveTo(-length/2, 0);
    ctx.lineTo(-length/2-5, -3);
    ctx.strokeStyle = fletchingColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Shaft
    ctx.beginPath();
    ctx.moveTo(-length/2, 0);
    ctx.lineTo(length/2, 0);
    ctx.strokeStyle = '#A1887F'; // Brownish-grey
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.moveTo(length/2, 0);
    ctx.lineTo(length/2 - headL, headW);
    ctx.lineTo(length/2 - headL, -headW);
    ctx.closePath();
    ctx.fillStyle = '#546E7A'; // Slate-grey
    ctx.fill();

    ctx.restore();
}

export function drawMagicOrb(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.translate(x, y);

    const coreRadius = size * 0.6;
    const glowRadius = size * (1.2 + Math.sin(Date.now() * 0.005) * 0.3); // Pulsating glow
    const particleOrbitRadius = size * 1.5;
    const numParticles = 3;

    // Outer glow
    const gradient = ctx.createRadialGradient(0, 0, coreRadius * 0.5, 0, 0, glowRadius);
    gradient.addColorStop(0, `rgba(255, 255, 255, 0.8)`);
    gradient.addColorStop(0.5, `${color}88`); // Semi-transparent color
    gradient.addColorStop(1, `${color}00`); // Fully transparent
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = color;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Orbiting particles
    ctx.fillStyle = 'white';
    for (let i = 0; i < numParticles; i++) {
        const angle = (Date.now() * 0.001) + (i * (Math.PI * 2 / numParticles));
        const px = Math.cos(angle) * particleOrbitRadius;
        const py = Math.sin(angle) * particleOrbitRadius * 0.5; // Elliptical orbit
        const pSize = size * 0.2 * (0.8 + Math.sin(angle * 2) * 0.2);
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}
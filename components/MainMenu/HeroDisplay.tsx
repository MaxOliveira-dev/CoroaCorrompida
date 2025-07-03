import React, { useRef, useEffect } from 'react';
import type { BaseStats, ClassData } from '../../types';

// Simplified drawRoundedRect for HeroDisplay (copied from GameContainer for now)
function drawRoundedRectPreview(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rParam: number) {
    let r = rParam;
    // It's crucial that w and h are non-negative.
    // Call sites should ensure this. This function will guard against negative r in arcTo.
    if (w < 0) {
        console.warn('drawRoundedRectPreview called with negative width. Correcting, but drawing might be off.', {w});
        x += w; 
        w = -w;
    }
    if (h < 0) {
        console.warn('drawRoundedRectPreview called with negative height. Correcting, but drawing might be off.', {h});
        y += h;
        h = -h;
    }
    
    r = Math.max(0, r); // Ensure initial radius is non-negative

    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    
    r = Math.max(0, r); // Final clamp to ensure r is non-negative for arcTo

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}


interface HeroDisplayProps {
  displayedClassName: string; // Changed from heroName, no longer editable
  heroClassData: BaseStats & Partial<ClassData>; // For rendering preview
}

const HeroDisplay: React.FC<HeroDisplayProps> = ({ displayedClassName, heroClassData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

   useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heroClassData) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas, making it transparent
    
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2; 

    const baseSize = 55; // Base size for preview
    const lunge = 0; // No lunge in preview
    const direction = 1; // Facing right in preview

    ctx.save();
    ctx.translate(canvasCenterX, canvasCenterY + baseSize * 0.1); 


    const outlineColor = '#4A3B31'; 
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = baseSize * 0.06;

    // Use colors from heroClassData, with fallbacks
    const skinColor = heroClassData.color || '#F0D6B5'; 
    const shirtColor = heroClassData.bodyColor || '#4A80C0';
    const pantsColor = '#795548'; 
    const hairColor = '#6D4C41'; 
    const scarfColor = '#D32F2F'; // Default red scarf

    const headRadiusX = baseSize * 0.38;
    const headRadiusY = baseSize * 0.36;
    const bodyWidth = baseSize * 0.65;
    const bodyHeight = baseSize * 0.55;
    const armThickness = baseSize * 0.18;
    const handRadius = baseSize * 0.14;
    const legWidth = baseSize * 0.22;
    const legHeight = baseSize * 0.30;
    const scarfHeight = baseSize * 0.18;
    const eyeRadius = baseSize * 0.05;
    const hairOffsetX = baseSize * 0.02; 
    const hairOffsetY = baseSize * 0.15; 

    const bodyCenterY = 0; 
    const legTopY = bodyCenterY + bodyHeight / 2 - baseSize * 0.05; 

    // Legs
    ctx.fillStyle = pantsColor;
    drawRoundedRectPreview(ctx, -legWidth * 1.2 * direction, legTopY, legWidth, legHeight, legWidth * 0.4);
    ctx.fill(); ctx.stroke();
    drawRoundedRectPreview(ctx, legWidth * 0.2 * direction, legTopY, legWidth, legHeight, legWidth * 0.4);
    ctx.fill(); ctx.stroke();

    // Body
    ctx.fillStyle = shirtColor; // Use dynamic shirt color
    drawRoundedRectPreview(ctx, -bodyWidth / 2, bodyCenterY - bodyHeight / 2, bodyWidth, bodyHeight, baseSize * 0.1);
    ctx.fill(); ctx.stroke();
    
    // Arms and Hands
    const shoulderY = bodyCenterY - bodyHeight / 3;
    const armLength = baseSize * 0.3;

    // Non-weapon arm (left if facing right)
    ctx.fillStyle = skinColor; // Skin for hand // Use dynamic skin color
    ctx.strokeStyle = shirtColor; // Shirt color for arm sleeve
    ctx.lineWidth = armThickness; // Sleeve thickness
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-bodyWidth/2 * direction + (baseSize * 0.05 * direction), shoulderY); 
    ctx.lineTo(-bodyWidth/2 * direction - armLength * direction, shoulderY + armLength * 0.8); 
    ctx.stroke(); 
    
    ctx.fillStyle = skinColor; // Hand color (dynamic skin color)
    ctx.strokeStyle = outlineColor; // Outline for hand
    ctx.lineWidth = baseSize * 0.06; // Standard outline width
    ctx.beginPath();
    ctx.arc(-bodyWidth/2 * direction - armLength * direction, shoulderY + armLength * 0.8, handRadius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.lineCap = 'butt'; // Reset line cap

    // Weapon Arm (right if facing right)
    const weaponHandX = bodyWidth/2 * direction + (baseSize*0.05*direction);
    const weaponHandY = shoulderY + armLength * 0.2;
    ctx.fillStyle = skinColor; // Dynamic skin color
    ctx.strokeStyle = shirtColor; // Dynamic shirt color
    ctx.lineWidth = armThickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bodyWidth/2 * direction - (baseSize * 0.05 * direction) , shoulderY);
    ctx.lineTo(weaponHandX, weaponHandY);
    ctx.stroke(); 

    ctx.fillStyle = skinColor; // Dynamic skin color
    ctx.strokeStyle = outlineColor; 
    ctx.lineWidth = baseSize * 0.06;
    ctx.beginPath();
    ctx.arc(weaponHandX, weaponHandY, handRadius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.lineCap = 'butt';

    // Scarf
    const scarfYPos = bodyCenterY - bodyHeight / 2 - scarfHeight / 2 + baseSize * 0.04;
    ctx.fillStyle = scarfColor;
    drawRoundedRectPreview(ctx, -bodyWidth * 0.4, scarfYPos, bodyWidth * 0.8, scarfHeight, baseSize * 0.05);
    ctx.fill(); ctx.stroke();

    // Head
    const headRelativeY = scarfYPos - headRadiusY + baseSize * 0.02; 
    ctx.fillStyle = skinColor; // Dynamic skin color
    ctx.beginPath();
    ctx.ellipse(0, headRelativeY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    const hairTopRelY = headRelativeY - headRadiusY * 0.5;
    const hairBottomRelY = headRelativeY + headRadiusY * 0.3;
    ctx.moveTo(-headRadiusX * 0.9 + hairOffsetX * direction, hairBottomRelY);
    ctx.quadraticCurveTo(
        -headRadiusX * 1.1 + hairOffsetX * direction, hairTopRelY - hairOffsetY,
        0 + hairOffsetX * direction, hairTopRelY - hairOffsetY * 1.5 
    );
    ctx.quadraticCurveTo(
        headRadiusX * 1.1 + hairOffsetX * direction, hairTopRelY - hairOffsetY,
        headRadiusX * 0.9 + hairOffsetX * direction, hairBottomRelY
    );
    ctx.quadraticCurveTo(0 + hairOffsetX * direction, headRelativeY + headRadiusY * 0.6, -headRadiusX * 0.9 + hairOffsetX * direction, hairBottomRelY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();


    // Eyes
    ctx.fillStyle = outlineColor; 
    const eyeRelY = headRelativeY - baseSize * 0.03; 
    const eyeSpacing = headRadiusX * 0.35;
    ctx.beginPath();
    ctx.arc(-eyeSpacing * direction, eyeRelY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing * direction, eyeRelY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Weapon Drawing Logic (based on heroClassData.weapon)
    ctx.save();
    ctx.translate(weaponHandX, weaponHandY); // Translate context to hand position for weapon drawing

    const weaponType = heroClassData.weapon; // This comes from finalStats, determined by equipped item
    const weaponSizeScale = baseSize / 20; // Scale factor for weapon parts

    if (weaponType === 'sword' || weaponType === 'axe') {
        ctx.rotate(direction === 1 ? -Math.PI / 5 : Math.PI / 5 + Math.PI);
        const swordLength = 15 * weaponSizeScale;
        const swordWidth = 3 * weaponSizeScale;
        const guardWidth = 6 * weaponSizeScale;
        ctx.fillStyle = '#B0BEC5'; // Silver-grey blade
        drawRoundedRectPreview(ctx, -swordWidth/2, -swordLength, swordWidth, swordLength, swordWidth*0.3);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#78909C'; // Darker grey guard/hilt
        drawRoundedRectPreview(ctx, -guardWidth/2, 0, guardWidth, 2*weaponSizeScale, 1*weaponSizeScale);
        ctx.fill(); ctx.stroke();
    } else if (weaponType === 'dagger') {
        ctx.rotate(direction === 1 ? -Math.PI / 5 : Math.PI / 5 + Math.PI);
        const daggerLength = 10 * weaponSizeScale;
        const daggerWidth = 2.5 * weaponSizeScale;
        ctx.fillStyle = '#B0BEC5';
        drawRoundedRectPreview(ctx, -daggerWidth/2, -daggerLength, daggerWidth, daggerLength, daggerWidth*0.3);
        ctx.fill(); ctx.stroke();
    } else if (weaponType === 'bow') {
        ctx.rotate(direction === 1 ? -Math.PI / 2.5 : Math.PI / 2.5);
        ctx.strokeStyle = '#8D6E63'; // Brown for bow wood
        const originalLineWidth = ctx.lineWidth; // Store original
        ctx.lineWidth = 2 * weaponSizeScale; // Bow thickness
        const bowRadius = 10 * weaponSizeScale;
        ctx.beginPath();
        ctx.arc(0, 0, bowRadius, Math.PI * 0.8, Math.PI * 2.2); // Draw bow arc
        ctx.stroke();
        // Bowstring
        ctx.beginPath();
        ctx.moveTo(bowRadius * Math.cos(Math.PI*0.8), bowRadius * Math.sin(Math.PI*0.8));
        ctx.lineTo(bowRadius * Math.cos(Math.PI*2.2), bowRadius * Math.sin(Math.PI*2.2));
        ctx.stroke();
        ctx.lineWidth = originalLineWidth; // Restore original
        ctx.strokeStyle = outlineColor; // Restore outline color for other parts
    } else if (weaponType === 'staff') {
        ctx.rotate(direction === 1 ? Math.PI / 8 : -Math.PI / 8 - Math.PI/2);
        const staffLength = 18 * weaponSizeScale;
        const staffWidth = 2.5 * weaponSizeScale;
        const gemRadius = 4 * weaponSizeScale;
        ctx.fillStyle = '#A1887F'; // Wooden staff color
        drawRoundedRectPreview(ctx, -staffWidth/2, -staffLength + gemRadius, staffWidth, staffLength,1*weaponSizeScale);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = heroClassData.color || '#4FC3F7'; // Gem color, matches hero's primary color or a default blue
        ctx.beginPath();
        ctx.arc(0, -staffLength + gemRadius*0.8, gemRadius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
    } else if (weaponType === 'shield') {
        const shieldW = 12 * weaponSizeScale;
        const shieldH = 15 * weaponSizeScale;
        // Adjust shield position based on direction (more to the side of the arm)
        const shieldOffsetX = direction === 1 ? -shieldW * 0.3 : shieldW * 0.3;
        ctx.fillStyle = '#A1887F'; // Shield wood/metal color
        // Draw shield slightly offset from hand center to look like it's held on the arm
        drawRoundedRectPreview(ctx, -shieldW/2 + shieldOffsetX, -shieldH*0.7, shieldW, shieldH, 3*weaponSizeScale);
        ctx.fill();ctx.stroke();
    }
    ctx.restore(); // Restore from weapon hand translation
    
    ctx.restore(); // Restore from main hero translation

  }, [heroClassData, canvasRef]); 


  return (
    <div className="hero-display flex flex-col justify-center items-center py-1">
      <canvas ref={canvasRef} id="hero-preview-canvas" width="120" height="120" className="mb-1"></canvas>
      <h3
        id="hero-class-name" // Changed ID for clarity
        className="p-1 rounded-md mb-0 text-lg text-gray-700 font-fredoka font-semibold" // Removed interactive styles
      >
        {displayedClassName}
      </h3>
    </div>
  );
};

export default HeroDisplay;
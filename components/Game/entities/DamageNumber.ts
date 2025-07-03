
import { getEntityId } from '../entityUtils';

export class DamageNumber {
    id: number;
    amount: string | number; // Can be "Esquiva!" or a number
    x: number;
    y: number;
    life: number = 60; // Duration in frames (1 second at 60fps)
    alpha: number = 1;
    color: string;
    vy: number = -0.7; // Vertical speed (drifts upwards)

    constructor(amount: string | number, x: number, y: number, color: string = 'white') {
        this.id = getEntityId();
        this.amount = amount;
        this.x = x + (Math.random() - 0.5) * 20; // Slight random horizontal offset
        this.y = y;
        this.color = color;
    }

    update(): boolean { // Returns true if still active
        this.y += this.vy;
        this.life--;
        this.alpha = Math.max(0, this.life / 60); // Fade out
        return this.life > 0;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = this.color === 'orange' ? "bold 20px Fredoka" : "18px Fredoka"; // Crit numbers are bigger
        ctx.strokeStyle = 'black'; // Outline for readability
        ctx.lineWidth = 3;
        ctx.strokeText(String(this.amount), this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.fillText(String(this.amount), this.x, this.y);
        ctx.restore();
    }
}

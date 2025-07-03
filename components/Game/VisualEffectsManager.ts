

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { HeroEntity } from './entities/HeroEntity'; // For hero type hint
import type { CombatCapable } from './entityInterfaces'; // Import CombatCapable for broader type compatibility

interface ActiveEffect {
    displayObject: Container;
    update: (delta: number) => boolean; // Return true to keep, false to remove
    duration?: number; // Total duration in ms
    elapsed?: number; // Elapsed time in ms
}

export class VisualEffectsManager {
    private stage: Container;
    private activeEffects: ActiveEffect[] = [];

    constructor(stage: Container) {
        this.stage = stage;
    }

    public update(delta: number): void { // delta is time in ms
        const effectsToRemove: ActiveEffect[] = [];
        for (const effect of this.activeEffects) {
            if (effect.elapsed !== undefined && effect.duration !== undefined) {
                effect.elapsed += delta;
            }
            if (!effect.update(delta / 1000)) { // Pass delta in seconds for update logic
                effectsToRemove.push(effect);
            }
        }

        for (const effect of effectsToRemove) {
            this.stage.removeChild(effect.displayObject);
            effect.displayObject.destroy({ children: true });
            const index = this.activeEffects.indexOf(effect);
            if (index > -1) {
                this.activeEffects.splice(index, 1);
            }
        }
    }

    private addEffect(displayObject: Container, updateLogic: (deltaSeconds: number) => boolean, durationMs?: number): void {
        this.stage.addChild(displayObject);
        this.activeEffects.push({ 
            displayObject, 
            update: updateLogic,
            duration: durationMs,
            elapsed: durationMs ? 0 : undefined
        });
    }

    // --- Adventurer Ability Effects ---
    public showSocoSerioHit(targetX: number, targetY: number): void {
        for (let i = 0; i < 15; i++) { // 15 blood particles
            const particle = new Graphics();
            particle.x = targetX;
            particle.y = targetY;
            const speed = 90 + Math.random() * 150; // pixels per second
            const angle = Math.random() * Math.PI * 2;
            const particleVx = Math.cos(angle) * speed;
            const particleVy = Math.sin(angle) * speed;
            const particleDuration = 0.4 + Math.random() * 0.3; // in seconds
            let particleElapsed = 0;

            this.addEffect(particle, (deltaSeconds) => {
                particleElapsed += deltaSeconds;
                if (particleElapsed >= particleDuration) return false;

                particle.x += particleVx * deltaSeconds;
                particle.y += particleVy * deltaSeconds;
                
                const pProgress = particleElapsed / particleDuration;
                const pAlpha = 1 - pProgress;
                const pSize = (1 + Math.random() * 2) * (1 - pProgress);

                particle.clear();
                particle.beginFill(0x8B0000, pAlpha * 0.9); // Dark red for blood
                particle.drawCircle(0, 0, pSize);
                particle.endFill();
                return true;
            }, particleDuration * 1000);
        }
    }

    // --- Warrior Ability Effects ---

    public showGolpeCerteiro(hero: CombatCapable): void { // Changed to CombatCapable
        const glow = new Graphics();
        
        const duration = 1500; // ms
        let elapsed = 0;

        this.addEffect(glow, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            const progress = elapsed / duration;
            if (progress >= 1) {
                return false; // Remove effect
            }
            
            glow.x = hero.x; // update position
            glow.y = hero.y - hero.size * 0.2;

            glow.clear();
            const currentRadius = 10 + Math.sin(progress * Math.PI) * 15; // Pulsate
            const currentAlpha = Math.sin(progress * Math.PI); // Fade in and out

            glow.beginFill(0xFFD700, currentAlpha * 0.7); // Gold
            glow.drawCircle(0, 0, currentRadius);
            glow.endFill();
            
            // Starburst shape
            const numPoints = 5;
            const outerRadius = currentRadius * 1.2;
            const innerRadius = currentRadius * 0.6;
            glow.beginFill(0xFFEEAA, currentAlpha * 0.5);
            for (let i = 0; i < numPoints * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i / (numPoints * 2)) * Math.PI * 2 - Math.PI / 2;
                const xPos = Math.cos(angle) * radius;
                const yPos = Math.sin(angle) * radius;
                if (i === 0) glow.moveTo(xPos, yPos);
                else glow.lineTo(xPos, yPos);
            }
            glow.closePath();
            glow.endFill();

            return true; // Keep effect
        }, duration);
    }

    public showCorteCrescente(heroX: number, heroY: number, directionAngle: number, range: number, coneAngleDegrees: number): void {
        const slash = new Graphics();
        slash.x = heroX;
        slash.y = heroY;
        slash.rotation = directionAngle;

        const duration = 300; // ms
        let elapsed = 0;
        const coneAngleRadians = coneAngleDegrees * (Math.PI / 180);

        this.addEffect(slash, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            const progress = elapsed / duration;
            if (progress >= 1) {
                return false; 
            }

            const currentRange = range * progress;
            const currentAlpha = 1.0 - progress;

            slash.clear();
            slash.beginFill(0xC0C0C0, currentAlpha * 0.8); // Silver
            slash.moveTo(0, 0);
            slash.arc(0, 0, currentRange, -coneAngleRadians / 2, coneAngleRadians / 2);
            slash.closePath();
            slash.endFill();

            slash.lineStyle(2, 0xFFFFFF, currentAlpha);
             slash.moveTo(0,0);
            slash.arc(0, 0, currentRange * 0.95, -coneAngleRadians / 2, coneAngleRadians / 2); // Inner arc for definition

            return true;
        }, duration);
    }

    public showForcaExtrema(hero: CombatCapable, buffDurationMs: number, didHeal: boolean): void { // Changed to CombatCapable
        const aura = new Graphics();
    
        let elapsed = 0;
    
        this.addEffect(aura, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            const progress = elapsed / buffDurationMs;
            if (progress >= 1) {
                return false;
            }

            aura.x = hero.x;
            aura.y = hero.y;
    
            aura.clear();
            const pulse = Math.sin(elapsed * 0.01) * 0.1 + 0.9; // Slow pulse (0.8 to 1.0 scale)
            const currentRadius = hero.size * 0.8 * pulse;
            const currentAlpha = (0.5 + Math.sin(elapsed * 0.005) * 0.2) * (1 - progress * 0.5) ; // Pulsating alpha, fades out slightly
    
            aura.beginFill(0xFF0000, currentAlpha * 0.6); // Red
            aura.drawCircle(0, 0, currentRadius);
            aura.endFill();
    
            return true;
        }, buffDurationMs);

        if (didHeal) {
            for (let i = 0; i < 10; i++) {
                const particle = new Graphics();
                particle.x = hero.x;
                particle.y = hero.y;
                const speed = 120 + Math.random() * 180;
                const angle = Math.random() * Math.PI * 2;
                const particleVx = Math.cos(angle) * speed;
                const particleVy = Math.sin(angle) * speed;
                const particleDuration = 0.5 + Math.random() * 0.5;
                let particleElapsed = 0;

                this.addEffect(particle, (deltaSeconds) => {
                    particleElapsed += deltaSeconds;
                    if (particleElapsed >= particleDuration) return false;

                    particle.x += particleVx * deltaSeconds;
                    particle.y += particleVy * deltaSeconds;
                    
                    const pProgress = particleElapsed / particleDuration;
                    const pAlpha = 1 - pProgress;
                    const pSize = (5 + Math.random() * 5) * (1 - pProgress);

                    particle.clear();
                    particle.beginFill(0x00FF00, pAlpha * 0.8); // Green
                    particle.drawCircle(0, 0, pSize);
                    particle.endFill();
                    return true;
                }, particleDuration * 1000);
            }
        }
    }

    public showGolpeGiratorio(hero: CombatCapable, abilityDurationMs: number): void { // Changed to CombatCapable
        const numBlades = 8;
        const bladeLength = hero.size * 0.8;
        const bladeWidth = hero.size * 0.15;
        const orbitRadius = hero.size * 0.6;
        let elapsed = 0;

        const container = new Container(); // Use a container for easier management
        
        const blades: Graphics[] = [];
        for (let i = 0; i < numBlades; i++) {
            const blade = new Graphics();
            blade.beginFill(0xD0D0D0); // Light grey metallic
            blade.drawRect(-bladeWidth / 2, -bladeLength / 2, bladeWidth, bladeLength);
            blade.endFill();
            blade.pivot.set(0, -bladeLength / 2); // Pivot at one end for rotation around hero
            container.addChild(blade);
            blades.push(blade);
        }

        this.addEffect(container, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            if (elapsed >= abilityDurationMs) {
                 blades.forEach(b => b.destroy()); // Clean up individual blades
                return false;
            }

            container.x = hero.x; // Update position if hero moves (though ability says hero is immobile)
            container.y = hero.y;

            const rotationSpeedRadPerSec = 12;
            const overallRotation = elapsed * 0.001 * rotationSpeedRadPerSec;

            blades.forEach((blade, i) => {
                const angle = (i / numBlades) * Math.PI * 2 + overallRotation;
                blade.x = Math.cos(angle) * orbitRadius;
                blade.y = Math.sin(angle) * orbitRadius;
                blade.rotation = angle + Math.PI / 2; // Point outwards
                blade.alpha = 0.7 + Math.sin(elapsed * 0.01 + i) * 0.3; // Shimmer
            });

            return true;
        }, abilityDurationMs);
    }

    // --- Assassin Ability Effects ---
    public showModoOcultoSmoke(hero: CombatCapable): void {
        const smokeDuration = 800; // ms
        for (let i = 0; i < 15; i++) { // 15 puffs of smoke
            const particle = new Graphics();
            // start in a small radius around the hero
            particle.x = hero.x + (Math.random() - 0.5) * hero.size * 0.8;
            particle.y = hero.y + (Math.random() - 0.5) * hero.size * 0.8;
            
            let elapsed = 0;
            const puffDuration = smokeDuration * (0.6 + Math.random() * 0.4);
            const startSize = 5 + Math.random() * 5;
            const endSize = 20 + Math.random() * 15;
            const driftX = (Math.random() - 0.5) * 30; // pixels per second
            const driftY = -10 - Math.random() * 20; // drift up

            this.addEffect(particle, (deltaSeconds) => {
                elapsed += deltaSeconds * 1000;
                const progress = elapsed / puffDuration;
                if (progress >= 1) return false;

                particle.x += driftX * deltaSeconds;
                particle.y += driftY * deltaSeconds;

                const currentSize = startSize + (endSize - startSize) * progress;
                const alpha = 0.6 * (1 - progress);

                particle.clear();
                particle.beginFill(0x808080, alpha); // Grey smoke
                particle.drawCircle(0, 0, currentSize);
                particle.endFill();

                return true;
            }, puffDuration);
        }
    }

    public showApunhalarTeleport(startX: number, startY: number, endX: number, endY: number): void {
        const totalDist = Math.hypot(endX - startX, endY - startY);
        const numParticles = Math.max(10, Math.floor(totalDist / 10));
        const duration = 200; // ms
    
        for(let i=0; i < numParticles; i++) {
            const particle = new Graphics();
            const pProgress = i / numParticles;
            particle.x = startX + (endX - startX) * pProgress;
            particle.y = startY + (endY - startY) * pProgress;
            
            let elapsed = 0;
            const pDuration = duration + Math.random() * 100;
            
            this.addEffect(particle, (delta) => {
                elapsed += delta * 1000;
                const progress = elapsed / pDuration;
                if (progress >= 1) return false;
                
                const size = (3 + Math.random() * 3) * (1-progress);
                const alpha = 0.8 * (1 - progress);
                
                particle.clear();
                particle.beginFill(0xFFFFFF, alpha); // White smoke
                particle.drawCircle(0, 0, size);
                particle.endFill();
                
                return true;
            }, pDuration);
        }
    }

    public showPontosVitaisDebuff(target: CombatCapable, durationMs: number): void {
        const container = new Container();
        const style = new TextStyle({ fontSize: 20, fill: '#FF0000' });
        const bloodDrop = new Text('🩸', style);
        bloodDrop.anchor.set(0.5);
        container.addChild(bloodDrop);
    
        let elapsed = 0;
        const orbitRadius = target.size * 0.7 + 5;
        const rotationSpeed = 6; // radians per second
    
        this.addEffect(container, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            
            if (!target.isAlive || elapsed >= durationMs) {
                return false;
            }
    
            container.x = target.x;
            container.y = target.y - target.size * 0.6; // position above target
    
            const angle = elapsed * 0.001 * rotationSpeed;
            bloodDrop.x = Math.cos(angle) * orbitRadius;
            bloodDrop.y = Math.sin(angle * 2) * (orbitRadius * 0.2); // make it bob up and down
    
            bloodDrop.alpha = 0.7 + Math.sin(angle * 1.5) * 0.3; // flicker alpha
    
            return true;
        }, durationMs);
    }

    public showAgilidadeExtrema(hero: CombatCapable, durationMs: number): void {
        const container = new Container();
        let elapsed = 0;
        let lastParticleTime = 0;

        const particles: { g: Graphics, life: number, maxLife: number, angle: number, startDist: number }[] = [];

        this.addEffect(container, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            if (elapsed >= durationMs || !hero.isAlive) {
                particles.forEach(p => { container.removeChild(p.g); p.g.destroy(); });
                return false;
            }

            container.x = hero.x;
            container.y = hero.y;

            // Create new particles periodically
            if (elapsed - lastParticleTime > 100) { // every 100ms
                lastParticleTime = elapsed;
                for(let i=0; i < 2; i++) { // 2 lines per burst
                    const pGraphics = new Graphics();
                    
                    const particle = {
                        g: pGraphics,
                        life: 0,
                        maxLife: 0.3 + Math.random() * 0.2, // short life
                        angle: Math.random() * Math.PI * 2,
                        startDist: hero.size * 0.5,
                    };
                    particles.push(particle);
                    container.addChild(pGraphics);
                }
            }

            // Update existing particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += deltaSeconds;
                if (p.life >= p.maxLife) {
                    container.removeChild(p.g);
                    p.g.destroy();
                    particles.splice(i, 1);
                    continue;
                }
                
                const progress = p.life / p.maxLife;
                const alpha = 0.8 * (1 - progress);
                const currentDist = p.startDist + 15 * progress;
                const length = 10 * (1 - progress);

                p.g.clear();
                p.g.lineStyle(2, 0xFFFFFF, alpha);
                p.g.moveTo(Math.cos(p.angle) * currentDist, Math.sin(p.angle) * currentDist);
                p.g.lineTo(Math.cos(p.angle) * (currentDist + length), Math.sin(p.angle) * (currentDist + length));
            }

            return true;
        }, durationMs);
    }

    // --- Archer Ability Effects ---
    public showHabilidadeEPrecisao(hero: CombatCapable, buffDurationMs: number): void {
        const aura = new Graphics();
        let elapsed = 0;

        this.addEffect(aura, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            if (elapsed >= buffDurationMs) return false;

            aura.x = hero.x;
            aura.y = hero.y;

            aura.clear();
            const pulse = elapsed * 0.05;
            const alpha = 0.7 * (1 - (elapsed / buffDurationMs));
            const radius = hero.size * 0.7;

            // Outer spiky aura
            aura.lineStyle(3, 0x2EE6D0, alpha * 0.8); // Teal color
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3 + pulse * 0.5;
                const x1 = Math.cos(angle) * radius;
                const y1 = Math.sin(angle) * radius;
                const x2 = Math.cos(angle) * (radius + 10);
                const y2 = Math.sin(angle) * (radius + 10);
                aura.moveTo(x1, y1).lineTo(x2, y2);
            }

            // Inner glow
            aura.beginFill(0x48BB78, alpha * 0.3); // Green
            aura.drawCircle(0, 0, radius * (0.8 + Math.sin(pulse) * 0.1));
            aura.endFill();

            return true;
        }, buffDurationMs);
    }

    public showDisparoMultiplo(heroX: number, heroY: number, directionAngle: number, coneAngleDegrees: number, numProjectiles: number, range: number): void {
        const coneAngleRad = coneAngleDegrees * (Math.PI / 180);
        const angleStep = coneAngleRad / (numProjectiles > 1 ? numProjectiles - 1 : 1);
        const startAngle = directionAngle - coneAngleRad / 2;

        const createArrowGraphic = (): Graphics => {
            const arrow = new Graphics();
            const length = 18;
            const headL = 6;
            const headW = 5;

            // Fletching
            arrow.lineStyle(2.5, 0xA5D6A7); // Archer green
            arrow.moveTo(-length/2, 0);
            arrow.lineTo(-length/2-5, 3);
            arrow.moveTo(-length/2, 0);
            arrow.lineTo(-length/2-5, -3);

            // Shaft
            arrow.lineStyle(1.5, 0xA1887F); // Brownish-grey
            arrow.moveTo(-length/2, 0);
            arrow.lineTo(length/2, 0);
            
            // Head
            arrow.beginFill(0x546E7A); // Slate-grey
            arrow.lineStyle(0);
            arrow.moveTo(length/2, 0);
            arrow.lineTo(length/2 - headL, headW);
            arrow.lineTo(length/2 - headL, -headW);
            arrow.closePath();
            arrow.endFill();

            return arrow;
        };

        for (let i = 0; i < numProjectiles; i++) {
            const angle = numProjectiles === 1 ? directionAngle : startAngle + i * angleStep;
            
            const arrowGraphic = createArrowGraphic();
            arrowGraphic.x = heroX;
            arrowGraphic.y = heroY;
            arrowGraphic.rotation = angle; // Set initial rotation

            const duration = 1600; // ms
            let elapsed = 0;

            this.addEffect(arrowGraphic, (deltaSeconds) => {
                elapsed += deltaSeconds * 1000;
                const progress = elapsed / duration;
                if (progress >= 1) {
                    return false;
                }

                const currentDist = range * progress;
                arrowGraphic.alpha = 1.0 - progress;

                arrowGraphic.x = heroX + Math.cos(angle) * currentDist;
                arrowGraphic.y = heroY + Math.sin(angle) * currentDist;

                return true;
            }, duration);
        }
    }

    public showTiroMortalHit(enemy: CombatCapable): void {
        const styleOptions = {
            fontSize: enemy.size * 1.5,
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
        };
        const style = new TextStyle(styleOptions);
        const skull = new Text('☠️', style);
        skull.anchor.set(0.5);
        skull.x = enemy.x;
        skull.y = enemy.y - enemy.size * 0.5;
        
        const duration = 800;
        let elapsed = 0;
        const floatSpeed = 30; // pixels per second

        this.addEffect(skull, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            if (elapsed >= duration) return false;

            const progress = elapsed / duration;
            skull.alpha = 1.0 - progress; // Fade out
            skull.y -= floatSpeed * deltaSeconds; // Float up
            skull.scale.set(1.0 + progress * 0.5); // Grow slightly

            return true;
        }, duration);
    }

    public showAtaquesLetais(hero: CombatCapable, buffDurationMs: number): void {
        const aura = new Graphics();
        let elapsed = 0;

        this.addEffect(aura, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            if (elapsed >= buffDurationMs) return false;

            // Update position in case hero moves
            aura.x = hero.x;
            aura.y = hero.y;

            aura.clear();
            const pulse = elapsed * 0.05;
            const alpha = 0.7 * (1 - (elapsed / buffDurationMs)); // Fade out over duration
            const radius = hero.size * 0.7;

            // Outer spiky aura
            aura.lineStyle(3, 0xFF3333, alpha * 0.8);
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3 + pulse * 0.5;
                const x1 = Math.cos(angle) * radius;
                const y1 = Math.sin(angle) * radius;
                const x2 = Math.cos(angle) * (radius + 10);
                const y2 = Math.sin(angle) * (radius + 10);
                aura.moveTo(x1, y1).lineTo(x2, y2);
            }

            // Inner glow
            aura.beginFill(0x8B0000, alpha * 0.3); // Dark red
            aura.drawCircle(0, 0, radius * (0.8 + Math.sin(pulse) * 0.1));
            aura.endFill();

            return true;
        }, buffDurationMs);
    }

    // --- Guardian Ability Effects ---

    public showShieldBashImpact(targetX: number, targetY: number): void {
        const impact = new Graphics();
        impact.x = targetX;
        impact.y = targetY;

        const duration = 250; // ms
        let elapsed = 0;

        this.addEffect(impact, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            const progress = elapsed / duration;
            if (progress >= 1) {
                return false;
            }

            const radius = 30 * Math.sin(progress * Math.PI); // Expands and contracts
            const alpha = 1.0 - progress;

            impact.clear();
            impact.lineStyle(4, 0xFFFF00, alpha);
            impact.drawCircle(0, 0, radius);

            return true;
        }, duration);
    }

    public showStunEffect(target: CombatCapable, durationMs: number): void {
        const container = new Container();
        let elapsed = 0;

        const stars: Text[] = [];
        const numStars = 3;
        const orbitRadius = target.size * 0.7;

        for (let i = 0; i < numStars; i++) {
            const starStyle = { fontSize: 16, fill: '#FFD700', stroke: '#000000', strokeThickness: 2 };
            const star = new Text('💫', starStyle);
            star.anchor.set(0.5);
            container.addChild(star);
            stars.push(star);
        }
        
        this.addEffect(container, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            
            if (!target.isAlive || elapsed >= durationMs) {
                stars.forEach(s => s.destroy());
                return false;
            }

            container.x = target.x;
            container.y = target.y - target.size;

            const rotationSpeed = 5; // radians per second
            stars.forEach((star, i) => {
                const angle = (i / numStars) * Math.PI * 2 + elapsed * 0.001 * rotationSpeed;
                star.x = Math.cos(angle) * orbitRadius;
                star.y = Math.sin(angle * 0.7) * (orbitRadius * 0.3); // Elliptical orbit to give some depth
            });

            return true;
        }, durationMs);
    }

    public showTaunt(caster: CombatCapable, radius: number): void {
        const container = new Container();
    
        const ring = new Graphics();
        container.addChild(ring);
    
        const emojiStyleOptions = { fontSize: 32, fill: 'white', dropShadow: true, dropShadowColor: 'black', dropShadowDistance: 2 };
        const emojiStyle = new TextStyle(emojiStyleOptions);
        const emoji = new Text('🤬', emojiStyle);
        emoji.anchor.set(0.5);
        container.addChild(emoji);
    
        const duration = 800; // ms
        let elapsed = 0;
    
        this.addEffect(container, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            const progress = elapsed / duration;
            if (progress >= 1) {
                return false;
            }
            
            container.x = caster.x;
            container.y = caster.y;
            
            const ringRadius = radius * progress;
            const ringAlpha = 1 - progress;
    
            ring.clear();
            ring.lineStyle(4 + (1 - progress) * 4, 0xFF4500, ringAlpha); 
            ring.drawCircle(0, 0, ringRadius);
            
            emoji.y = -caster.size - (progress * 20);
            emoji.alpha = 1 - progress;
            emoji.scale.set(1 + progress * 0.5);
    
            return true;
        }, duration);
    }

    public showProtecaoCompartilhada(heroes: CombatCapable[]): void {
        heroes.forEach(hero => {
            const container = new Container();

            const duration = 1200; // ms
            let elapsed = 0;

            const glow = new Graphics();
            container.addChild(glow);

            const particles: {g: Graphics, vx: number, vy: number, rotation: number}[] = [];
            for (let i = 0; i < 20; i++) {
                const p = new Graphics();
                const angle = Math.random() * Math.PI * 2;
                const speed = 30 + Math.random() * 90;
                particles.push({ 
                    g: p, 
                    vx: Math.cos(angle) * speed, 
                    vy: Math.sin(angle) * speed,
                    rotation: Math.random() * Math.PI
                });
                container.addChild(p);
            }

            this.addEffect(container, (deltaSeconds) => {
                elapsed += deltaSeconds * 1000;
                const progress = elapsed / duration;
                if (progress >= 1) return false;

                container.x = hero.x;
                container.y = hero.y;

                const glowAlpha = Math.sin(progress * Math.PI);
                const glowRadius = hero.size * (0.5 + progress * 0.8);
                glow.clear();
                glow.beginFill(0xFFFFFF, glowAlpha * 0.4);
                glow.drawCircle(0, 0, glowRadius);
                glow.endFill();

                const particleAlpha = 1 - progress;
                const gravity = 30;
                particles.forEach(p => {
                    p.g.x += p.vx * deltaSeconds;
                    p.g.y += p.vy * deltaSeconds;
                    p.vy += gravity * deltaSeconds; 
                    const pSize = (1 + Math.random() * 2) * (1 - progress);
                    p.g.clear();
                    p.g.beginFill(0xFFD700, particleAlpha);
                    p.g.drawCircle(0, 0, pSize);
                    p.g.endFill();
                });
                
                return true;
            }, duration);
        });
    }

    // --- Mage Ability Effects ---

    public showExplosaoMagicaReady(hero: CombatCapable): void {
        const glow = new Graphics();
        const duration = hero.activeBuffs.find(b => b.abilityId === 'MAGO_EXPLOSAO_MAGICA')?.remainingMs || 5000;
        let elapsed = 0;

        this.addEffect(glow, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            const buffStillActive = hero.activeBuffs.some(b => b.abilityId === 'MAGO_EXPLOSAO_MAGICA');
            if (elapsed >= duration || !buffStillActive) {
                return false;
            }

            glow.x = hero.x;
            glow.y = hero.y;

            const pulse = (Math.sin(elapsed * 0.01) + 1) / 2; // 0 to 1 pulse
            const currentRadius = hero.size * 0.2 + pulse * hero.size * 0.4;
            const currentAlpha = 0.5 + pulse * 0.3;

            glow.clear();
            glow.beginFill(0xFF8C00, currentAlpha); // Dark Orange
            glow.drawCircle(0, 0, currentRadius);
            glow.endFill();

            return true;
        }, duration);
    }

    public showBolaDeFogoHit(targetX: number, targetY: number): void {
        // This is now handled by the explosion effect, which is more generic
        this.showExplosaoMagica(targetX, targetY, 20);
    }
    
    public showExplosaoMagica(targetX: number, targetY: number, radius: number): void {
        // Shockwave effect
        const shockwave = new Graphics();
        shockwave.x = targetX;
        shockwave.y = targetY;
        const shockwaveDuration = 350;
        let shockwaveElapsed = 0;
        this.addEffect(shockwave, (delta) => {
            shockwaveElapsed += delta * 1000;
            const progress = shockwaveElapsed / shockwaveDuration;
            if (progress >= 1) return false;
    
            const currentRadius = radius * progress;
            const alpha = 1 - progress;
            shockwave.clear();
            const color = 0xFFD700; // Yellow -> Orange
            shockwave.lineStyle(5 * alpha, color, alpha);
            shockwave.drawCircle(0, 0, currentRadius);
            return true;
        }, shockwaveDuration);
    
        // Core explosion flash
        const flash = new Graphics();
        flash.x = targetX;
        flash.y = targetY;
        const flashDuration = 150;
        let flashElapsed = 0;
        this.addEffect(flash, (delta) => {
            flashElapsed += delta * 1000;
            const progress = flashElapsed / flashDuration;
            if (progress >= 1) return false;
            
            const alpha = Math.sin(progress * Math.PI); // Fade in and out quickly
            flash.clear();
            flash.beginFill(0xFFFFFF, alpha); // White hot core
            flash.drawCircle(0, 0, radius * 0.6);
            flash.endFill();
            flash.beginFill(0xFFEE00, alpha * 0.8); // Yellow glow
            flash.drawCircle(0, 0, radius * 0.8);
            flash.endFill();
            return true;
        }, flashDuration);
    
        // Particle burst (Sparks)
        for (let i = 0; i < 25; i++) { 
            const particle = new Graphics();
            const startAngle = Math.random() * Math.PI * 2;
            const startRadius = Math.random() * radius * 0.1;
            particle.x = targetX + Math.cos(startAngle) * startRadius;
            particle.y = targetY + Math.sin(startAngle) * startRadius;
            
            const speed = 240 + Math.random() * 300; // pixels per second
            const angle = Math.random() * Math.PI * 2;
            const particleVx = Math.cos(angle) * speed;
            let particleVy = Math.sin(angle) * speed;
            const gravity = 300; // pixels/sec^2
            
            let particleElapsed = 0;
            const sparkDuration = 0.2 + Math.random() * 0.2; // in seconds

            this.addEffect(particle, (delta) => {
                particleElapsed += delta;
                if (particleElapsed >= sparkDuration) return false;
    
                particle.x += particleVx * delta;
                particle.y += particleVy * delta;
                particleVy += gravity * delta; 
    
                const pProgress = particleElapsed / sparkDuration;
                const pAlpha = 1 - pProgress;
                const pSize = 1 + (1.5 * (1 - pProgress));
    
                particle.clear();
                particle.beginFill(0xFFFFFF, pAlpha);
                particle.drawCircle(0, 0, pSize);
                particle.endFill();
                return true;
            }, sparkDuration * 1000);
        }

        // Particle burst (Embers)
        for (let i = 0; i < 30; i++) { 
            const particle = new Graphics();
            particle.x = targetX;
            particle.y = targetY;
            
            const speed = 90 + Math.random() * 180; // pixels per second
            const angle = Math.random() * Math.PI * 2;
            const particleVx = Math.cos(angle) * speed;
            let particleVy = Math.sin(angle) * speed - 60; // Slight upward bias
            const gravity = 720; // pixels/sec^2
            
            let particleElapsed = 0;
            const emberDuration = 0.5 + Math.random() * 0.4; // in seconds
    
            const particleColor = Math.random() > 0.4 ? 0xFF8C00 : 0xFF4500;
    
            this.addEffect(particle, (delta) => {
                particleElapsed += delta;
                if (particleElapsed >= emberDuration) return false;
    
                particle.x += particleVx * delta;
                particle.y += particleVy * delta;
                particleVy += gravity * delta;
    
                const pProgress = particleElapsed / emberDuration;
                const pAlpha = 1 - pProgress;
                const pSize = (2 + Math.random() * 3) * (1 - pProgress * 0.5);
    
                particle.clear();
                particle.beginFill(particleColor, pAlpha);
                particle.drawCircle(0, 0, pSize);
                particle.endFill();
                return true;
            }, emberDuration * 1000);
        }
    }

    public showIntelectoSurreal(heroes: CombatCapable[]): void {
        const buffDurationMs = 15000;

        heroes.forEach(hero => {
            if (!hero.isAlive) return;

            const container = new Container();
            const particles: { g: Graphics, life: number, maxLife: number, vx: number, vy: number }[] = [];
            let elapsed = 0;

            this.addEffect(container, (deltaSeconds) => {
                elapsed += deltaSeconds * 1000;
                if (elapsed >= buffDurationMs || !hero.isAlive) {
                    particles.forEach(p => { container.removeChild(p.g); p.g.destroy(); });
                    return false;
                }

                container.x = hero.x;
                container.y = hero.y;

                // Create new particles
                if (Math.random() < 0.5) {
                    const pGraphics = new Graphics();
                    const angle = Math.random() * Math.PI * 2;
                    const radius = hero.size * 0.7;
                    pGraphics.x = Math.cos(angle) * radius;
                    pGraphics.y = Math.sin(angle) * radius;

                    const particle = {
                        g: pGraphics,
                        life: 0,
                        maxLife: 0.5 + Math.random() * 0.5, // 0.5 to 1 second life
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                    };
                    particles.push(particle);
                    container.addChild(pGraphics);
                }

                // Update existing particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.life += deltaSeconds;
                    if (p.life >= p.maxLife) {
                        container.removeChild(p.g);
                        p.g.destroy();
                        particles.splice(i, 1);
                        continue;
                    }
                    p.g.x += p.vx * deltaSeconds;
                    p.g.y += p.vy * deltaSeconds;
                    
                    const progress = p.life / p.maxLife;
                    const alpha = 1 - progress;
                    const scale = 1 - progress;
                    
                    p.g.clear();
                    p.g.beginFill(0xFFFFFF, alpha * 0.9);
                    p.g.drawCircle(0, 0, (1 + Math.random()) * scale);
                    p.g.endFill();
                }

                return true;
            }, buffDurationMs);
        });
    }

    public showExplosaoGelida(casterX: number, casterY: number, radius: number): void {
        const container = new Container();
        container.x = casterX;
        container.y = casterY;
        const duration = 500; // ms
        let elapsed = 0;

        const shards: { g: Graphics, startDist: number, angle: number }[] = [];
        for (let i = 0; i < 40; i++) {
            const shardGraphics = new Graphics();
            const angle = Math.random() * Math.PI * 2;
            const startDist = Math.random() * radius * 0.2; // Start inside, expand out
            shardGraphics.rotation = Math.random() * Math.PI * 2;
            shards.push({ g: shardGraphics, startDist: startDist, angle: angle });
            container.addChild(shardGraphics);
        }

        this.addEffect(container, (deltaSeconds) => {
            elapsed += deltaSeconds * 1000;
            const progress = elapsed / duration;
            if (progress >= 1) {
                shards.forEach(s => s.g.destroy());
                return false;
            }

            const alpha = 1 - progress;
            
            shards.forEach(shard => {
                const currentDist = shard.startDist + (radius - shard.startDist) * progress;
                shard.g.x = Math.cos(shard.angle) * currentDist;
                shard.g.y = Math.sin(shard.angle) * currentDist;

                shard.g.clear();
                shard.g.beginFill(0xADD8E6, alpha * 0.8); // Light blue
                shard.g.lineStyle(1, 0xFFFFFF, alpha);
                const size = (2 + Math.random() * 4) * (1 - progress); // shrink as they fly
                if (size > 0.5) {
                    shard.g.moveTo(0, -size);
                    shard.g.lineTo(-size * 0.5, size * 0.5);
                    shard.g.lineTo(size * 0.5, size * 0.5);
                    shard.g.closePath();
                    shard.g.endFill();
                }
            });

            return true;
        }, duration);
    }
}

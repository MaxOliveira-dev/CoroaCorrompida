

import { Character } from './Character';
import type { CombatCapable, UpdateResult } from '../entityInterfaces';
import { Projectile } from './Projectile'; 
import { DamageNumber } from './DamageNumber';
import { DeathEffect } from './DeathEffect';
import { calculateFinalStatsForEntity, distanceToTarget, getMultiShotTargets } from '../entityUtils';
import { drawRoundedRect } from '../drawingUtils';
import { GRID_SIZE } from '../gameConstants';
import type { BaseStats, ClassData, EquippedItems } from '../../../types';
import { EnemyEntity } from './EnemyEntity';


export class HeroEntity extends Character {
    // isPlayer is inherited from Character
    constructor(
        x: number, y: number,
        initialCombatStats: ReturnType<typeof calculateFinalStatsForEntity>,
        isPlayer: boolean, // This sets the isPlayer property in the Character constructor
        playerBaseStats: BaseStats, // Source for recalculation
        classDetails: ClassData,    // Source for recalculation
        equippedItems?: EquippedItems // Source for recalculation
    ) {
        super(
            x, y, 
            initialCombatStats, 
            isPlayer,
            playerBaseStats,
            classDetails,
            undefined, // no enemyDetails for hero
            1, // playerLevelScale default
            equippedItems
        );
        this._entityType = 'hero';
        // this.size is now a getter from combatStats
    }

    public afterDealingDamage(target: CombatCapable, allEnemies: CombatCapable[]): void {
        if (target instanceof EnemyEntity && !target.isAgro) {
            target.isAgro = true;
            target.agroAllies(allEnemies);
        }
    }

    performAttack(): { damageDealt: number; isCrit: boolean; lifeStolen?: number; projectile?: Projectile; } | null {
        if (!this.target) return null;
    
        let isCrit: boolean = !!(this.combatStats.chanceCritica && Math.random() * 100 < this.combatStats.chanceCritica);
        let finalDamage = this.effectiveDamage;
        let bonusDamageFromBuff = 0;
    
        const attackModifierBuffIndex = this.activeBuffs.findIndex(b => b.effects.nextAttackCrit || b.effects.nextAttackBonusDamagePercentTargetMaxHp);
        if (attackModifierBuffIndex !== -1) {
            const buff = this.activeBuffs[attackModifierBuffIndex];
            if (buff.effects.nextAttackCrit) {
                isCrit = true;
            }
            if (buff.effects.nextAttackBonusDamagePercentTargetMaxHp && this.target.maxHp) {
                bonusDamageFromBuff = this.target.maxHp * (buff.effects.nextAttackBonusDamagePercentTargetMaxHp / 100);
            }
            // Do not consume the buff here if it also has splash. The projectile will consume it.
            if (!buff.effects.nextAttackSplash) {
                this.activeBuffs.splice(attackModifierBuffIndex, 1);
                this.recalculateStats();
            }
        }
    
        if (isCrit) {
            finalDamage = Math.round(finalDamage * (1 + (this.combatStats.danoCritico || 50) / 100));
        }
        finalDamage += bonusDamageFromBuff;
        finalDamage = Math.max(1, Math.round(finalDamage));
    
        let lifeStolen;
        if (this.combatStats.vampirismo && this.combatStats.vampirismo > 0) {
            const potentialLifeStealDamage = this.target.isBoss ? finalDamage * 0.5 : finalDamage;
            lifeStolen = Math.ceil(potentialLifeStealDamage * (this.combatStats.vampirismo / 100));
            this.currentHp = Math.min(this.maxHp, this.currentHp + lifeStolen);
        }
    
        this.attackAnimProgress = 1;
    
        if (this.range > GRID_SIZE * 1.1) {
            let projectileOptions: any = { color: this.bodyColor || 'grey' };

            if (this.combatStats.weaponRepresentation === 'bow') {
                projectileOptions.displayType = 'arrow';
            } else if (this.combatStats.weaponRepresentation === 'staff') {
                projectileOptions.displayType = 'magic_orb';
                projectileOptions.trailType = 'magic_dust';
                projectileOptions.size = 8;
                projectileOptions.color = this.combatStats.color || '#90CAF9';
            }

            // Check for splash buff and pass it to projectile
            const splashBuffIndex = this.activeBuffs.findIndex(b => b.effects.nextAttackSplash);
            if (splashBuffIndex !== -1) {
                const buff = this.activeBuffs[splashBuffIndex];
                projectileOptions.splashConfig = buff.effects.nextAttackSplash;
                // The buff is consumed once the special attack is fired
                this.activeBuffs.splice(splashBuffIndex, 1);
                this.recalculateStats();
            }

            return { damageDealt: finalDamage, isCrit, lifeStolen, projectile: new Projectile(this.x, this.y, this, this.target, finalDamage, isCrit, projectileOptions) };
        } else {
            // Melee attacks could also have splash, but the logic would need to be in the update loop.
            // For now, only projectiles handle splash from buffs.
            return { damageDealt: finalDamage, isCrit, lifeStolen };
        }
    }


    update(deltaTime: number, heroes: CombatCapable[], enemies: CombatCapable[], canvasSize: { width: number; height: number; }): { results: UpdateResult[], abilityToTrigger?: string } {
        const baseUpdate = super.update(deltaTime, heroes, enemies, canvasSize); 
        const results = baseUpdate.results;
        if (!this.isAlive) return baseUpdate;
        
        // --- DASH LOGIC ---
        const dashBuff = this.activeBuffs.find(b => b.effects.dashToTarget);
        if (dashBuff?.effects.dashToTarget) {
            const dashInfo = dashBuff.effects.dashToTarget;
            const dashTarget = enemies.find(e => e.id === dashInfo.targetId);

            if (dashTarget && dashTarget.isAlive) {
                this.target = dashTarget; // Force target override
                const dist = distanceToTarget(this, dashTarget);
                
                // Check for hit
                if (dist < (this.size / 2 + dashTarget.size / 2)) {
                    // HIT! Apply effect
                    const onHit = dashInfo.onHitEffect;
                    
                    let damage = (this.classDetails?.damage || 0) +
                                 (this.combatStats.letalidade * (onHit.lethalityMultiplier || 0)) +
                                 (this.combatStats.vigor * (onHit.vigorMultiplier || 0));

                    if (onHit.alwaysCrit) {
                        damage = Math.round(damage * (1 + (this.combatStats.danoCritico || 50) / 100));
                    }
                    damage = Math.max(1, Math.round(damage));

                    const dmgTaken = dashTarget.takeDamage(damage, true, this);
                    this.afterDealingDamage(dashTarget, enemies);
                    
                    if (typeof dmgTaken === 'number') {
                        results.push({ newDamageNumber: new DamageNumber(dmgTaken, dashTarget.x, dashTarget.y, 'orange') });
                    }
                    
                    // Apply stun
                    dashTarget.applyDebuff({
                        id: `stun_${dashTarget.id}_intercept`,
                        abilityId: 'GUERREIRO_INTERCEPTAR_STUN',
                        name: 'Atordoado',
                        icon: '💫',
                        durationMs: onHit.stunDurationMs,
                        remainingMs: onHit.stunDurationMs,
                        effects: { isImmobile: true },
                        appliedAt: Date.now(),
                        isBuff: false,
                        sourceEntityId: this.id,
                        targetEntityId: dashTarget.id
                    });

                    this.activeBuffs = this.activeBuffs.filter(b => b.id !== dashBuff.id);
                    this.recalculateStats();
                } else {
                    // Not hit yet, continue moving
                    const angle = Math.atan2(dashTarget.y - this.y, dashTarget.x - this.x);
                    const modifiedSpeed = this.movementSpeed * dashInfo.speedMultiplier;
                    this.x += Math.cos(angle) * modifiedSpeed;
                    this.y += Math.sin(angle) * modifiedSpeed;
                }
            } else {
                // Target died or doesn't exist, remove buff
                this.activeBuffs = this.activeBuffs.filter(b => b.id !== dashBuff.id);
                this.recalculateStats();
            }
            
            baseUpdate.results.push(...results);
            return baseUpdate; // Return early from update to prevent other movement/attack logic
        }

        // --- END DASH LOGIC ---

        this.findTarget(enemies); 
        
        // AI LOGIC for non-player heroes
        if (!this.isPlayer && this.target && this.target.isAlive) {
            const usableAbilities = this.abilities.filter(ab => (this.abilityCooldowns[ab.id] || 0) <= 0);
            if (usableAbilities.length > 0) {
                // Simple AI: 1% chance per frame to use an ability if off cooldown
                if (Math.random() < 0.01) { 
                     const abilityToUse = usableAbilities[Math.floor(Math.random() * usableAbilities.length)];
                     // A simple check to not waste certain abilities
                     if (abilityToUse.targetType === 'SINGLE_ENEMY' && distanceToTarget(this, this.target) > this.range * 1.5) {
                        // Don't use single target ability if target is too far
                     } else {
                        return { results, abilityToTrigger: abilityToUse.id };
                     }
                }
            }
        }

        if (this.target && this.target.isAlive) {
            let targetX = this.target.x;
            let targetY = this.target.y;

            if (this.isProbingUnstuck && this.probeFrameCounter > 0) {
                const angleToOriginalTarget = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                const probeAngle = angleToOriginalTarget + this.probeAngleOffset;
                targetX = this.x + Math.cos(probeAngle) * (this.range * 2); 
                targetY = this.y + Math.sin(probeAngle) * (this.range * 2);
            }
            
            const dist = distanceToTarget(this, this.target);

            if (dist > this.range || (this.isProbingUnstuck && this.probeFrameCounter > 0)) {
                this.updateMovement(targetX, targetY, canvasSize.width, canvasSize.height);
            } else {
                this.isProbingUnstuck = false; 
                this.probeFrameCounter = 0;
                this.stuckFrameCounter = 0;

                const attackResult = this.attack();
                if (attackResult) {
                    if (attackResult.projectile) { // Ranged Attack
                        const projectiles: Projectile[] = [attackResult.projectile];
                        const multiShotBuff = this.activeBuffs.find(b => b.effects.multiShot);
                        
                        if (multiShotBuff?.effects.multiShot && this.target) {
                            const additionalTargets = getMultiShotTargets(this, this.target, enemies, multiShotBuff.effects.multiShot.count);
                            
                            for (const additionalTarget of additionalTargets) {
                                const newProjectile = new Projectile(
                                    attackResult.projectile.x,
                                    attackResult.projectile.y,
                                    attackResult.projectile.attacker,
                                    additionalTarget,
                                    attackResult.projectile.damage,
                                    attackResult.projectile.isCrit,
                                    {
                                        color: attackResult.projectile.color,
                                        size: attackResult.projectile.size,
                                        speed: attackResult.projectile.speed,
                                        piercing: attackResult.projectile.piercing,
                                        lifetimeMs: attackResult.projectile.lifetimeMs,
                                        debuffToApply: attackResult.projectile.debuffToApply,
                                        sourceAbilityProperties: attackResult.projectile.sourceAbilityProperties,
                                        splashConfig: attackResult.projectile.splashConfig,
                                        displayType: attackResult.projectile.displayType,
                                        trailType: attackResult.projectile.trailType,
                                    }
                                );
                                projectiles.push(newProjectile);
                            }
                        }
        
                        projectiles.forEach((proj, index) => {
                            const lifeStealForThisProj = index === 0 ? attackResult.lifeStolen : undefined;
                            results.push({ newProjectile: proj, lifeStolen: lifeStealForThisProj });
                        });
        
                    } else if (this.target) { // Melee Attack
                        const oldTargetHp = this.target.currentHp;
                        const dmgTaken = this.target.takeDamage(attackResult.damageDealt, attackResult.isCrit, this);
                        
                        this.afterDealingDamage(this.target, enemies);
                        
                        let result: UpdateResult = { lifeStolen: attackResult.lifeStolen };

                        if (typeof dmgTaken === 'number') {
                            result.newDamageNumber = new DamageNumber(dmgTaken, this.target.x, this.target.y, attackResult.isCrit ? 'orange' : 'white');
                        } else if (dmgTaken === 'esquiva') {
                            result.newDamageNumber = new DamageNumber("Esquiva!", this.target.x, this.target.y, 'white');
                        } else if (dmgTaken === 'bloqueado') {
                            result.newDamageNumber = new DamageNumber("Bloqueado!", this.target.x, this.target.y, 'cyan');
                        }

                        if (this.target.currentHp <= 0 && oldTargetHp > 0 && !this.target.deathEffectCreated) {
                            const targetChar = this.target as Character;
                            result.newEffect = new DeathEffect(targetChar.x, targetChar.y, targetChar.combatStats.isBoss ? '#C62828' : '#757575', targetChar.combatStats.isBoss ? 35 : 15, targetChar.combatStats.isBoss ? 60 : 30);
                            targetChar.deathEffectCreated = true;
                        }
                        results.push(result);
                    }
                }
            }
        }
        return { results, abilityToTrigger: undefined };
    }

    private drawOrbitingShields(ctx: CanvasRenderingContext2D, chargeCount: number) {
        ctx.save();
        
        const orbitRadius = this.size * 1.2;
        const shieldSize = this.size * 0.3;
        const rotation = (Date.now() / 1000) * 2; // Radians per second
    
        for (let i = 0; i < chargeCount; i++) {
            const angle = rotation + (i * (Math.PI * 2 / chargeCount));
            const shieldX = this.x + Math.cos(angle) * orbitRadius;
            const shieldY = this.y + Math.sin(angle) * orbitRadius;
            
            ctx.fillStyle = 'rgba(135, 206, 250, 0.7)'; // Light sky blue with transparency
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 1.5;
    
            ctx.beginPath();
            ctx.moveTo(shieldX, shieldY - shieldSize * 0.6); // Top point
            ctx.lineTo(shieldX + shieldSize * 0.5, shieldY); // Right point
            ctx.lineTo(shieldX, shieldY + shieldSize * 0.6); // Bottom point
            ctx.lineTo(shieldX - shieldSize * 0.5, shieldY); // Left point
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
        }
    
        ctx.restore();
    }

    draw(ctx: CanvasRenderingContext2D, isPreview: boolean = false, isDragged: boolean = false) {
        if (!this.isAlive && !isPreview) return;

        ctx.save();
        
        const isInvisible = this.activeBuffs.some(b => b.effects.isInvisible);
        if (isDragged && !isPreview) {
            ctx.globalAlpha = isInvisible ? 0.3 : 0.7; // Lower alpha if dragged while invisible
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
        } else if (isInvisible && !isPreview) {
            ctx.globalAlpha = 0.4;
        }


        const lunge = isPreview ? 0 : Math.sin(this.attackAnimProgress * Math.PI) * (this.size * 0.2);
        let direction = 1; 
        if (!isPreview && this.target) {
            direction = Math.sign(this.target.x - this.x);
            if (direction === 0) direction = 1; // Default to right if directly on top
        } else if (isPreview) {
            direction = 1; 
        }
        
        ctx.translate(this.x + lunge * direction, this.y);

        const baseSize = this.size;
        const outlineColor = '#4A3B31'; 
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = baseSize * 0.06;

        const skinColor = this.color || '#F0D6B5'; 
        const shirtColor = this.bodyColor || '#4A80C0'; 
        const pantsColor = '#795548'; 
        const hairColor = '#6D4C41'; 
        const scarfColor = '#D32F2F'; 

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

        ctx.fillStyle = pantsColor;
        drawRoundedRect(ctx, -legWidth * 1.2 * direction, legTopY, legWidth, legHeight, legWidth * 0.4);
        ctx.fill(); ctx.stroke();
        drawRoundedRect(ctx, legWidth * 0.2 * direction, legTopY, legWidth, legHeight, legWidth * 0.4);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = shirtColor;
        drawRoundedRect(ctx, -bodyWidth / 2, bodyCenterY - bodyHeight / 2, bodyWidth, bodyHeight, baseSize * 0.1);
        ctx.fill(); ctx.stroke();
        
        const shoulderY = bodyCenterY - bodyHeight / 3;
        const armLength = baseSize * 0.3;

        ctx.fillStyle = skinColor; 
        ctx.strokeStyle = shirtColor; 
        ctx.lineWidth = armThickness; 
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-bodyWidth/2 * direction + (baseSize * 0.05 * direction), shoulderY); 
        ctx.lineTo(-bodyWidth/2 * direction - armLength * direction, shoulderY + armLength * 0.8); 
        ctx.stroke(); 
        
        ctx.fillStyle = skinColor; 
        ctx.strokeStyle = outlineColor; 
        ctx.lineWidth = baseSize * 0.06; 
        ctx.beginPath();
        ctx.arc(-bodyWidth/2 * direction - armLength * direction, shoulderY + armLength * 0.8, handRadius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.lineCap = 'butt'; 

        const weaponHandX = bodyWidth/2 * direction + (baseSize*0.05*direction);
        const weaponHandY = shoulderY + armLength * 0.2; 
        ctx.fillStyle = skinColor; 
        ctx.strokeStyle = shirtColor; 
        ctx.lineWidth = armThickness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bodyWidth/2 * direction - (baseSize * 0.05 * direction) , shoulderY);
        ctx.lineTo(weaponHandX, weaponHandY);
        ctx.stroke(); 

        ctx.fillStyle = skinColor; 
        ctx.strokeStyle = outlineColor; 
        ctx.lineWidth = baseSize * 0.06;
        ctx.beginPath();
        ctx.arc(weaponHandX, weaponHandY, handRadius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.lineCap = 'butt';

        const scarfYPos = bodyCenterY - bodyHeight / 2 - scarfHeight / 2 + baseSize * 0.04; 
        ctx.fillStyle = scarfColor;
        drawRoundedRect(ctx, -bodyWidth * 0.4, scarfYPos, bodyWidth * 0.8, scarfHeight, baseSize * 0.05);
        ctx.fill(); ctx.stroke();

        const headRelativeY = scarfYPos - headRadiusY + baseSize * 0.02; 
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(0, headRelativeY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

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

        ctx.fillStyle = outlineColor; 
        const eyeRelY = headRelativeY - baseSize * 0.03; 
        const eyeSpacing = headRadiusX * 0.35;
        ctx.beginPath();
        ctx.arc(-eyeSpacing * direction, eyeRelY, eyeRadius, 0, Math.PI * 2); 
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeSpacing * direction, eyeRelY, eyeRadius, 0, Math.PI * 2); 
        ctx.fill();

        ctx.save();
        ctx.translate(weaponHandX, weaponHandY); 

        const weaponType = this.combatStats.weaponRepresentation; 
        const weaponSizeScale = baseSize / 20; 

        if (weaponType === 'sword' || weaponType === 'axe') {
            ctx.rotate(direction === 1 ? -Math.PI / 5 : Math.PI / 5 + Math.PI); 
            const swordLength = 15 * weaponSizeScale;
            const swordWidth = 3 * weaponSizeScale;
            const guardWidth = 6 * weaponSizeScale;
            ctx.fillStyle = '#B0BEC5'; 
            drawRoundedRect(ctx, -swordWidth/2, -swordLength, swordWidth, swordLength, swordWidth*0.3);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#78909C'; 
            drawRoundedRect(ctx, -guardWidth/2, 0, guardWidth, 2*weaponSizeScale, 1*weaponSizeScale);
            ctx.fill(); ctx.stroke();
        } else if (weaponType === 'dagger') {
            ctx.rotate(direction === 1 ? -Math.PI / 5 : Math.PI / 5 + Math.PI);
            const daggerLength = 10 * weaponSizeScale;
            const daggerWidth = 2.5 * weaponSizeScale;
            ctx.fillStyle = '#B0BEC5';
            drawRoundedRect(ctx, -daggerWidth/2, -daggerLength, daggerWidth, daggerLength, daggerWidth*0.3);
            ctx.fill(); ctx.stroke();
        } else if (weaponType === 'bow') {
            ctx.rotate(direction === 1 ? -Math.PI / 2.5 : Math.PI / 2.5); 
            ctx.strokeStyle = '#8D6E63'; 
            const originalLineWidth = ctx.lineWidth; 
            ctx.lineWidth = 2 * weaponSizeScale; 
            const bowRadius = 10 * weaponSizeScale;
            ctx.beginPath();
            ctx.arc(0, 0, bowRadius, Math.PI * 0.8, Math.PI * 2.2); 
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bowRadius * Math.cos(Math.PI*0.8), bowRadius * Math.sin(Math.PI*0.8));
            ctx.lineTo(bowRadius * Math.cos(Math.PI*2.2), bowRadius * Math.sin(Math.PI*2.2));
            ctx.stroke();
            ctx.lineWidth = originalLineWidth; 
            ctx.strokeStyle = outlineColor; 
        } else if (weaponType === 'staff') {
            ctx.rotate(direction === 1 ? Math.PI / 8 : -Math.PI / 8 - Math.PI/2); 
            const staffLength = 18 * weaponSizeScale;
            const staffWidth = 2.5 * weaponSizeScale;
            const gemRadius = 4 * weaponSizeScale;
            ctx.fillStyle = '#A1887F'; 
            drawRoundedRect(ctx, -staffWidth/2, -staffLength + gemRadius, staffWidth, staffLength,1*weaponSizeScale);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = this.combatStats.color || '#4FC3F7'; 
            ctx.beginPath();
            ctx.arc(0, -staffLength + gemRadius*0.8, gemRadius, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        } else if (weaponType === 'shield') {
            const shieldW = 12 * weaponSizeScale;
            const shieldH = 15 * weaponSizeScale;
            const shieldOffsetX = direction === 1 ? -shieldW * 0.3 : shieldW * 0.3;
            ctx.fillStyle = '#A1887F'; 
            drawRoundedRect(ctx, -shieldW/2 + shieldOffsetX, -shieldH*0.7, shieldW, shieldH, 3*weaponSizeScale);
            ctx.fill();ctx.stroke();
        }
        ctx.restore(); 
        
        ctx.restore(); 

        if (!isPreview) {
            const blockBuff = this.activeBuffs.find(b => b.effects.blockCharges && b.effects.blockCharges > 0);
            if (blockBuff && blockBuff.effects.blockCharges) {
                this.drawOrbitingShields(ctx, blockBuff.effects.blockCharges);
            }
        }

        if (this.isPlayer && !isPreview && !isDragged) { // isPlayer is accessible from Character
            const totalHeroVisualHeightForHealthBar = baseSize * 1.5; 
            const healthBarTopCanvasY = this.y - totalHeroVisualHeightForHealthBar * 0.8; 

            const arrowHeight = baseSize * 0.2;
            const paddingAboveHealthBar = baseSize * 0.05; 

            let arrowTopBaseCanvasY = healthBarTopCanvasY - arrowHeight - paddingAboveHealthBar;

            const bobbingOffsetY = Math.sin(Date.now() * 0.005) * (baseSize * 0.1);
            arrowTopBaseCanvasY += bobbingOffsetY;
            
            ctx.fillStyle = 'gold';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, arrowTopBaseCanvasY + arrowHeight); 
            ctx.lineTo(this.x - baseSize * 0.15, arrowTopBaseCanvasY); 
            ctx.lineTo(this.x + baseSize * 0.15, arrowTopBaseCanvasY); 
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        super.draw(ctx, isPreview, isDragged); // Call Character's draw for health bar and buff icons
    }
}
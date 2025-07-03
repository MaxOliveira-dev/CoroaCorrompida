import type { CombatCapable } from '../entityInterfaces';
import { DamageNumber } from './DamageNumber'; 
import { DeathEffect } from './DeathEffect';   
import { getEntityId, distanceToTarget } from '../entityUtils';
import { Character } from './Character'; 
import type { ActiveBuffDebuffEffect, ActiveBuffDebuff } from '../../../types';
import { VisualEffectsManager } from '../VisualEffectsManager';
import { drawArrow, drawMagicOrb } from '../drawingUtils';

interface ProjectileOptions {
    color?: string;
    size?: number;
    speed?: number;
    piercing?: boolean;
    lifetimeMs?: number;
    debuffToApply?: any; // Can be complex, from ability properties
    sourceAbilityProperties?: Record<string, any>;
    splashConfig?: ActiveBuffDebuffEffect['nextAttackSplash'];
    displayType?: 'circle' | 'arrow' | 'magic_orb';
    trailType?: 'glitter' | 'fire' | 'magic_dust';
}

interface ProjectileUpdateResult {
    newDamageNumbers?: DamageNumber[];
    newEffects?: DeathEffect[];
}

export class Projectile {
    id: number;
    x: number;
    y: number;
    attacker: CombatCapable;
    target: CombatCapable;
    damage: number;
    isCrit: boolean;
    
    // Options
    color: string;
    speed: number;
    size: number;   
    piercing: boolean;
    lifetimeMs: number;
    debuffToApply?: ProjectileOptions['debuffToApply'];
    sourceAbilityProperties?: Record<string, any>;
    splashConfig?: ActiveBuffDebuffEffect['nextAttackSplash'];
    hitTargetIds: number[] = [];
    displayType: 'circle' | 'arrow' | 'magic_orb';
    angle: number = 0;
    trailType?: 'glitter' | 'fire' | 'magic_dust';


    constructor(x: number, y: number, attacker: CombatCapable, target: CombatCapable, damage: number, isCrit: boolean, options: ProjectileOptions = {}) {
        this.id = getEntityId();
        this.x = x;
        this.y = y;
        this.attacker = attacker;
        this.target = target;
        this.damage = damage;
        this.isCrit = isCrit;

        this.color = options.color || 'white';
        this.size = options.size || 6;
        this.speed = options.speed || 10;
        this.piercing = options.piercing || false;
        this.lifetimeMs = options.lifetimeMs || 2000;
        this.debuffToApply = options.debuffToApply;
        this.sourceAbilityProperties = options.sourceAbilityProperties;
        this.splashConfig = options.splashConfig;
        this.displayType = options.displayType || 'circle';
        this.angle = Math.atan2(target.y - y, target.x - x);
        this.trailType = options.trailType;
    }

    private onHit(target: CombatCapable, allTargets: CombatCapable[], vfxManager?: VisualEffectsManager | null): ProjectileUpdateResult {
        if (this.hitTargetIds.includes(target.id)) return {};
        this.hitTargetIds.push(target.id);
        
        const newDamageNumbers: DamageNumber[] = [];
        const newEffects: DeathEffect[] = [];

        let finalDamage = this.damage;

        // --- Calculate bonus damage from ability properties ---
        if (this.sourceAbilityProperties?.bonusDamagePercentTargetMaxHp) {
            const bonusDmg = target.maxHp * (this.sourceAbilityProperties.bonusDamagePercentTargetMaxHp / 100);
            finalDamage += bonusDmg;
        }

        const oldTargetHp = target.currentHp;
        const dmgTaken = target.takeDamage(finalDamage, this.isCrit, this.attacker);

        this.attacker.afterDealingDamage(target, allTargets);
    
        if (typeof dmgTaken === 'number') {
            newDamageNumbers.push(new DamageNumber(dmgTaken, target.x, target.y, this.isCrit ? 'orange' : 'white'));
        } else if (dmgTaken === 'esquiva') {
            newDamageNumbers.push(new DamageNumber("Esquiva!", target.x, target.y, 'white'));
        } else if (dmgTaken === 'bloqueado') {
            newDamageNumbers.push(new DamageNumber("Bloqueado!", target.x, target.y, 'cyan'));
        }

        if (this.splashConfig) {
            if (vfxManager) {
                vfxManager.showExplosaoMagica(target.x, target.y, this.splashConfig.radius);
            } else {
                newEffects.push(new DeathEffect(target.x, target.y, '#FF8C00', 30, 40));
            }
        } else {
            newEffects.push(new DeathEffect(this.x, this.y, this.color, 5, 5));
        }

        // --- Apply Debuff ---
        if (this.debuffToApply) {
            const debuffInstance: ActiveBuffDebuff = {
                id: `${this.debuffToApply.id}_${target.id}`, // Unique instance ID
                abilityId: this.debuffToApply.id, // Grouping ID for stacking
                name: this.debuffToApply.name,
                icon: this.debuffToApply.icon,
                durationMs: this.debuffToApply.durationMs,
                remainingMs: this.debuffToApply.durationMs,
                effects: { ...this.debuffToApply.effects }, // Make a copy of effects
                appliedAt: Date.now(),
                sourceEntityId: this.attacker.id,
                targetEntityId: target.id,
                isBuff: false,
                maxStacks: this.debuffToApply.maxStacks,
            };
            
            // If debuff has a DOT, calculate its damage per tick now
            const dotTemplate = this.debuffToApply.effects.dot;
            if (dotTemplate) {
                const dotDamagePerTick = 
                    (this.attacker.effectiveDamage * (dotTemplate.damagePercentOfCasterDamage / 100 || 0)) +
                    (target.maxHp * (dotTemplate.damagePercentOfTargetMaxHp / 100 || 0));
                
                debuffInstance.effects.dot = {
                    tickIntervalMs: dotTemplate.tickIntervalMs,
                    damagePerTick: Math.max(1, Math.round(dotDamagePerTick)),
                    lastTickTime: Date.now(),
                    sourceCasterId: this.attacker.id
                };
            }

            target.applyDebuff(debuffInstance);
        }

        // --- Handle Splash Damage ---
        if (this.splashConfig) {
            const enemiesToSplash = allTargets.filter(e => e.isAlive && e.id !== target.id && distanceToTarget(target, e) <= this.splashConfig!.radius);
            
            enemiesToSplash.forEach(splashTarget => {
                const splashDamage = finalDamage * (this.splashConfig?.damageMultiplier || 1.0);
                splashTarget.takeDamage(splashDamage, this.isCrit, this.attacker);
                newDamageNumbers.push(new DamageNumber(Math.round(splashDamage), splashTarget.x, splashTarget.y, this.isCrit ? 'orange' : 'white'));

                if (this.splashConfig?.spreadsDebuffId) {
                    const debuffToSpread = target.activeDebuffs.find(d => d.abilityId === this.splashConfig!.spreadsDebuffId);
                    if (debuffToSpread) {
                        const newDebuffInstance = JSON.parse(JSON.stringify(debuffToSpread));
                        newDebuffInstance.id = `${debuffToSpread.id}_${splashTarget.id}`;
                        newDebuffInstance.targetEntityId = splashTarget.id;
                        newDebuffInstance.appliedAt = Date.now();
                        newDebuffInstance.remainingMs = debuffToSpread.durationMs;
                        splashTarget.applyDebuff(newDebuffInstance);
                    }
                }
            });
        }


        if (target.currentHp <= 0 && oldTargetHp > 0 && !target.deathEffectCreated) {
            if (target instanceof Character) {
                const targetChar = target as Character; 
                if (targetChar._entityType === 'enemy') { 
                    newEffects.push(new DeathEffect(targetChar.x, targetChar.y, targetChar.combatStats.isBoss ? '#C62828' : '#757575', targetChar.combatStats.isBoss ? 35 : 15, targetChar.combatStats.isBoss ? 60 : 30));
                } else if (targetChar._entityType === 'hero') { 
                    newEffects.push(new DeathEffect(targetChar.x, targetChar.y, '#FFEB3B', 20, 40)); 
                }
                targetChar.deathEffectCreated = true;
            }
        }
        
        return { newDamageNumbers, newEffects };
    }

    update(deltaTime: number, potentialTargets: CombatCapable[], vfxManager?: VisualEffectsManager | null): ProjectileUpdateResult { 
        this.lifetimeMs -= deltaTime;
        if (this.lifetimeMs <= 0) {
            if (!this.piercing) this.hitTargetIds.push(-1); // Mark as "dead"
            return {};
        }

        let combinedResult: ProjectileUpdateResult = { newDamageNumbers: [], newEffects: [] };

        if (this.trailType === 'glitter') {
            combinedResult.newEffects?.push(new DeathEffect(this.x, this.y, '#FFD700', 1, 20, 'trail'));
        }

        if (this.trailType === 'fire') {
            // Create fire particles on most frames to form a trail
            if (Math.random() > 0.3) {
                const fireColors = ['#FF4500', '#FFA500', '#FFD700']; // OrangeRed, Orange, Gold
                const randomColor = fireColors[Math.floor(Math.random() * fireColors.length)];
                combinedResult.newEffects?.push(new DeathEffect(this.x, this.y, randomColor, 2, 30, 'trail'));
            }
        }
        
        if (this.trailType === 'magic_dust') {
            combinedResult.newEffects?.push(new DeathEffect(this.x, this.y, '#E0DDEF', 1, 30, 'trail'));
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        this.angle = Math.atan2(dy, dx);
        const distance = Math.hypot(dx, dy);

        if (distance > this.speed) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        } else {
            this.x = this.target.x;
            this.y = this.target.y;
            if (!this.piercing) {
                this.lifetimeMs = 0; // It will be removed next frame
            }
        }
        
        for (const pt of potentialTargets) {
            if (pt.isAlive && !this.hitTargetIds.includes(pt.id)) {
                const distToTarget = Math.hypot(this.x - pt.x, this.y - pt.y);
                if (distToTarget < (this.size + pt.size / 2)) {
                    const hitResult = this.onHit(pt, potentialTargets, vfxManager);
                    if (hitResult.newDamageNumbers) combinedResult.newDamageNumbers?.push(...hitResult.newDamageNumbers);
                    if (hitResult.newEffects) combinedResult.newEffects?.push(...hitResult.newEffects);
                    
                    if (!this.piercing) {
                        this.lifetimeMs = 0; // Consume projectile
                        break; 
                    }
                }
            }
        }

        return combinedResult;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.displayType === 'arrow') {
            drawArrow(ctx, this.x, this.y, this.size, this.angle, this.attacker.bodyColor || '#A5D6A7');
        } else if (this.displayType === 'magic_orb') {
            drawMagicOrb(ctx, this.x, this.y, this.size, this.color);
        } else {
            ctx.save();
            ctx.fillStyle = this.color;
            ctx.strokeStyle = 'black'; 
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}
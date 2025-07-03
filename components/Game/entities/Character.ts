

import type { Point, ActiveBuffDebuff, ActiveBuffDebuffEffect, BaseStats, ClassData, EnemyTemplate, EquippedItems, Ability as AbilityType } from '../../../types'; // Added missing type imports
import type { CombatCapable, UpdateResult } from '../entityInterfaces';
import { Projectile } from './Projectile';
import { DamageNumber } from './DamageNumber';
import { DeathEffect } from './DeathEffect';
import { getEntityId, distanceToTarget, calculateFinalStatsForEntity } from '../entityUtils';
import { GRID_SIZE, CHARACTER_STUCK_THRESHOLD_FRAMES, CHARACTER_PROBE_DURATION_FRAMES } from '../gameConstants';
import { drawRoundedRect } from '../drawingUtils';
import { CLASSES as ALL_CLASSES_DATA } from '../../../gameData'; // For class details

export class Character implements CombatCapable {
    id: number;
    x: number;
    y: number;
    
    // Base properties that don't change from buffs (or are source for calculation)
    protected playerBaseStats: BaseStats;
    protected classDetails?: ClassData;
    protected enemyDetails?: EnemyTemplate;
    protected playerLevelScale: number;
    protected equippedItems?: EquippedItems; // Only for player/heroes

    public combatStats: ReturnType<typeof calculateFinalStatsForEntity>; // Dynamically calculated
    
    currentHp: number; // This needs to be managed carefully with maxHp changes
    shieldHp: number = 0;
    // maxHp, effectiveDamage, range etc. are now part of combatStats

    public _entityType: 'hero' | 'enemy' | 'unknown' = 'unknown';

    isAlive: boolean = true;
    target: CombatCapable | null = null;
    lastAttackTime: number = 0;
    attackAnimProgress: number = 0;
    deathEffectCreated: boolean = false;
    isPlayer: boolean; // Added isPlayer property

    // Combat Report Stats
    public damageDealt: number = 0;
    public healingDone: number = 0;
    public shieldingGranted: number = 0;
    public damageTaken: number = 0;

    lastPosition: Point | null;
    stuckFrameCounter: number = 0;
    isProbingUnstuck: boolean = false;
    probeAngleOffset: number = Math.PI / 4;
    probeFrameCounter: number = 0;
    
    // Buffs and Debuffs
    public activeBuffs: ActiveBuffDebuff[] = [];
    public activeDebuffs: ActiveBuffDebuff[] = [];

    // Abilities & Cooldowns
    public abilities: AbilityType[] = [];
    public abilityCooldowns: { [abilityId: string]: number } = {};

    // For channeled abilities
    private isImmobileDueToBuff: boolean = false;
    private channeledDamageAuraEffect: ActiveBuffDebuffEffect['channeledDamageAura'] | null = null;


    constructor(
        x: number, y: number,
        initialCombatStats: ReturnType<typeof calculateFinalStatsForEntity>, // This is the result of a single calculateFinalStatsForEntity call
        isPlayerCharacter: boolean = false,
        // Store the inputs to calculateFinalStatsForEntity for recalculation
        playerBaseStats: BaseStats,
        classDetails?: ClassData,
        enemyDetails?: EnemyTemplate,
        playerLevelScale: number = 1,
        equippedItems?: EquippedItems
    ) {
        this.id = getEntityId();
        this.x = x;
        this.y = y;

        this.playerBaseStats = playerBaseStats;
        this.classDetails = classDetails;
        this.enemyDetails = enemyDetails;
        this.playerLevelScale = playerLevelScale;
        this.equippedItems = equippedItems;

        this.combatStats = initialCombatStats; // Use the passed initial calculation
        this.currentHp = this.combatStats.maxHp;
        // this.maxHp, this.effectiveDamage, etc., are now directly from this.combatStats
        
        this.isPlayer = isPlayerCharacter;
        this.lastPosition = { x, y };

        if (classDetails) {
            this.abilities = classDetails.abilities;
            this.abilities.forEach(ab => this.abilityCooldowns[ab.id] = 0);
        }
    }

    public afterDealingDamage(target: CombatCapable, allEnemies: CombatCapable[]): void {
        // Default implementation does nothing. To be overridden by subclasses like HeroEntity.
    }

    get maxHp(): number { return this.combatStats.maxHp; }
    get effectiveDamage(): number { return this.combatStats.effectiveDamage; }
    get range(): number { return this.combatStats.range; }
    get attackIntervalMs(): number { return this.combatStats.attackIntervalMs; }
    get movementSpeed(): number { return (this.combatStats.velocidadeMovimento * GRID_SIZE) / 60; } // pixels per frame
    get size(): number { return this.combatStats.size || 20; }
    get color(): string | undefined { return this.combatStats.color; }
    get bodyColor(): string | undefined { return this.combatStats.bodyColor; }
    get isBoss(): boolean | undefined { return this.combatStats.isBoss; }


    public recalculateStats(): void {
        const oldMaxHp = this.combatStats.maxHp;
        const oldHpPercent = oldMaxHp > 0 ? this.currentHp / oldMaxHp : 1;

        this.combatStats = calculateFinalStatsForEntity(
            this.playerBaseStats,
            this.classDetails,
            this.enemyDetails,
            this.playerLevelScale,
            this.equippedItems,
            this.activeBuffs,
            this.activeDebuffs
        );
        
        this.currentHp = Math.max(1, Math.round(this.combatStats.maxHp * oldHpPercent));
        
        if (this.currentHp > this.combatStats.maxHp) {
             this.currentHp = this.combatStats.maxHp;
        }
        if (this.currentHp <=0 && this.isAlive) this.currentHp = 1; // Prevent dying from stat changes alone if still alive

        // Update channeled states based on new stats
        this.isImmobileDueToBuff = false;
        this.channeledDamageAuraEffect = null;
        [...this.activeBuffs, ...this.activeDebuffs].forEach(bd => {
            if (bd.effects.isImmobile) this.isImmobileDueToBuff = true;
            if (bd.effects.channeledDamageAura) {
                 this.channeledDamageAuraEffect = { 
                    ...bd.effects.channeledDamageAura, 
                    lastTickTime: this.channeledDamageAuraEffect?.lastTickTime || bd.effects.channeledDamageAura?.lastTickTime || Date.now() // Preserve lastTickTime if already set
                };
            }
        });
    }

    public applyShield(amount: number): void {
        this.shieldHp += amount;
    }

    public applyBuff(buff: ActiveBuffDebuff): void {
        // Prevent stacking identical buffs unless designed to stack (e.g. by unique ID)
        const existingBuffIndex = this.activeBuffs.findIndex(b => b.abilityId === buff.abilityId && !b.id.startsWith('stackable_'));
        if (existingBuffIndex !== -1) {
            this.activeBuffs[existingBuffIndex] = buff; // Refresh duration or replace
        } else {
            this.activeBuffs.push(buff);
        }
        this.recalculateStats();
    }

    public applyDebuff(debuff: ActiveBuffDebuff): void {
        const existingDebuffIndex = this.activeDebuffs.findIndex(d => d.abilityId === debuff.abilityId);

        if (existingDebuffIndex !== -1) {
            const existingDebuff = this.activeDebuffs[existingDebuffIndex];
            if (debuff.maxStacks && debuff.maxStacks > 1) {
                existingDebuff.stacks = Math.min(debuff.maxStacks, (existingDebuff.stacks || 1) + 1);
            }
            existingDebuff.remainingMs = debuff.durationMs;
            existingDebuff.appliedAt = Date.now();
        } else {
            this.activeDebuffs.push({ ...debuff, stacks: 1 });
        }
        this.recalculateStats();
    }

    public removeDebuff(abilityId: string): void {
        const initialLength = this.activeDebuffs.length;
        this.activeDebuffs = this.activeDebuffs.filter(d => d.abilityId !== abilityId);
        if (this.activeDebuffs.length < initialLength) {
            this.recalculateStats();
        }
    }


    private updateBuffsDebuffs(deltaTime: number): void {
        let statsChanged = false;

        this.activeBuffs = this.activeBuffs.filter(buff => {
            buff.remainingMs -= deltaTime;
            if (buff.remainingMs <= 0) {
                statsChanged = true;
                return false;
            }
            return true;
        });

        this.activeDebuffs = this.activeDebuffs.filter(debuff => {
            debuff.remainingMs -= deltaTime;
            if (debuff.remainingMs <= 0) {
                statsChanged = true;
                return false;
            }
            return true;
        });

        if (statsChanged) {
            this.recalculateStats();
        }
    }
    
    public updateCooldowns(deltaTime: number): void {
        for (const id in this.abilityCooldowns) {
            if (this.abilityCooldowns[id] > 0) {
                this.abilityCooldowns[id] = Math.max(0, this.abilityCooldowns[id] - deltaTime);
            }
        }
    }


    takeDamage(amount: number, isCrit: boolean = false, attacker?: CombatCapable): number | 'esquiva' | 'bloqueado' {
        if (!this.isAlive) return 0;

        let totalDamage = amount;

        if (attacker) {
            const pontosVitaisDebuff = this.activeDebuffs.find(d => 
                d.abilityId === 'DEBUFF_PONTOS_VITAIS' && 
                d.sourceEntityId === attacker.id &&
                d.effects.bonusDamageFromMissingHpPercent
            );
    
            if (pontosVitaisDebuff) {
                const missingHp = this.maxHp - this.currentHp;
                if (missingHp > 0) {
                    const bonusDamage = missingHp * (pontosVitaisDebuff.effects.bonusDamageFromMissingHpPercent! / 100);
                    totalDamage += bonusDamage;
                }
            }
        }
    
        const blockBuffIndex = this.activeBuffs.findIndex(b => b.effects.blockCharges && b.effects.blockCharges > 0);
        if (blockBuffIndex !== -1) {
            const blockBuff = this.activeBuffs[blockBuffIndex];
            if (blockBuff.effects.blockCharges) {
                blockBuff.effects.blockCharges--;
                if (blockBuff.effects.blockCharges <= 0) {
                    this.activeBuffs.splice(blockBuffIndex, 1);
                    this.recalculateStats();
                }
                return 'bloqueado';
            }
        }
        
        if (this.activeBuffs.some(b => b.effects.isInvulnerable)) {
            return 'esquiva';
        }


        if (this.combatStats.chanceEsquiva && Math.random() * 100 < this.combatStats.chanceEsquiva) {
            return 'esquiva';
        }

        const resistance = this.combatStats.resistencia || 0;
        const damageMultiplier = 100 / (100 + resistance);
        const finalDamage = Math.max(1, Math.round(totalDamage * damageMultiplier));

        this.damageTaken += finalDamage;
        if (attacker && attacker instanceof Character) {
            attacker.damageDealt += finalDamage;
        }

        const damageAbsorbedByShield = Math.min(this.shieldHp, finalDamage);
        this.shieldHp -= damageAbsorbedByShield;

        const remainingDamage = finalDamage - damageAbsorbedByShield;

        if (remainingDamage > 0) {
            this.currentHp -= remainingDamage;
        }

        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.isAlive = false;
        }
        return finalDamage;
    }

    findTarget(potentialTargets: CombatCapable[]) {
        const tauntDebuff = this.activeDebuffs.find(d => d.effects.isTaunted);
        if (tauntDebuff && tauntDebuff.sourceEntityId !== undefined) {
            const taunter = potentialTargets.find(t => t.id === tauntDebuff.sourceEntityId);
            if(taunter && taunter.isAlive) {
                this.target = taunter;
                return;
            }
        }

        if (this.target && this.target.isAlive && !this.target.activeBuffs.some(b => b.effects.isInvisible) && distanceToTarget(this, this.target) <= this.range * 1.5 /* Allow keeping target if slightly out of ideal range */) {
             // Only switch if current target is very far or new target is much closer / higher priority
            const currentTargetDistance = distanceToTarget(this, this.target);
            if(currentTargetDistance <= this.range * 1.2) return; // Keep current target if reasonably close
        }


        let closestTarget: CombatCapable | null = null;
        let minDistance = Infinity;

        const livingTargets = potentialTargets.filter(t => t.isAlive && !t.activeBuffs.some(b => b.effects.isInvisible));
        
        let orderedTargets = [...livingTargets];
        // Basic Taunt: Prioritize Guardians if this character is an enemy
        if(this._entityType === 'enemy') { 
            const guardians = livingTargets.filter(t => (t as Character).combatStats.name === 'Guardião' && t.isAlive);
            if (guardians.length > 0) {
                 orderedTargets = guardians; // Focus guardians first
            } else {
                 orderedTargets = livingTargets; // Otherwise, any living hero
            }
        }


        for (const target of orderedTargets) {
            const distance = distanceToTarget(this, target);
            if (distance < minDistance) {
                minDistance = distance;
                closestTarget = target;
            }
        }
        this.target = closestTarget;
    }

    attack(): { damageDealt: number, isCrit: boolean, lifeStolen?: number, projectile?: Projectile } | null {
        if (this.isImmobileDueToBuff && !this.channeledDamageAuraEffect) return null; // Can't attack if immobile by buff unless it's a damage aura
        if (!this.target || !this.target.isAlive) return null;

        if (Date.now() - this.lastAttackTime >= this.attackIntervalMs) {
            const result = this.performAttack();
            if (result) {
                 this.lastAttackTime = Date.now();
            }
            return result;
        }
        return null;
    }

    performAttack(): { damageDealt: number, isCrit: boolean, lifeStolen?: number, projectile?: Projectile } | null {
        if (!this.target) return null;

        let isCrit: boolean = !!(this.combatStats.chanceCritica && Math.random() * 100 < this.combatStats.chanceCritica);
        let finalDamage = this.effectiveDamage;
        let bonusDamageFromBuff = 0;

        // Check for Golpe Certeiro buff (or similar "next attack is special" buffs)
        const attackModifierBuffIndex = this.activeBuffs.findIndex(b => b.effects.nextAttackCrit || b.effects.nextAttackBonusDamagePercentTargetMaxHp);
        if (attackModifierBuffIndex !== -1) {
            const buff = this.activeBuffs[attackModifierBuffIndex];
            if (buff.effects.nextAttackCrit) {
                isCrit = true;
            }
            if (buff.effects.nextAttackBonusDamagePercentTargetMaxHp && this.target.maxHp) {
                bonusDamageFromBuff = this.target.maxHp * (buff.effects.nextAttackBonusDamagePercentTargetMaxHp / 100);
            }
            // Consume the buff
            this.activeBuffs.splice(attackModifierBuffIndex, 1);
            this.recalculateStats(); 
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
            this.healingDone += lifeStolen;
        }
        
        this.attackAnimProgress = 1;

        if (this.range > GRID_SIZE * 1.1) { 
            const projectileOptions = { color: this.bodyColor || 'grey' };
            return { damageDealt: finalDamage, isCrit, lifeStolen, projectile: new Projectile(this.x, this.y, this, this.target, finalDamage, isCrit, projectileOptions) };
        } else { 
            return { damageDealt: finalDamage, isCrit, lifeStolen };
        }
    }

    updateAnimation() {
        if (this.attackAnimProgress > 0) {
            this.attackAnimProgress = Math.max(0, this.attackAnimProgress - 0.1);
        }
    }
    
    updateMovement(targetX: number, targetY: number, canvasWidth: number, canvasHeight: number) {
        if (this.isImmobileDueToBuff) return; // Prevent movement if buffed as immobile

        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const nextXUnchecked = this.x + Math.cos(angle) * this.movementSpeed;
        const nextYUnchecked = this.y + Math.sin(angle) * this.movementSpeed;

        const nextX = Math.max(this.size / 2, Math.min(canvasWidth - this.size / 2, nextXUnchecked));
        const nextY = Math.max(this.size / 2, Math.min(canvasHeight - this.size / 2, nextYUnchecked));
        
        this.x = nextX;
        this.y = nextY;
    }

    updateStuckLogic() {
        if (!this.target || !this.isAlive || distanceToTarget(this, this.target) <= this.range * 0.9 /* A bit of leeway */ ) {
            this.stuckFrameCounter = 0;
            this.isProbingUnstuck = false;
            this.probeFrameCounter = 0;
            if (this.lastPosition) {
                 this.lastPosition.x = this.x;
                 this.lastPosition.y = this.y;
            }
            return;
        }

        if (this.lastPosition && Math.hypot(this.x - this.lastPosition.x, this.y - this.lastPosition.y) < 0.5) { // Reduced threshold
            this.stuckFrameCounter++;
        } else {
            this.stuckFrameCounter = 0;
        }
        
        if (this.lastPosition) {
            this.lastPosition.x = this.x;
            this.lastPosition.y = this.y;
        }

        if (this.isProbingUnstuck) {
            this.probeFrameCounter--;
            if (this.probeFrameCounter <= 0 || this.stuckFrameCounter === 0) {
                this.isProbingUnstuck = false;
                this.probeFrameCounter = 0;
            }
        } else if (this.stuckFrameCounter >= CHARACTER_STUCK_THRESHOLD_FRAMES) {
            this.isProbingUnstuck = true;
            this.probeFrameCounter = CHARACTER_PROBE_DURATION_FRAMES;
            this.probeAngleOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * Math.PI / 6); // More varied probe angle
            this.stuckFrameCounter = 0; 
            // console.log(`${this.combatStats.name} is stuck, trying to probe at angle offset: ${this.probeAngleOffset}`);
        }
    }

    private updateChanneledAbilities(allTargets: CombatCapable[]): UpdateResult[] {
        const results: UpdateResult[] = [];
        if (this.channeledDamageAuraEffect) {
            const aura = this.channeledDamageAuraEffect;
            if (!aura.lastTickTime || (Date.now() - aura.lastTickTime >= aura.tickIntervalMs)) {
                aura.lastTickTime = Date.now();
    
                allTargets.forEach(entityTarget => {
                    if (entityTarget.isAlive && distanceToTarget(this, entityTarget) <= aura.radius) {
                        let tickDamage = this.effectiveDamage * aura.damageMultiplier;
                        if (aura.isCrit) {
                            tickDamage = Math.round(tickDamage * (1 + (this.combatStats.danoCritico || 50) / 100));
                        }
                        tickDamage = Math.max(1, Math.round(tickDamage));
    
                        const dmgTaken = entityTarget.takeDamage(tickDamage, aura.isCrit, this);
                        this.afterDealingDamage(entityTarget, allTargets);
                        
                        let damageResult: UpdateResult = {};
                        if (typeof dmgTaken === 'number') {
                            damageResult.newDamageNumber = new DamageNumber(dmgTaken, entityTarget.x, entityTarget.y, aura.isCrit ? 'orange' : 'white');
                        } else if (dmgTaken === 'esquiva') {
                            damageResult.newDamageNumber = new DamageNumber("Esquiva!", entityTarget.x, entityTarget.y, 'white');
                        } else if (dmgTaken === 'bloqueado') {
                            damageResult.newDamageNumber = new DamageNumber("Bloqueado!", entityTarget.x, entityTarget.y, 'cyan');
                        }
    
                        if (entityTarget.currentHp <= 0 && !entityTarget.deathEffectCreated) {
                            damageResult.newEffect = new DeathEffect(entityTarget.x, entityTarget.y, entityTarget.combatStats.isBoss ? '#C62828' : '#757575', entityTarget.combatStats.isBoss ? 35 : 15, entityTarget.combatStats.isBoss ? 60 : 30);
                            entityTarget.deathEffectCreated = true;
                        }
                        if (damageResult.newDamageNumber || damageResult.newEffect) {
                            results.push(damageResult);
                        }
                    }
                });
            }
        }
        return results;
    }

    private updateDotEffects(allHeroes: CombatCapable[], allEnemies: CombatCapable[]): UpdateResult[] {
        const results: UpdateResult[] = [];
        this.activeDebuffs.forEach(debuff => {
            const dot = debuff.effects.dot;
            if (dot) {
                if (!dot.lastTickTime) {
                    dot.lastTickTime = Date.now();
                }
                if (Date.now() - dot.lastTickTime >= dot.tickIntervalMs) {
                    dot.lastTickTime = Date.now();
                    const caster = [...allHeroes, ...allEnemies].find(c => c.id === dot.sourceCasterId);
                    
                    const dmgTaken = this.takeDamage(dot.damagePerTick, false, caster);
                    
                    let dotResult: UpdateResult = {};
                    if (typeof dmgTaken === 'number') {
                        dotResult.newDamageNumber = new DamageNumber(dmgTaken, this.x, this.y, 'orange');
                    }

                    if (this.currentHp <= 0 && !this.deathEffectCreated) {
                        dotResult.newEffect = new DeathEffect(this.x, this.y, this.isBoss ? '#C62828' : '#757575', this.isBoss ? 35 : 15, this.isBoss ? 60 : 30);
                        this.deathEffectCreated = true;
                    }

                    if(dotResult.newDamageNumber || dotResult.newEffect) {
                        results.push(dotResult);
                    }
                }
            }
        });
        return results;
    }


    update(deltaTime: number, heroes: CombatCapable[], enemies: CombatCapable[], canvasSize: { width: number; height: number; }): { results: UpdateResult[], abilityToTrigger?: string } {
        const results: UpdateResult[] = [];
        if (!this.isAlive) return { results, abilityToTrigger: undefined };

        this.updateCooldowns(deltaTime);
        this.updateBuffsDebuffs(deltaTime);
        results.push(...this.updateDotEffects(heroes, enemies));
        
        this.updateAnimation();
        this.updateStuckLogic();
        
        results.push(...this.updateChanneledAbilities(this._entityType === 'hero' ? enemies : heroes));
        
        return { results, abilityToTrigger: undefined };
    }

    draw(ctx: CanvasRenderingContext2D, isPreview: boolean = false, isDragged: boolean = false) { // Added isDragged
        // REMOVED default circle drawing:
        // ctx.fillStyle = this.color || 'purple';
        // ctx.beginPath();
        // ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        // ctx.fill();
        
        if (!isPreview) this.drawHealthBar(ctx);

        // Draw buff/debuff icons (simple version)
        let buffIconX = this.x - this.size / 2;
        const iconY = this.y + this.size / 2 + 5;
        const iconSize = 10;
        this.activeBuffs.forEach(buff => {
            if (buff.icon) {
                 ctx.font = `${iconSize}px sans-serif`;
                 ctx.fillText(buff.icon, buffIconX, iconY);
                 buffIconX += iconSize + 2;
            }
        });

        let debuffIconX = buffIconX; // Start after buffs
        this.activeDebuffs.forEach(debuff => {
            if (debuff.icon) {
                 ctx.font = `${iconSize}px sans-serif`;
                 let textToDraw = debuff.icon;
                 if (debuff.stacks && debuff.stacks > 1) {
                     textToDraw += `x${debuff.stacks}`;
                 }
                 ctx.fillText(textToDraw, debuffIconX, iconY);
                 debuffIconX += ctx.measureText(textToDraw).width + 2;
            }
        });
    }

    drawHealthBar(ctx: CanvasRenderingContext2D) {
        if (this.isBoss && this._entityType === 'enemy') return;

        const healthBarWidth = this.size * 1.8;
        const healthBarHeight = this.size * 0.22; 

        const totalHeroVisualHeight = this.size * 1.5; 
        const healthBarX = this.x - healthBarWidth / 2;
        const healthBarY = this.y - totalHeroVisualHeight * 0.8; 

        const healthColor = (this._entityType === 'hero') ? '#50C878' : '#D22B2B';
        const backgroundColor = 'rgba(0, 0, 0, 0.4)';

        ctx.fillStyle = backgroundColor;
        drawRoundedRect(ctx, healthBarX, healthBarY, healthBarWidth, healthBarHeight, 2);
        ctx.fill();

        const currentHealthWidth = Math.max(0, (this.currentHp / this.maxHp) * healthBarWidth);
        ctx.fillStyle = healthColor;
        drawRoundedRect(ctx, healthBarX, healthBarY, currentHealthWidth, healthBarHeight, 2);
        ctx.fill();

        if (this.shieldHp > 0) {
            const shieldBarWidth = Math.min(healthBarWidth, (this.shieldHp / this.maxHp) * healthBarWidth);
            ctx.fillStyle = 'rgba(173, 216, 230, 0.85)'; // Light blue, semi-opaque
            drawRoundedRect(ctx, healthBarX, healthBarY, shieldBarWidth, healthBarHeight, 2);
            ctx.fill();
        }

        ctx.strokeStyle = '#333'; 
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, healthBarX, healthBarY, healthBarWidth, healthBarHeight, 2);
        ctx.stroke();
    }
}

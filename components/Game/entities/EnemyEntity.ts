import { Character } from './Character';
import type { CombatCapable, UpdateResult } from '../entityInterfaces';
import type { Projectile } from './Projectile'; 
import { DamageNumber } from './DamageNumber';
import { DeathEffect } from './DeathEffect';
import { calculateFinalStatsForEntity, distanceToTarget } from '../entityUtils';
import type { BaseStats, EnemyTemplate } from '../../../types';

const defaultEnemyBaseStats: BaseStats = {
    letalidade: 0,
    vigor: 0,
    resistencia: 0,
    velocidadeAtaque: 0,
    velocidadeMovimento: 1,
    chanceCritica: 0,
    danoCritico: 50,
    chanceEsquiva: 0,
    vampirismo: 0,
};

export class EnemyEntity extends Character {
    aggroRadius: number = 150; 
    isAgro: boolean = false;
    emoji: string;
    isCountedAsKilled: boolean = false;

    constructor(
        x: number, y: number,
        initialCombatStats: ReturnType<typeof calculateFinalStatsForEntity>,
        enemyTemplate: EnemyTemplate, // To get baseStats for recalculation
        playerLevelScale: number = 1
    ) {
        super(
            x, y,
            initialCombatStats,
            false, // isPlayerCharacter
            { ...defaultEnemyBaseStats, ...(enemyTemplate.baseStats || {}) }, // Provide enemy's own base stats
            undefined, // no classDetails
            enemyTemplate,
            playerLevelScale
        );
        this._entityType = 'enemy';
        this.emoji = initialCombatStats.emoji || '❓'; 
        if (this.isBoss) {
            this.aggroRadius = 300; 
        }
    }
    
    agroAllies(enemies: CombatCapable[]) {
         enemies.forEach(ally => {
            if (ally instanceof EnemyEntity && ally !== this && ally.isAlive && !ally.isAgro) {
                const distance = distanceToTarget(this, ally);
                if(distance < this.aggroRadius * 1.5 ){ 
                    ally.isAgro = true;
                }
            }
         });
    }

    update(deltaTime: number, heroes: CombatCapable[], enemies: CombatCapable[], canvasSize: { width: number; height: number; }): { results: UpdateResult[], abilityToTrigger?: string } {
        const baseUpdate = super.update(deltaTime, heroes, enemies, canvasSize); 
        const results = baseUpdate.results;
        if (!this.isAlive) return baseUpdate;

        if (!this.isAgro) {
            for (const hero of heroes) {
                if (hero.isAlive) {
                    const distToHero = distanceToTarget(this, hero);
                    if (distToHero < this.aggroRadius) {
                        this.isAgro = true;
                        this.agroAllies(enemies); 
                        break; 
                    }
                }
            }
        }

        if (this.isAgro) {
            this.findTarget(heroes); 

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
                        let result: UpdateResult = { lifeStolen: attackResult.lifeStolen };

                        if (attackResult.projectile) {
                            result.newProjectile = attackResult.projectile;
                        } else if (this.target) { // Melee attack
                            const oldTargetHp = this.target.currentHp;
                            const dmgTaken = this.target.takeDamage(attackResult.damageDealt, attackResult.isCrit, this);
                            
                            if (typeof dmgTaken === 'number') {
                                result.newDamageNumber = new DamageNumber(dmgTaken, this.target.x, this.target.y, attackResult.isCrit ? 'orange' : 'white');
                            } else if (dmgTaken === 'esquiva') {
                                result.newDamageNumber = new DamageNumber("Esquiva!", this.target.x, this.target.y, 'white');
                            }
                            
                            if (this.target.currentHp <= 0 && oldTargetHp > 0 && !this.target.deathEffectCreated) {
                                const targetChar = this.target as Character;
                                result.newEffect = new DeathEffect(targetChar.x, targetChar.y, '#FFEB3B', 20, 40);
                                targetChar.deathEffectCreated = true;
                            }
                        }
                        results.push(result);
                    }
                }
            }
        }
        return { results, abilityToTrigger: undefined };
    }

    draw(ctx: CanvasRenderingContext2D, isPreview: boolean = false, isDragged: boolean = false) { // Added isDragged
        if (!this.isAlive) return;
        ctx.save();
        
        const lunge = Math.sin(this.attackAnimProgress * Math.PI) * 5; 
        const direction = this.target ? Math.sign(this.target.x - this.x) : 1; 
        ctx.translate(lunge * direction, 0);

        ctx.font = `${this.size * 1.5}px sans-serif`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
        
        ctx.restore();
        super.draw(ctx, isPreview, isDragged); // Call Character's draw for health bar and buff icons
    }
}
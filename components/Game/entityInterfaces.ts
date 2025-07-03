import type { Point, CombatStats as CombatStatsType, ActiveBuffDebuff, Ability } from '../../types';
import type { Projectile } from './entities/Projectile';
import type { DamageNumber } from './entities/DamageNumber';
import type { DeathEffect } from './entities/DeathEffect';
import type { calculateFinalStatsForEntity } from './entityUtils';

export interface UpdateResult {
    newProjectile?: Projectile;
    newDamageNumber?: DamageNumber;
    newEffect?: DeathEffect;
    lifeStolen?: number;
}


export interface CombatCapable {
    id: number;
    x: number;
    y: number;
    combatStats: ReturnType<typeof calculateFinalStatsForEntity>; // Using the return type of the actual function
    currentHp: number;
    shieldHp: number;
    maxHp: number;
    effectiveDamage: number;
    range: number;
    attackIntervalMs: number;
    movementSpeed: number;

    color?: string;
    bodyColor?: string;
    size: number;
    isBoss?: boolean;
    isPlayer?: boolean; // Added isPlayer property

    isAlive: boolean;
    target: CombatCapable | null;
    lastAttackTime: number;
    attackAnimProgress: number;
    deathEffectCreated: boolean;

    damageDealt: number;
    healingDone: number;
    shieldingGranted: number;
    damageTaken: number;

    lastPosition: Point | null;
    stuckFrameCounter: number;
    isProbingUnstuck: boolean;
    probeAngleOffset: number;
    probeFrameCounter: number;

    activeBuffs: ActiveBuffDebuff[];
    activeDebuffs: ActiveBuffDebuff[];

    abilities: Ability[];
    abilityCooldowns: { [abilityId: string]: number };

    applyShield(amount: number): void;
    takeDamage(amount: number, isCrit?: boolean, attacker?: CombatCapable): number | 'esquiva' | 'bloqueado';
    findTarget(potentialTargets: CombatCapable[]): void;
    attack(): { damageDealt: number, isCrit: boolean, lifeStolen?: number, projectile?: Projectile } | null;
    performAttack(): { damageDealt: number, isCrit: boolean, lifeStolen?: number, projectile?: Projectile } | null;
    updateAnimation(): void;
    afterDealingDamage(target: CombatCapable, allEnemies: CombatCapable[]): void;
    update(deltaTime: number, heroes: CombatCapable[], enemies: CombatCapable[], canvasSize: { width: number; height: number; }): { results: UpdateResult[], abilityToTrigger?: string };
    draw(ctx: CanvasRenderingContext2D, isPreview?: boolean, isDragged?: boolean): void;
    drawHealthBar(ctx: CanvasRenderingContext2D): void;
    recalculateStats(): void;
    applyBuff(buff: ActiveBuffDebuff): void;
    applyDebuff(debuff: ActiveBuffDebuff): void;
}
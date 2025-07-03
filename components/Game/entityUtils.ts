

import type { BaseStats, ClassData, EnemyTemplate, CombatStats, Item, EquippedItems, ActiveBuffDebuff, ActiveBuffDebuffEffect } from '../../types';
import type { CombatCapable } from './entityInterfaces';

export let entityIdCounter = 0;
export const getEntityId = () => entityIdCounter++;
export const resetEntityIdCounter = () => { entityIdCounter = 0; };


export const calculateFinalStatsForEntity = (
    sourceBaseStats: BaseStats, // Player's base stats or enemy's base stats
    classDetails?: ClassData, 
    enemyDetails?: EnemyTemplate, 
    playerLevelScale: number = 1, 
    equippedItems?: EquippedItems,
    activeBuffs: ActiveBuffDebuff[] = [],
    activeDebuffs: ActiveBuffDebuff[] = []
): CombatStats & { currentHp: number, name: string, weaponRepresentation?: string, emoji?: string } => {

    let calculatedStats: Partial<CombatStats> = { ...sourceBaseStats };

    // 1. Apply item bonuses (only for player/heroes with equipment)
    if (classDetails && equippedItems) {
        Object.values(equippedItems).forEach(item => {
            if (item && item.statBonuses) {
                for (const [statKey, bonusValue] of Object.entries(item.statBonuses)) {
                    if (bonusValue !== undefined) {
                        const key = statKey as keyof BaseStats;
                        calculatedStats[key] = (calculatedStats[key] || 0) + (bonusValue as number); 
                    }
                }
            }
        });
    }

    const allBuffsAndDebuffs = [...activeBuffs, ...activeDebuffs];

    // Create a temporary object for accumulated percentage bonuses to apply them correctly after flat bonuses.
    const accumulatedPercentages: { [key in keyof BaseStats]?: number } = {};
    let rangePercentBonus = 0;

    allBuffsAndDebuffs.forEach(bd => {
        const effect = bd.effects;
        const stacks = bd.stacks || 1;

        // Accumulate percentage-based effects
        if (effect.letalidadePercent) accumulatedPercentages.letalidade = (accumulatedPercentages.letalidade || 0) + (effect.letalidadePercent * stacks);
        if (effect.vigorPercent) accumulatedPercentages.vigor = (accumulatedPercentages.vigor || 0) + (effect.vigorPercent * stacks);
        if (effect.resistenciaPercent) accumulatedPercentages.resistencia = (accumulatedPercentages.resistencia || 0) + (effect.resistenciaPercent * stacks);
        if (effect.velocidadeAtaquePercent) calculatedStats.velocidadeAtaque = (calculatedStats.velocidadeAtaque || 0) + (effect.velocidadeAtaquePercent * stacks); // This one is additive
        if (effect.velocidadeMovimentoPercent) accumulatedPercentages.velocidadeMovimento = (accumulatedPercentages.velocidadeMovimento || 0) + (effect.velocidadeMovimentoPercent * stacks);
        if (effect.chanceCriticaPercent) calculatedStats.chanceCritica = (calculatedStats.chanceCritica || 0) + (effect.chanceCriticaPercent * stacks); // Additive
        if (effect.danoCriticoPercent) calculatedStats.danoCritico = (calculatedStats.danoCritico || 0) + (effect.danoCriticoPercent * stacks); // Additive
        if (effect.chanceEsquivaPercent) calculatedStats.chanceEsquiva = (calculatedStats.chanceEsquiva || 0) + (effect.chanceEsquivaPercent * stacks); // Additive
        if (effect.rangePercent) rangePercentBonus += (effect.rangePercent * stacks);

        // Apply flat effects directly
        if (effect.letalidadeFlat) calculatedStats.letalidade = (calculatedStats.letalidade || 0) + (effect.letalidadeFlat * stacks);
        if (effect.vigorFlat) calculatedStats.vigor = (calculatedStats.vigor || 0) + (effect.vigorFlat * stacks);
        if (effect.resistenciaFlat) calculatedStats.resistencia = (calculatedStats.resistencia || 0) + (effect.resistenciaFlat * stacks);

        // Apply special direct modifications
        if (effect.resistanceReductionPercent) {
             calculatedStats.resistencia = (calculatedStats.resistencia || 0) - (effect.resistanceReductionPercent * stacks);
        }
    });

    // Apply accumulated percentage bonuses
    for (const key in accumulatedPercentages) {
        const statKey = key as keyof BaseStats;
        if (calculatedStats[statKey] !== undefined) {
            (calculatedStats[statKey] as number) *= (1 + (accumulatedPercentages[statKey] || 0) / 100);
        }
    }

    // Clamp final resistance
    if (calculatedStats.resistencia !== undefined) calculatedStats.resistencia = Math.max(-99, calculatedStats.resistencia);


    // 5. Calculate derived stats (HP, Damage, Attack Interval) based on class or enemy template
    let finalMaxHp = 0;
    let effectiveDamageCalc = 0;
    let finalAttackIntervalMs = 1500;
    let name = "Unknown";
    let color: string | undefined;
    let bodyColor: string | undefined;
    let weaponRepresentation: string | undefined;
    let range = 0;
    let finalVelocidadeMovimento = 1.0;
    let size = 20;
    let isBoss = false;
    let emoji: string | undefined;

    if (classDetails) { 
        name = classDetails.name;
        color = classDetails.color;
        bodyColor = classDetails.bodyColor;
        weaponRepresentation = classDetails.weapon;
        range = classDetails.range;
        finalVelocidadeMovimento = classDetails.velocidadeMovimento * (1 + ((calculatedStats.velocidadeMovimento || 0) - classDetails.velocidadeMovimento) / classDetails.velocidadeMovimento); // Apply % changes to class base movement
        
        finalMaxHp = Math.floor((calculatedStats.vigor || 0) * 10.85 + (classDetails.hp || 0));
        effectiveDamageCalc = Math.floor((calculatedStats.letalidade || 0) * 1.25 + (classDetails.damage || 0));
        
        finalAttackIntervalMs = classDetails.attackSpeed || 1500;
        if (calculatedStats.velocidadeAtaque && calculatedStats.velocidadeAtaque !== 0) { 
            finalAttackIntervalMs = Math.round(finalAttackIntervalMs / (1 + (calculatedStats.velocidadeAtaque / 100)));
        }
        size = classDetails.name === 'Guardião' ? 30 : 25;

    } else if (enemyDetails) { 
        // For enemies, sourceBaseStats *is* their base, and playerLevelScale applies.
        // Buffs/Debuffs are applied to these scaled stats.
        name = enemyDetails.name;
        const enemyBase = enemyDetails.baseStats || {};
        
        finalMaxHp = Math.floor((enemyBase.vigor || enemyDetails.baseHp / 10.85) * playerLevelScale * 10.85); // Approximate vigor if not defined
        effectiveDamageCalc = Math.floor((enemyBase.letalidade || enemyDetails.baseDamage / 1.25) * playerLevelScale * 1.25); // Approximate letalidade
        
        // Apply vigor/letalidade from buffs to these scaled HP/DMG bases
        finalMaxHp = Math.floor((calculatedStats.vigor || finalMaxHp/10.85) * 10.85);
        effectiveDamageCalc = Math.floor((calculatedStats.letalidade || effectiveDamageCalc/1.25) * 1.25);

        range = enemyDetails.range;
        finalAttackIntervalMs = enemyDetails.attackSpeed;
        if (calculatedStats.velocidadeAtaque && calculatedStats.velocidadeAtaque !== 0) {
            finalAttackIntervalMs = Math.round(finalAttackIntervalMs / (1 + (calculatedStats.velocidadeAtaque / 100)));
        }
        finalVelocidadeMovimento = enemyDetails.velocidadeMovimento * (1 + ((calculatedStats.velocidadeMovimento || enemyDetails.velocidadeMovimento) - enemyDetails.velocidadeMovimento) / enemyDetails.velocidadeMovimento);
        size = enemyDetails.size || 20;
        isBoss = enemyDetails.isBoss ?? false;
        emoji = enemyDetails.emoji;
        
        // Ensure other base stats for enemies are initialized if not present, after scaling
        calculatedStats.resistencia = (calculatedStats.resistencia || enemyBase.resistencia || 0) * playerLevelScale;
        calculatedStats.chanceCritica = (calculatedStats.chanceCritica || enemyBase.chanceCritica || 0); // Crit usually not scaled by level directly
        calculatedStats.danoCritico = (calculatedStats.danoCritico || enemyBase.danoCritico || 50);
        calculatedStats.chanceEsquiva = (calculatedStats.chanceEsquiva || enemyBase.chanceEsquiva || 0);
        calculatedStats.vampirismo = (calculatedStats.vampirismo || enemyBase.vampirismo || 0);
    }
    
    if (rangePercentBonus !== 0) {
        range *= (1 + rangePercentBonus / 100);
    }
    
    // Ensure all base stats are present in the final object
    const defaultBaseStatsTemplate: BaseStats = { letalidade: 0, vigor: 0, resistencia: 0, velocidadeAtaque: 0, velocidadeMovimento: 1, chanceCritica: 0, danoCritico: 0, chanceEsquiva: 0, vampirismo: 0 };
    for (const key of Object.keys(defaultBaseStatsTemplate) as Array<keyof BaseStats>) {
        if (calculatedStats[key] === undefined) {
            calculatedStats[key] = defaultBaseStatsTemplate[key];
        }
    }

    return {
        ...calculatedStats as BaseStats, // Cast after ensuring all props
        name,
        color,
        bodyColor,
        weaponRepresentation,
        range,
        attackIntervalMs: finalAttackIntervalMs,
        velocidadeMovimento: finalVelocidadeMovimento,
        maxHp: finalMaxHp,
        currentHp: finalMaxHp, // Initial currentHp is maxHp
        effectiveDamage: effectiveDamageCalc,
        size,
        isBoss,
        emoji,
        // activeBuffs and activeDebuffs are handled by Character class directly
    };
};

export const distanceToTarget = (entity: CombatCapable, target: CombatCapable): number => {
    return Math.hypot(entity.x - target.x, entity.y - target.y);
};

export const getMultiShotTargets = (attacker: CombatCapable, mainTarget: CombatCapable, allEnemies: CombatCapable[], count: number): CombatCapable[] => {
    if (count <= 1) return [];

    const otherEnemies = allEnemies
        .filter(e => e.isAlive && e.id !== mainTarget.id)
        .sort((a, b) => distanceToTarget(attacker, a) - distanceToTarget(attacker, b));
    
    return otherEnemies.slice(0, count - 1);
};

export const isTargetInCone = (
    casterX: number, casterY: number, 
    targetX: number, targetY: number, 
    coneRange: number, 
    coneAngleRadians: number, 
    casterDirectionRadians: number
): boolean => {
    const dx = targetX - casterX;
    const dy = targetY - casterY;
    const distance = Math.hypot(dx, dy);

    if (distance === 0 || distance > coneRange) {
        return false;
    }

    const angleToTarget = Math.atan2(dy, dx);
    let angleDifference = angleToTarget - casterDirectionRadians;

    // Normalize angle difference to be between -PI and PI
    while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
    while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

    return Math.abs(angleDifference) <= coneAngleRadians / 2;
};

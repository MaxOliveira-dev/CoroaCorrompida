

export interface BaseStats {
    letalidade: number;
    vigor: number;
    resistencia: number;
    velocidadeAtaque: number; // This is a percentage modifier for attack speed
    velocidadeMovimento: number;
    chanceCritica: number;
    danoCritico: number;
    chanceEsquiva: number;
    vampirismo: number;
}

export interface Item {
    id?: string | number;
    name: string;
    type: string; // e.g., 'sword', 'bow', 'helmet', 'ring', 'boots', 'gauntlet', 'armor', 'shield', 'necklace', 'insignia', 'enchantment'
    icon: string;
    hasNotification?: boolean;
    tier?: 1 | 2 | 3 | 4;
    description?: string;
    statBonuses?: Partial<BaseStats>; 
    equipsToClass?: keyof ClassDataMap; 
}

export interface EquippedItems {
    weapon: Item | null;
    armor: Item | null;
    ring: Item | null;
    enchantment: Item | null;
}

export interface Inventory {
    equipped: EquippedItems;
    backpack: (Item | null)[];
}

export interface PlayerProgress {
    [key: string]: number;
    FLORESTA: number;
    NEVE: number;
    DESERTO: number;
    PANTANO: number;
}

export interface PlayerFragments {
    [itemName: string]: number;
}

export interface BestiaryEntry {
    kills: number;
    claimedTier: number; // The last tier the player has claimed reward for. Starts at 0.
}

export interface PlayerData {
    name: string;
    baseStats: BaseStats;
    inventory: Inventory;
    progress: PlayerProgress;
    fragments: PlayerFragments; 
    hasHadFirstWin: boolean; 
    coins: number;
    gems: number;
    bestiary: {
        [enemyName: string]: BestiaryEntry;
    };
}

export type AbilityEffectType = 'SELF_BUFF' | 'SELF_HEAL' | 'ATTACK_MODIFIER' | 'AOE_DAMAGE_DEBUFF' | 'CHANNELED_DAMAGE_AURA' | 'PROJECTILE_DAMAGE';
export type AbilityTargetType = 'SELF' | 'SINGLE_ENEMY' | 'CONE_ENEMY' | 'AOE_AROUND_SELF' | 'AOE_AROUND_TARGET' | 'NONE';

export interface Ability {
    id: string;
    name: string;
    icon: string;
    description: string;
    cooldownMs: number;
    effectType: AbilityEffectType;
    targetType: AbilityTargetType;
    durationMs?: number; // For buffs, debuffs, channeled effects
    properties?: Record<string, any>; // e.g., { damageMultiplier: 2, bonusDamagePercentTargetMaxHp: 10, radius: 100 }
}

export interface ActiveBuffDebuffEffect {
    // Stat modifications (percentage)
    letalidadePercent?: number;
    vigorPercent?: number;
    resistenciaPercent?: number;
    velocidadeAtaquePercent?: number;
    velocidadeMovimentoPercent?: number;
    chanceCriticaPercent?: number; // Additive percentage points
    danoCriticoPercent?: number; // Additive percentage points
    chanceEsquivaPercent?: number; // Additive percentage points
    rangePercent?: number;
    
    // Stat modifications (flat)
    letalidadeFlat?: number;
    vigorFlat?: number;
    resistenciaFlat?: number;
    // ... other flat stats if needed

    // Special effects
    isTaunted?: boolean;
    nextAttackCrit?: boolean; 
    nextAttackBonusDamagePercentTargetMaxHp?: number;
    resistanceReductionPercent?: number; // For debuffs like "Cortado"
    isImmobile?: boolean;
    isInvulnerable?: boolean;
    isInvisible?: boolean;
    blockCharges?: number; // Number of incoming attacks to block
    channeledDamageAura?: {
        tickIntervalMs: number;
        damageMultiplier: number; // Multiplier of caster's effectiveDamage
        isCrit: boolean;
        radius: number;
        lastTickTime?: number; // Internal state for ticking
    };
    dot?: {
        tickIntervalMs: number;
        damagePerTick: number; // Pre-calculated damage
        lastTickTime?: number; // Internal state for ticking
        sourceCasterId: number; // ID of the entity that applied the debuff
    };
    nextAttackSplash?: {
        radius: number;
        damageMultiplier: number; // e.g. 1.0 for 100% of the main attack's damage
        spreadsDebuffId?: string;
    };
    bonusDamageFromMissingHpPercent?: number;
    multiShot?: {
        count: number;
    };
    dashToTarget?: {
        targetId: number;
        speedMultiplier: number;
        onHitEffect: {
            lethalityMultiplier: number;
            vigorMultiplier: number;
            stunDurationMs: number;
            alwaysCrit: boolean;
        };
    };
    // Add other specific effects as needed
}

export interface ActiveBuffDebuff {
    id: string; // Unique instance id, can be abilityId if not stackable, or unique if stackable
    abilityId: string; // Source ability
    name: string;
    icon?: string;
    durationMs: number;
    remainingMs: number;
    effects: ActiveBuffDebuffEffect;
    appliedAt: number;
    sourceEntityId?: number; // ID of the caster
    targetEntityId?: number; // ID of the entity this is applied to
    isBuff: boolean; // True for buff, false for debuff
    stacks?: number; // Current number of stacks
    maxStacks?: number; // Maximum number of stacks
}


export interface ClassData {
    name:string;
    color: string;
    bodyColor: string;
    weapon: string; 
    hp: number; 
    damage: number; 
    range: number;
    attackSpeed: number; 
    velocidadeMovimento: number; 
    abilities: Ability[];
}

export type ClassDataMap = {
    [key: string]: ClassData;
    AVENTUREIRO: ClassData; 
    GUERREIRO: ClassData;
    MAGO: ClassData;
    ARQUEIRO: ClassData;
    ASSASSINO: ClassData;
    GUARDIÃO: ClassData;
};


export interface EnemyTemplate {
    name: string;
    emoji: string;
    baseHp: number;
    baseDamage: number;
    range: number;
    attackSpeed: number; // ms
    velocidadeMovimento: number;
    size?: number;
    isBoss?: boolean;
    // Enemies can have base stats too, for debuff calculations or variety
    baseStats?: Partial<BaseStats>;
}

export interface Biome {
    name: string;
    description: string;
    color: string;
    mapIconUrl?: string;
    boss: EnemyTemplate;
    enemies: EnemyTemplate[];
    scenery: ('tree' | 'rock' | 'river' | 'pine_tree' | 'puddle' | 'flower')[];
}

export interface BiomeData {
    [key: string]: Biome;
}

export enum ActiveGameSubState {
    IDLE = 'IDLE',
    PLACEMENT = 'PLACEMENT',
    BATTLING = 'BATTLING',
    LEVEL_WON = 'LEVEL_WON',
    LEVEL_LOST = 'LEVEL_LOST',
}


export interface CombatStats extends BaseStats {
    currentHp: number;
    maxHp: number;
    effectiveDamage: number;

    name: string;
    range: number;
    attackIntervalMs: number; 

    color?: string;
    bodyColor?: string;
    weaponRepresentation?: string;
    emoji?: string;

    size?: number;
    isBoss?: boolean;
    isPlayer?: boolean;

    // These will be dynamically calculated based on rawBuffs/Debuffs
    // activeBuffs: ActiveBuffDebuff[]; 
    // activeDebuffs: ActiveBuffDebuff[];
}


export interface PlacementSlot {
    id?: string;
    x: number;
    y: number;
    occupied: boolean;
}

export interface Point {
    x: number;
    y: number;
}

export type ForgeCostTierMap = {
    [tier: number]: number;
};

// --- Combat Report Types ---
export interface HeroCombatStat {
    heroName: string; 
    isDead: boolean;
    damageDealt: number;
    healingDone: number;
    shieldingGranted: number;
    damageTaken: number;
}

export interface EnemyKillCount {
    [enemyName:string]: {
        emoji: string;
        count: number;
    }
}

export interface CombatReportData {
    heroStats: { [heroName: string]: HeroCombatStat }; 
    enemiesKilled: EnemyKillCount;
}

export interface PurchaseOption {
  quantity: 1 | 10;
  cost: number;
  currency: 'coins' | 'gems';
}

export interface MarketItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  contents: {
    fragmentTiers: (1 | 2 | 3 | 4)[];
    fragmentAmount: number;
  };
  purchaseOptions: PurchaseOption[];
}


export type { ModalButton as ModalButtonType } from './components/Modal/Modal';
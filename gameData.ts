

import type { PlayerData as PlayerDataType, BiomeData, ClassDataMap, Item as ItemType, ForgeCostTierMap, Ability, MarketItem } from './types';

export const BESTIARY_QUESTS: { [enemyName: string]: { tiers: { required: number; reward: number }[] } } = {
    // Floresta
    'Leopardo Ágil': { tiers: [{ required: 10, reward: 50 }, { required: 25, reward: 120 }, { required: 50, reward: 250 }, { required: 100, reward: 500 }] },
    'Coelho Saltitante': { tiers: [{ required: 15, reward: 30 }, { required: 40, reward: 80 }, { required: 80, reward: 180 }, { required: 150, reward: 400 }] },
    'Aranha Venenosa': { tiers: [{ required: 12, reward: 40 }, { required: 30, reward: 100 }, { required: 60, reward: 220 }, { required: 120, reward: 450 }] },
    'Preguiça': { tiers: [{ required: 8, reward: 90 }, { required: 20, reward: 200 }, { required: 40, reward: 400 }, { required: 80, reward: 800 }] },
    'Orangotango': { tiers: [{ required: 10, reward: 70 }, { required: 25, reward: 160 }, { required: 50, reward: 320 }, { required: 100, reward: 650 }] },
    'Macaco': { tiers: [{ required: 20, reward: 25 }, { required: 50, reward: 70 }, { required: 100, reward: 150 }, { required: 200, reward: 350 }] },
    'Arara': { tiers: [{ required: 15, reward: 40 }, { required: 40, reward: 90 }, { required: 80, reward: 200 }, { required: 160, reward: 420 }] },
    'Pássaro': { tiers: [{ required: 18, reward: 35 }, { required: 45, reward: 85 }, { required: 90, reward: 190 }, { required: 180, reward: 410 }] },
    'Gorila Ancião': { tiers: [{ required: 1, reward: 100 }, { required: 3, reward: 300 }, { required: 5, reward: 500 }, { required: 10, reward: 1000 }] },
    // Neve
    'Lobo de Gelo': { tiers: [{ required: 10, reward: 60 }, { required: 25, reward: 140 }, { required: 50, reward: 280 }, { required: 100, reward: 550 }] },
    'Pinguim Bombardeiro': { tiers: [{ required: 15, reward: 40 }, { required: 40, reward: 90 }, { required: 80, reward: 200 }, { required: 150, reward: 420 }] },
    'Urso Polar': { tiers: [{ required: 8, reward: 80 }, { required: 20, reward: 180 }, { required: 40, reward: 350 }, { required: 80, reward: 700 }] },
    'Aranha da Neve': { tiers: [{ required: 12, reward: 45 }, { required: 30, reward: 110 }, { required: 60, reward: 230 }, { required: 120, reward: 480 }] },
    'Vírus Congelado': { tiers: [{ required: 10, reward: 50 }, { required: 25, reward: 125 }, { required: 50, reward: 260 }, { required: 100, reward: 540 }] },
    'Cervo das Neves': { tiers: [{ required: 15, reward: 40 }, { required: 40, reward: 95 }, { required: 80, reward: 210 }, { required: 160, reward: 440 }] },
    'Coruja da Neve': { tiers: [{ required: 15, reward: 50 }, { required: 40, reward: 115 }, { required: 80, reward: 240 }, { required: 160, reward: 500 }] },
    'Snowboarder Radical': { tiers: [{ required: 18, reward: 40 }, { required: 45, reward: 100 }, { required: 90, reward: 220 }, { required: 180, reward: 460 }] },
    'Boneco de Neve': { tiers: [{ required: 1, reward: 120 }, { required: 3, reward: 350 }, { required: 5, reward: 600 }, { required: 10, reward: 1200 }] },
    // Deserto
    'Cobra Cascavel': { tiers: [{ required: 12, reward: 55 }, { required: 30, reward: 130 }, { required: 60, reward: 260 }, { required: 120, reward: 520 }] },
    'Abutre Carniceiro': { tiers: [{ required: 15, reward: 45 }, { required: 40, reward: 100 }, { required: 80, reward: 210 }, { required: 150, reward: 430 }] },
    'Lagarto de Comodo': { tiers: [{ required: 10, reward: 70 }, { required: 25, reward: 160 }, { required: 50, reward: 320 }, { required: 100, reward: 650 }] },
    'Dromedário': { tiers: [{ required: 10, reward: 65 }, { required: 25, reward: 150 }, { required: 50, reward: 300 }, { required: 100, reward: 620 }] },
    'Camelo': { tiers: [{ required: 10, reward: 65 }, { required: 25, reward: 150 }, { required: 50, reward: 300 }, { required: 100, reward: 620 }] },
    'Escorpião Rei': { tiers: [{ required: 1, reward: 150 }, { required: 3, reward: 400 }, { required: 5, reward: 750 }, { required: 10, reward: 1500 }] },
    // Pântano
    'Sapo Saltador': { tiers: [{ required: 15, reward: 40 }, { required: 40, reward: 90 }, { required: 80, reward: 200 }, { required: 150, reward: 420 }] },
    'Víbora do Lodo': { tiers: [{ required: 12, reward: 55 }, { required: 30, reward: 130 }, { required: 60, reward: 260 }, { required: 120, reward: 520 }] },
    'Salamandra Ácida': { tiers: [{ required: 12, reward: 60 }, { required: 30, reward: 140 }, { required: 60, reward: 280 }, { required: 120, reward: 560 }] },
    'Jacaré Sorrateiro': { tiers: [{ required: 10, reward: 70 }, { required: 25, reward: 160 }, { required: 50, reward: 320 }, { required: 100, reward: 650 }] },
    'Hipopótamo Agressivo': { tiers: [{ required: 8, reward: 90 }, { required: 20, reward: 200 }, { required: 40, reward: 400 }, { required: 80, reward: 800 }] },
    'Tartaruga Ancestral': { tiers: [{ required: 5, reward: 100 }, { required: 15, reward: 250 }, { required: 30, reward: 500 }, { required: 60, reward: 1000 }] },
    'Rei Crocodilo': { tiers: [{ required: 1, reward: 200 }, { required: 3, reward: 500 }, { required: 5, reward: 900 }, { required: 10, reward: 2000 }] },
};


// Default player data, App.tsx will load from localStorage or use this.
export const PLAYER_DATA: PlayerDataType = {
    name: "Rei Bárbaro",
    coins: 0,
    gems: 0,
    bestiary: {},
    baseStats: {
        letalidade: 10, vigor: 10, resistencia: 5,
        velocidadeAtaque: 0, // Base modifier is 0%
        velocidadeMovimento: 1.2,
        chanceCritica: 5, danoCritico: 50,
        chanceEsquiva: 5, vampirismo: 0
    },
    inventory: {
        equipped: { 
            weapon: null,
            armor: null,
            ring: null,
            enchantment: null,
        },
        backpack: [ 
            null, null, null, null, null,
            null, null, null, null, null,
            null, null, null, null, null
        ]
    },
    progress: { FLORESTA: 1, NEVE: 1, DESERTO: 1, PANTANO: 1 },
    fragments: {}, 
    hasHadFirstWin: false, 
};

export const FORGE_COSTS_BY_TIER: ForgeCostTierMap = {
    1: 10,
    2: 30,
    3: 50,
    4: 100,
};

export const ITEM_SELL_VALUE_BY_TIER: { [tier: number]: number } = {
    1: 10,
    2: 30,
    3: 100,
    4: 300,
};

export const DROPPABLE_WEAPONS: ItemType[] = [
    { name: "Espada Velha", type: 'sword', icon: '🗡️', tier: 1, description: "Uma espada básica, mas confiável para um iniciante.", statBonuses: { letalidade: 1, vigor: 1 }, equipsToClass: 'GUERREIRO' },
    { name: "Arco Élfico", type: 'bow', icon: '🏹', tier: 1, description: "Feito por elfos habilidosos. Leve e preciso.", statBonuses: { chanceCritica: 5, letalidade: 3 }, equipsToClass: 'ARQUEIRO' },
    { name: "Cajado do Mago Aprendiz", type: 'staff', icon: '📍', tier: 1, description: "Um cajado simples para iniciantes na magia.", statBonuses: { letalidade: 4 }, equipsToClass: 'MAGO' },
    { name: "Adaga Sombria", type: 'dagger', icon: '🔪', tier: 1, description: "Ideal para ataques rápidos e furtivos.", statBonuses: { velocidadeAtaque: 5, chanceCritica: 3 }, equipsToClass: 'ASSASSINO' },
    { name: "Escudo do Guardião", type: 'shield', icon: '🛡️', tier: 1, description: "Oferece proteção robusta contra ataques.", statBonuses: { resistencia: 8, vigor: 5 }, equipsToClass: 'GUARDIÃO' },
    { 
        name: "Camisa", 
        type: 'armor', 
        icon: '👕', 
        tier: 1, 
        description: "Uma camisa confortável que, surpreendentemente, melhora seus reflexos e vitalidade.", 
        statBonuses: { vigor: 10, letalidade: 10, danoCritico: 20, resistencia: 10 } 
    },
    { 
        name: "Meias", 
        type: 'armor', 
        icon: '🧦', 
        tier: 1, 
        description: "Meias quentinhas que te deixam mais ágil e sortudo.", 
        statBonuses: { letalidade: 20, chanceCritica: 10, velocidadeAtaque: 10, chanceEsquiva: 10 } 
    },
    { 
        name: "Botas Rústicas", 
        type: 'armor', 
        icon: '🥾', 
        tier: 1, 
        description: "Botas de couro resistentes, perfeitas para longas jornadas e para aguentar pancada.", 
        statBonuses: { vigor: 30, resistencia: 20 } 
    },
    { 
        name: "Luvas", 
        type: 'armor', 
        icon: '🧤', 
        tier: 1, 
        description: "Luvas de couro que firmam o aperto, permitindo golpes mais fortes e precisos.", 
        statBonuses: { letalidade: 30, danoCritico: 20 } 
    }
];

export const MARKET_ITEMS: MarketItem[] = [
    {
        id: 'caixa_fragmentos',
        name: 'Caixa de Fragmentos',
        icon: '🧰',
        description: 'Contém 10 fragmentos de itens aleatórios do tier 1 ou 2.',
        contents: {
            fragmentTiers: [1, 2],
            fragmentAmount: 10,
        },
        purchaseOptions: [
            { quantity: 1, cost: 50, currency: 'coins' },
            { quantity: 10, cost: 450, currency: 'coins' },
        ]
    },
    {
        id: 'envelope_misterioso',
        name: 'Envelope Misterioso',
        icon: '🧧',
        description: 'Contém 10 fragmentos de itens aleatórios do tier 2 ou 3.',
        contents: {
            fragmentTiers: [2, 3],
            fragmentAmount: 10,
        },
        purchaseOptions: [
            { quantity: 1, cost: 100, currency: 'coins' },
            { quantity: 10, cost: 900, currency: 'coins' },
        ]
    },
    {
        id: 'mochila_especial',
        name: 'Mochila Especial',
        icon: '🎒',
        description: 'Contém 10 fragmentos de itens aleatórios do tier 3 ou 4.',
        contents: {
            fragmentTiers: [3, 4],
            fragmentAmount: 10,
        },
        purchaseOptions: [
            { quantity: 1, cost: 500, currency: 'coins' },
            { quantity: 10, cost: 4500, currency: 'coins' },
        ]
    },
    {
        id: 'presente_misterioso',
        name: 'Presente Misterioso',
        icon: '🎁',
        description: 'Contém 20 fragmentos de itens aleatórios do tier 4.',
        contents: {
            fragmentTiers: [4],
            fragmentAmount: 20,
        },
        purchaseOptions: [
            { quantity: 1, cost: 100, currency: 'gems' },
            { quantity: 10, cost: 900, currency: 'gems' },
        ]
    }
];

const ADVENTURER_ABILITIES: Ability[] = [
    {
        id: 'AVENTUREIRO_SOCO_SERIO',
        name: 'Soco Sério',
        icon: '🤜',
        description: 'Um soco comum, causa dano baseado no seu dano base +2% da vida máxima do alvo.',
        cooldownMs: 5000,
        effectType: 'AOE_DAMAGE_DEBUFF', // Using this type for single-target instant damage, like Shield Bash
        targetType: 'SINGLE_ENEMY',
        properties: { 
            bonusDamagePercentTargetMaxHp: 2,
        }
    }
];

const WARRIOR_ABILITIES: Ability[] = [
    {
        id: 'GUERREIRO_GOLPE_CERTEIRO',
        name: 'Golpe Certeiro',
        icon: '💥',
        description: 'Seu próximo ataque é crítico garantido e causa dano adicional com base em 10% da vida total do alvo.',
        cooldownMs: 8000,
        effectType: 'ATTACK_MODIFIER',
        targetType: 'SELF',
        durationMs: 5000, // Buff window for next attack
        properties: { nextAttackCrit: true, bonusDamagePercentTargetMaxHp: 10 }
    },
    {
        id: 'GUERREIRO_CORTE_CRESCENTE',
        name: 'Corte Crescente',
        icon: '🗡',
        description: 'Causa dano (dano base + 200% da letalidade) em cone e aplica "Cortado" (-20% resistência) por 5s.',
        cooldownMs: 6000,
        effectType: 'AOE_DAMAGE_DEBUFF',
        targetType: 'CONE_ENEMY',
        properties: { damageBaseMultiplier: 1, damageLethalityMultiplier: 2.0, resistanceReductionPercent: 20, debuffDurationMs: 5000, range: 60, angle: 90 }
    },
    {
        id: 'GUERREIRO_FORCA_EXTREMA',
        name: 'Força Extrema',
        icon: '💪',
        description: 'Aumenta letalidade e vigor em 50%. Se vida < 50%, cura 20% da vida total.',
        cooldownMs: 12000,
        effectType: 'SELF_BUFF', // Also SELF_HEAL conditionally
        targetType: 'SELF',
        durationMs: 10000,
        properties: { lethalityBonusPercent: 50, vigorBonusPercent: 50, healPercentMaxHpIfBelowHalf: 20 }
    },
    {
        id: 'GUERREIRO_GOLPE_GIRATORIO',
        name: 'Golpe Giratório',
        icon: '🌀',
        description: 'Durante 5s, fica imóvel mas causa dano crítico em área ao redor.',
        cooldownMs: 20000,
        effectType: 'CHANNELED_DAMAGE_AURA',
        targetType: 'AOE_AROUND_SELF',
        durationMs: 5000,
        properties: { damageTickIntervalMs: 500, tickDamageMultiplier: 0.5, isImmobile: true } // Example: 50% of normal attack as crit per tick
    }
];

const ARCHER_ABILITIES: Ability[] = [
    {
        id: 'ARQUEIRO_DISPARO_PRECISO',
        name: 'Disparo Preciso',
        icon: '🎯',
        description: 'Atira uma flecha que causa dano (Dano base + 100% Letalidade) e aplica "Na Mira" 💢, reduzindo a defesa do alvo em 5%. Acumula até 5 vezes.',
        cooldownMs: 3000,
        effectType: 'PROJECTILE_DAMAGE',
        targetType: 'SINGLE_ENEMY',
        properties: { 
            damageLethalityMultiplier: 1.0,
            debuff: {
                id: 'DEBUFF_NA_MIRA',
                name: 'Na Mira',
                icon: '💢',
                durationMs: 8000,
                maxStacks: 5,
                effects: { resistanceReductionPercent: 5 }
            }
        }
    },
    {
        id: 'ARQUEIRO_TIRO_MORTAL',
        name: 'Tiro Mortal',
        icon: '☠️',
        description: 'Causa dano em todos os inimigos com "Na Mira" baseado nos acúmulos + 12% da vida perdida do alvo. Consome os acúmulos.',
        cooldownMs: 12000,
        effectType: 'AOE_DAMAGE_DEBUFF',
        targetType: 'NONE',
        properties: { 
            damagePerStackMultiplier: 0.5,
            damagePercentMissingHp: 12,
            consumesDebuffId: 'DEBUFF_NA_MIRA'
        }
    },
    {
        id: 'ARQUEIRO_DISPARO_MULTIPLO',
        name: 'Disparo Múltiplo',
        icon: '🔱',
        description: 'Dispara 5 flechas em cone que atravessam inimigos, causando dano (Dano base + 100% Letalidade).',
        cooldownMs: 6000,
        effectType: 'PROJECTILE_DAMAGE',
        targetType: 'CONE_ENEMY',
        properties: { 
            numProjectiles: 5,
            coneAngle: 60,
            damageLethalityMultiplier: 1.0,
            piercing: true
        }
    },
    {
        id: 'ARQUEIRO_HABILIDADE_E_PRECISAO',
        name: 'Habilidade e Precisão',
        icon: '🏹',
        description: 'Aumenta 100% seu alcance de ataque, aumenta 40% sua velocidade de ataque durante 5 segundos e enquanto o efeito do buff estiver ativo, ataques e habilidades que eram de alvo único, agora atingem até 3 alvos.',
        cooldownMs: 20000,
        effectType: 'SELF_BUFF',
        targetType: 'SELF',
        durationMs: 5000,
        properties: { 
            rangePercent: 100,
            velocidadeAtaquePercent: 40,
            multiShot: {
                count: 3
            }
        }
    }
];

const GUARDIAN_ABILITIES: Ability[] = [
    {
        id: 'GUARDIÃO_GOLPE_DE_ESCUDO',
        name: 'Golpe de Escudo',
        icon: '💫',
        description: 'Golpeia o inimigo, causando dano (10% da sua vida máxima + dano base) e atordoa o alvo por 2 segundos. Este ataque pode causar acerto crítico.',
        cooldownMs: 10000,
        effectType: 'AOE_DAMAGE_DEBUFF', // Using existing type, logic is handled by ID
        targetType: 'SINGLE_ENEMY',
        properties: { 
            stunDurationMs: 2000, 
            bonusDamagePercentCasterMaxHp: 10,
        }
    },
    {
        id: 'GUARDIÃO_PROVOCAR',
        name: 'Provocar',
        icon: '🤬',
        description: 'Força inimigos próximos a te atacar e aumenta sua Resistência em 50 por 4 segundos.',
        cooldownMs: 8000,
        effectType: 'AOE_DAMAGE_DEBUFF', // Using existing type, custom logic applies
        targetType: 'AOE_AROUND_SELF',
        durationMs: 4000,
        properties: {
            resistanceBonusFlat: 50,
            radius: 150,
        }
    },
    {
        id: 'GUARDIÃO_FORCA_DE_BLOQUEIO',
        name: 'Força de Bloqueio',
        icon: '🛡️',
        description: 'Cria escudos orbitais que bloqueiam os próximos 2 ataques inimigos recebidos.',
        cooldownMs: 10000,
        effectType: 'SELF_BUFF',
        targetType: 'SELF',
        durationMs: 15000,
        properties: { blockCharges: 2 }
    },
    {
        id: 'GUARDIÃO_PROTEÇÃO_COMPARTILHADA',
        name: 'Proteção Compartilhada',
        icon: '🤝',
        description: 'Você e seus aliados ganham um escudo correspondente a 20% da sua vida máxima. Se sua vida estiver acima de 70%, você também ganha +50% de Vigor por 6 segundos.',
        cooldownMs: 35000,
        effectType: 'SELF_BUFF',
        targetType: 'NONE', // Affects all allies, not a specific target
        properties: {
            shieldHpPercentOfCasterMaxHp: 20,
            conditionalVigorBonusPercent: 50,
            healthThresholdPercent: 70,
            buffDurationMs: 6000,
        }
    }
];

const MAGE_ABILITIES: Ability[] = [
    {
        id: 'MAGO_BOLA_DE_FOGO',
        name: 'Bola de Fogo',
        icon: '🔥',
        description: 'Arremessa uma bola de fogo que causa dano (dano base + 8% da vida total do alvo) e aplica "Queimadura" por 6s. Queimadura causa dano por segundo (20% do dano base + 1% da vida total do alvo).',
        cooldownMs: 12000,
        effectType: 'PROJECTILE_DAMAGE',
        targetType: 'SINGLE_ENEMY',
        properties: { 
            bonusDamagePercentTargetMaxHp: 8,
            debuff: {
                id: 'DEBUFF_QUEIMADURA',
                name: 'Queimadura',
                icon: '🔥',
                durationMs: 6000,
                effects: {
                    dot: { // This part is a template, the actual damage value is calculated on hit
                        tickIntervalMs: 1000,
                        damagePercentOfTargetMaxHp: 1,
                        damagePercentOfCasterDamage: 20
                    }
                }
            }
        }
    },
    {
        id: 'MAGO_EXPLOSAO_MAGICA',
        name: 'Explosão Mágica',
        icon: '💥',
        description: 'Seu próximo ataque causa dano crítico e atinge inimigos ao redor do alvo. Se o alvo estiver com "Queimadura", o efeito se espalha para os outros inimigos atingidos.',
        cooldownMs: 6000,
        effectType: 'ATTACK_MODIFIER',
        targetType: 'SELF',
        durationMs: 5000, // 5s window to perform the attack
        properties: {
            nextAttackCrit: true,
            nextAttackSplash: {
                radius: 80, // A small area
                damageMultiplier: 1.0, // Splash deals full damage
                spreadsDebuffId: 'DEBUFF_QUEIMADURA'
            }
        }
    },
    {
        id: 'MAGO_INTELECTO_SURREAL',
        name: 'Intelecto Surreal',
        icon: '🧙‍♂️',
        description: 'Você lança um buff poderoso nos aliados concedendo +50% em dano crítico e +30% Letalidade, duração 15 segundos.',
        cooldownMs: 20000,
        effectType: 'SELF_BUFF',
        targetType: 'NONE', // Affects all allies
        durationMs: 15000,
        properties: { 
            danoCriticoPercent: 50, 
            letalidadePercent: 30 
        }
    },
    {
        id: 'MAGO_EXPLOSAO_GELIDA',
        name: 'Explosão Gélida',
        icon: '❄️',
        description: 'Causa dano em área no alvo atual ou inimigo mais próximo (Dano base + 200% da letalidade), e aplica o efeito de lentidão nos alvos (-30% de velocidade no movimento e -50% na velocidade de ataque).',
        cooldownMs: 5000,
        effectType: 'AOE_DAMAGE_DEBUFF',
        targetType: 'AOE_AROUND_TARGET',
        properties: {
            radius: 120,
            damageLethalityMultiplier: 2.0,
            debuff: {
                id: 'DEBUFF_LENTIDAO',
                name: 'Lentidão',
                icon: '🥶',
                durationMs: 5000,
                effects: { 
                    velocidadeMovimentoPercent: -30,
                    velocidadeAtaquePercent: -50
                }
            }
        }
    }
];

const ASSASSIN_ABILITIES: Ability[] = [
    {
        id: 'ASSASSINO_MODO_OCULTO',
        name: 'Modo Oculto',
        icon: '🐱‍👤',
        description: 'Você entra em estado furtivo, ficando invisível por 4 segundos. Durante esse período, nenhum inimigo consegue te ver, e você pode atacar e usar outras habilidades normalmente sem ser revelado.',
        cooldownMs: 15000,
        effectType: 'SELF_BUFF',
        targetType: 'SELF',
        durationMs: 4000,
        properties: {
            // No specific properties needed, the effect is handled by the buff system
        }
    },
    {
        id: 'ASSASSINO_GOLPE_DUPLO',
        name: 'Golpe Duplo',
        icon: '🤺',
        description: 'Atinge o inimigo com 2 golpes consecutivos, causando dano (dano base + 150% da letalidade). Se você estiver em modo furtivo, esta habilidade causa dano crítico.',
        cooldownMs: 4000,
        effectType: 'AOE_DAMAGE_DEBUFF', // Using for direct damage
        targetType: 'SINGLE_ENEMY',
        properties: {
            damageLethalityMultiplier: 1.5,
            numberOfHits: 2,
            hitIntervalMs: 200,
            critFromStealth: true,
        }
    },
    {
        id: 'ASSASSINO_APUNHALAR',
        name: 'Apunhalar',
        icon: '🔪',
        description: 'Teleporta para um inimigo, causando dano (Dano Base + 200% Letalidade) e aplicando "Pontos Vitais Atingidos" por 5s. Dano crítico se usado em modo furtivo. O debuff adiciona dano bônus de 20% da vida perdida do alvo a todos os seus ataques.',
        cooldownMs: 8000,
        effectType: 'AOE_DAMAGE_DEBUFF',
        targetType: 'SINGLE_ENEMY',
        properties: {
            damageLethalityMultiplier: 2.0,
            critFromStealth: true,
            debuff: {
                id: 'DEBUFF_PONTOS_VITAIS',
                name: 'Pontos Vitais Atingidos',
                icon: '🩸',
                durationMs: 5000,
                effects: { 
                    bonusDamageFromMissingHpPercent: 20 
                }
            }
        }
    },
    {
        id: 'ASSASSINO_AGILIDADE_EXTREMA',
        name: 'Agilidade Extrema',
        icon: '👣',
        description: 'Você recebe +40% de chance de esquiva, +50% em velocidade de ataque e 30% em velocidade de movimento, durante 5 segundos. Se você estiver no modo furtivo, você ganha o dobro dos efeitos.',
        cooldownMs: 20000,
        effectType: 'SELF_BUFF',
        targetType: 'SELF',
        durationMs: 5000,
        properties: {
            chanceEsquivaPercent: 40,
            velocidadeAtaquePercent: 50,
            velocidadeMovimentoPercent: 30,
            stealthBonusMultiplier: 2,
        }
    }
];


export const CLASSES: ClassDataMap = {
    AVENTUREIRO: { name: 'Aventureiro', color: '#BDBDBD', bodyColor: '#757575', weapon: 'unarmed', hp: 360, damage: 10, range: 40, attackSpeed: 1200, velocidadeMovimento: 1.2, abilities: ADVENTURER_ABILITIES },
    GUERREIRO: { name: 'Guerreiro', color: '#BCAAA4', bodyColor: '#4E342E', weapon: 'sword', hp: 450, damage: 15, range: 40, attackSpeed: 1000, velocidadeMovimento: 1.5, abilities: WARRIOR_ABILITIES },
    MAGO: { name: 'Mago', color: '#90CAF9', bodyColor: '#1565C0', weapon: 'staff', hp: 240, damage: 20, range: 200, attackSpeed: 1500, velocidadeMovimento: 1.0, abilities: MAGE_ABILITIES },
    ARQUEIRO: { name: 'Arqueiro', color: '#A5D6A7', bodyColor: '#2E7D32', weapon: 'bow', hp: 270, damage: 12, range: 250, attackSpeed: 900, velocidadeMovimento: 1.2, abilities: ARCHER_ABILITIES },
    ASSASSINO: { name: 'Assassino', color: '#616161', bodyColor: '#212121', weapon: 'dagger', hp: 210, damage: 25, range: 35, attackSpeed: 700, velocidadeMovimento: 1.8, abilities: ASSASSIN_ABILITIES },
    GUARDIÃO: { name: 'Guardião', color: '#E0E0E0', bodyColor: '#5D4037', weapon: 'shield', hp: 750, damage: 8, range: 45, attackSpeed: 1200, velocidadeMovimento: 0.8, abilities: GUARDIAN_ABILITIES }
};

export const BIOMES: BiomeData = {
    FLORESTA: {
        name: "Floresta",
        description: "Uma floresta densa cheia de criaturas perigosas.",
        color: '#78B446',
        mapIconUrl: 'https://image.pollinations.ai/prompt/top%20down%20game%20map,%20lush%20green%20forest,%20cartoon%20style,%20vibrant,%20simple?width=100&height=100&seed=110',
        boss: { name: "Gorila Ancião", emoji: "🦍", baseHp: 2400, baseDamage: 25, isBoss: true, size: 40, velocidadeMovimento: 1.1, range: 40, attackSpeed: 1200 },
        enemies: [
            { name: 'Leopardo Ágil', emoji: '🐆', baseHp: 360, baseDamage: 20, range: 35, attackSpeed: 800, velocidadeMovimento: 2.0 },
            { name: 'Coelho Saltitante', emoji: '🐇', baseHp: 180, baseDamage: 5, range: 25, attackSpeed: 700, velocidadeMovimento: 2.5 },
            { name: 'Aranha Venenosa', emoji: '🕷️', baseHp: 240, baseDamage: 15, range: 30, attackSpeed: 900, velocidadeMovimento: 1.6 },
            { name: 'Preguiça', emoji: '🦥', baseHp: 800, baseDamage: 25, range: 40, attackSpeed: 2000, velocidadeMovimento: 0.5 },
            { name: 'Orangotango', emoji: '🦧', baseHp: 600, baseDamage: 22, range: 40, attackSpeed: 1300, velocidadeMovimento: 1.0 },
            { name: 'Macaco', emoji: '🐒', baseHp: 200, baseDamage: 8, range: 30, attackSpeed: 800, velocidadeMovimento: 2.2 },
            { name: 'Arara', emoji: '🦜', baseHp: 180, baseDamage: 12, range: 180, attackSpeed: 1100, velocidadeMovimento: 1.8 },
            { name: 'Pássaro', emoji: '🐦', baseHp: 150, baseDamage: 10, range: 160, attackSpeed: 1000, velocidadeMovimento: 2.0 },
        ],
        scenery: ['tree', 'pine_tree', 'rock', 'flower', 'puddle', 'tree', 'rock', 'pine_tree', 'tree', 'rock', 'flower', 'tree', 'pine_tree', 'tree', 'puddle', 'rock', 'flower', 'tree', 'pine_tree']
    },
    NEVE: {
        name: "Neve",
        description: "Picos congelados habitados por feras resistentes ao frio.",
        color: '#D6EAF8',
        mapIconUrl: 'https://image.pollinations.ai/prompt/top%20down%20game%20map,%20snowy%20winter%20forest,%20cartoon%20style,%20pine%20trees,%20simple?width=100&height=100&seed=120',
        boss: { name: "Boneco de Neve", emoji: '⛄', baseHp: 2800, baseDamage: 35, isBoss: true, size: 45, velocidadeMovimento: 0.9, range: 200, attackSpeed: 1500 },
        enemies: [
            { name: 'Lobo de Gelo', emoji: '🐺', baseHp: 420, baseDamage: 18, range: 35, attackSpeed: 900, velocidadeMovimento: 1.9 },
            { name: 'Pinguim Bombardeiro', emoji: '🐧', baseHp: 240, baseDamage: 10, range: 200, attackSpeed: 1200, velocidadeMovimento: 1.2 },
            { name: 'Urso Polar', emoji: '🐻‍❄️', baseHp: 720, baseDamage: 22, range: 40, attackSpeed: 1500, velocidadeMovimento: 0.9 },
            { name: 'Aranha da Neve', emoji: '🕷️', baseHp: 300, baseDamage: 18, range: 35, attackSpeed: 900, velocidadeMovimento: 1.8 },
            { name: 'Vírus Congelado', emoji: '🦠', baseHp: 500, baseDamage: 10, range: 30, attackSpeed: 1800, velocidadeMovimento: 0.7 },
            { name: 'Cervo das Neves', emoji: '🦌', baseHp: 350, baseDamage: 15, range: 35, attackSpeed: 1100, velocidadeMovimento: 2.1 },
            { name: 'Coruja da Neve', emoji: '🦉', baseHp: 250, baseDamage: 14, range: 220, attackSpeed: 1000, velocidadeMovimento: 1.9 },
            { name: 'Snowboarder Radical', emoji: '🏂', baseHp: 280, baseDamage: 16, range: 30, attackSpeed: 800, velocidadeMovimento: 2.8 },
        ],
        scenery: ['tree', 'rock', 'tree', 'rock', 'tree', 'tree', 'rock', 'tree', 'rock', 'tree', 'rock', 'rock', 'tree', 'rock', 'tree', 'rock']
    },
    DESERTO: {
        name: "Deserto",
        description: "Dunas escaldantes povoadas por criaturas peçonhentas e resistentes.",
        color: '#FDEBD0',
        mapIconUrl: 'https://image.pollinations.ai/prompt/top%20down%20game%20map,%20sandy%20desert%20with%20cactus,%20cartoon%20style,%20simple?width=100&height=100&seed=130',
        boss: { name: "Escorpião Rei", emoji: '🦂', baseHp: 3000, baseDamage: 22, attackSpeed: 1100, isBoss: true, size: 50, range: 40, velocidadeMovimento: 1.2 },
        enemies: [
            { name: 'Cobra Cascavel', emoji: '🐍', baseHp: 330, baseDamage: 18, range: 30, attackSpeed: 800, velocidadeMovimento: 1.6 },
            { name: 'Abutre Carniceiro', emoji: '🦅', baseHp: 270, baseDamage: 12, range: 35, attackSpeed: 700, velocidadeMovimento: 2.2 },
            { name: 'Lagarto de Comodo', emoji: '🦎', baseHp: 480, baseDamage: 15, range: 25, attackSpeed: 1000, velocidadeMovimento: 1.4 },
            { name: 'Dromedário', emoji: '🐪', baseHp: 650, baseDamage: 18, range: 40, attackSpeed: 1600, velocidadeMovimento: 1.0 },
            { name: 'Camelo', emoji: '🐫', baseHp: 700, baseDamage: 16, range: 40, attackSpeed: 1700, velocidadeMovimento: 0.9 },
        ],
         scenery: ['tree', 'rock', 'rock', 'tree', 'rock', 'tree', 'rock', 'rock', 'tree', 'rock', 'tree', 'rock', 'tree', 'rock', 'rock']
    },
    PANTANO: {
        name: "Pântano",
        description: "Um pântano lamacento e cheio de predadores perigosos.",
        color: '#556B2F', // Dark Olive Green
        mapIconUrl: 'https://image.pollinations.ai/prompt/top%20down%20game%20map,%20swamp%20with%20vines%20and%20murky%20water,%20cartoon%20style,%20simple?width=100&height=100&seed=140',
        boss: { name: "Rei Crocodilo", emoji: '🐊', baseHp: 3200, baseDamage: 30, isBoss: true, size: 55, velocidadeMovimento: 1.0, range: 45, attackSpeed: 1300 },
        enemies: [
            { name: 'Sapo Saltador', emoji: '🐸', baseHp: 280, baseDamage: 15, range: 30, attackSpeed: 800, velocidadeMovimento: 2.2 },
            { name: 'Víbora do Lodo', emoji: '🐍', baseHp: 380, baseDamage: 25, range: 35, attackSpeed: 900, velocidadeMovimento: 1.5, baseStats: { vampirismo: 10 } },
            { name: 'Salamandra Ácida', emoji: '🦎', baseHp: 320, baseDamage: 20, range: 180, attackSpeed: 1100, velocidadeMovimento: 1.4 },
            { name: 'Jacaré Sorrateiro', emoji: '🐊', baseHp: 550, baseDamage: 24, range: 40, attackSpeed: 1200, velocidadeMovimento: 1.2 },
            { name: 'Hipopótamo Agressivo', emoji: '🦛', baseHp: 900, baseDamage: 28, range: 40, attackSpeed: 1800, velocidadeMovimento: 0.8 },
            { name: 'Tartaruga Ancestral', emoji: '🐢', baseHp: 1200, baseDamage: 15, range: 40, attackSpeed: 2200, velocidadeMovimento: 0.4, baseStats: { resistencia: 30 } },
        ],
        scenery: ['tree', 'rock', 'river', 'tree', 'rock', 'river', 'rock']
    }
};

export enum GameState {
    MENU = 'MENU',
    PLACEMENT = 'PLACEMENT',
    BATTLE = 'BATTLE',
    GAME_OVER_INTERNAL = 'GAME_OVER_INTERNAL', 
    POST_BATTLE_REWARDS = 'POST_BATTLE_REWARDS',
    LEVEL_LOST = 'LEVEL_LOST'
}
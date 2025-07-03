import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Application } from 'pixi.js'; // Import PixiJS
import type { PlayerData, ClassDataMap, BiomeData, BaseStats, ClassData, EnemyTemplate, Item, Point, PlacementSlot as PlacementSlotType, Biome as BiomeType, EquippedItems, Ability as AbilityType, ActiveBuffDebuff, ActiveBuffDebuffEffect, CombatReportData, EnemyKillCount } from '../../types';
import { GameState, CLASSES as ALL_CLASSES_DATA, PLAYER_DATA as DEFAULT_PLAYER_DATA } from '../../gameData'; // Added DEFAULT_PLAYER_DATA
import { calculateFinalStats as calculateFinalStatsForUI } from '../MainMenu/HeroTab'; 
import AbilityBar from './AbilityBar';
import { VisualEffectsManager } from './VisualEffectsManager'; 

import { GRID_SIZE, MIN_PLACEMENT_DIST_TO_ENEMY } from './gameConstants';
import { drawRoundedRect, drawTree, drawRock, drawRiver, drawPineTree, drawPuddle, drawFlower } from './drawingUtils';
import type { SceneryElement, TreeSceneryElement, RockSceneryElement, RiverSceneryElement, PineTreeSceneryElement, PuddleSceneryElement, FlowerSceneryElement } from './sceneryTypes';
import type { CombatCapable, UpdateResult } from './entityInterfaces';
import { resetEntityIdCounter, calculateFinalStatsForEntity, isTargetInCone, distanceToTarget, getMultiShotTargets } from './entityUtils'; // Added isTargetInCone, distanceToTarget

import { Character } from './entities/Character'; 
import { HeroEntity } from './entities/HeroEntity';
import { EnemyEntity } from './entities/EnemyEntity';
import { Projectile } from './entities/Projectile'; 
import { DamageNumber } from './entities/DamageNumber';
import { DeathEffect } from './entities/DeathEffect';


interface GameContainerProps {
  playerData: PlayerData;
  classes: ClassDataMap;
  biomes: BiomeData;
  currentBattleBiomeKey: string;
  onGameEnd: (playerWon: boolean, biomeKey: string, isBossLevel: boolean, report: CombatReportData) => void;
  initialGameState: GameState;
  onShowCombatReport: () => void;
}

const defaultEmptyBaseStats: BaseStats = { // Used for enemies if their template lacks base stats
    letalidade: 0, vigor: 0, resistencia: 0, 
    velocidadeAtaque: 0, velocidadeMovimento: 1, 
    chanceCritica: 0, danoCritico: 50, // Default danoCritico to 50%
    chanceEsquiva: 0, vampirismo: 0 
};

interface RainParticle {
    x: number;
    y: number;
    length: number;
    speed: number;
    opacity: number;
}


const GameContainer: React.FC<GameContainerProps> = ({
  playerData, classes, biomes, currentBattleBiomeKey,
  onGameEnd, initialGameState, onShowCombatReport
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiCanvasRef = useRef<HTMLCanvasElement>(null); 
  const pixiAppRef = useRef<Application | null>(null); 
  const visualEffectsManagerRef = useRef<VisualEffectsManager | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const animationFrameId = useRef<number | undefined>(undefined);
  const hasEndedLevel = useRef(false);
  const lastFrameTimeRef = useRef<number>(0);

  // --- State managed by React (for UI rendering) ---
  const [internalGameState, setInternalGameState] = useState<GameState>(initialGameState);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedEntityForInfo, setSelectedEntityForInfo] = useState<CombatCapable | null>(null);
  const [mainHeroAbilities, setMainHeroAbilities] = useState<AbilityType[]>([]);
  const [mainHeroAbilityCooldowns, setMainHeroAbilityCooldowns] = useState<{ [abilityId: string]: number }>({});
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // --- Game state managed by Refs (for performance, avoids re-renders) ---
  const heroesRef = useRef<HeroEntity[]>([]);
  const enemiesRef = useRef<EnemyEntity[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const effectsRef = useRef<DeathEffect[]>([]);
  const delayedActionsRef = useRef<{ executeAt: number; action: () => UpdateResult[] }[]>([]);
  const placementSlotsRef = useRef<PlacementSlotType[]>([]);
  const sceneryElementsRef = useRef<SceneryElement[]>([]);
  const rainParticlesRef = useRef<RainParticle[]>([]);
  const initialHeroesRef = useRef<HeroEntity[]>([]);
  const killedEnemiesRef = useRef<EnemyKillCount>({});
  const draggedHeroRef = useRef<{ hero: HeroEntity; originalX: number; originalY: number } | null>(null);
  const mainHeroClassKeyRef = useRef<keyof ClassDataMap>('AVENTUREIRO');


  const currentBiome = biomes[currentBattleBiomeKey];
  const currentLevel = playerData.progress[currentBattleBiomeKey] || 1;
    
    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (pixiCanvasRef.current && !pixiAppRef.current) {
            const app = new Application({
                view: pixiCanvasRef.current,
                width: canvasSize.width,
                height: canvasSize.height,
                backgroundColor: 0x000000, 
                backgroundAlpha: 0, 
                antialias: true,
                autoStart: false, 
            });
            pixiAppRef.current = app;
            visualEffectsManagerRef.current = new VisualEffectsManager(app.stage);
        } else if (pixiAppRef.current) {
            pixiAppRef.current.renderer.resize(canvasSize.width, canvasSize.height);
        }

        return () => {
            if (pixiAppRef.current && !pixiCanvasRef.current) {
                pixiAppRef.current?.destroy(false, { children: true, texture: true }); 
                pixiAppRef.current = null;
                visualEffectsManagerRef.current = null;
            }
        };
    }, [canvasSize]);


    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

  const setupLevel: () => void = useCallback(() => {
    hasEndedLevel.current = false;
    resetEntityIdCounter(); 
    killedEnemiesRef.current = {};
    const newHeroes: HeroEntity[] = [];
    const newEnemies: EnemyEntity[] = [];

    const equippedWeapon = playerData.inventory.equipped.weapon;
    let currentMainHeroClassKeyDetermined: keyof ClassDataMap = 'AVENTUREIRO';
    if (equippedWeapon && equippedWeapon.equipsToClass) {
        currentMainHeroClassKeyDetermined = equippedWeapon.equipsToClass;
    } else if (equippedWeapon) {
        const weaponTypeToClassKey: { [key: string]: keyof ClassDataMap | undefined } = {
            'bow': 'ARQUEIRO', 'sword': 'GUERREIRO', 'axe': 'GUERREIRO',
            'staff': 'MAGO', 'dagger': 'ASSASSINO', 'shield': 'GUARDIÃO'
        };
        currentMainHeroClassKeyDetermined = weaponTypeToClassKey[equippedWeapon.type] || 'AVENTUREIRO';
    }
    mainHeroClassKeyRef.current = currentMainHeroClassKeyDetermined;
    const mainHeroClassDefinition = ALL_CLASSES_DATA[currentMainHeroClassKeyDetermined];
    setMainHeroAbilities(mainHeroClassDefinition.abilities || []);
    
    const mainHeroClassData = classes[currentMainHeroClassKeyDetermined];
    const mainHeroInitialCombatStats = calculateFinalStatsForEntity(
        playerData.baseStats, 
        mainHeroClassData, 
        undefined, 
        1, 
        playerData.inventory.equipped 
    );
    newHeroes.push(new HeroEntity(
        canvasSize.width / 2, canvasSize.height - GRID_SIZE * 2, 
        mainHeroInitialCombatStats, true,
        playerData.baseStats, mainHeroClassData, playerData.inventory.equipped
    ));

    const availableAllyClassKeys = Object.keys(classes).filter(key => key !== currentMainHeroClassKeyDetermined && key !== 'AVENTUREIRO') as (keyof ClassDataMap)[];
    for (let i = 0; i < 2 && availableAllyClassKeys.length > 0; i++) {
        const allyClassKeyIndex = Math.floor(Math.random() * availableAllyClassKeys.length);
        const allyClassKey = availableAllyClassKeys.splice(allyClassKeyIndex, 1)[0];
        const allyClassData = classes[allyClassKey];
        const allyInitialCombatStats = calculateFinalStatsForEntity(
             { ...DEFAULT_PLAYER_DATA.baseStats }, 
             allyClassData, 
             undefined, 
             1, 
             undefined 
        ); 
        newHeroes.push(new HeroEntity(
            canvasSize.width / 2 + (i + 1) * GRID_SIZE * 1.5, canvasSize.height - GRID_SIZE * 2, 
            allyInitialCombatStats, false, 
            { ...DEFAULT_PLAYER_DATA.baseStats }, 
            allyClassData
        ));
    }
    
    const statScale = Math.pow(1.1, currentLevel - 1);
    const isBossLevel = currentLevel > 0 && currentLevel % 10 === 0;

    if (isBossLevel) {
        const bossTemplate = currentBiome.boss;
        const bossInitialStats = calculateFinalStatsForEntity(
            { ...defaultEmptyBaseStats, ...(bossTemplate.baseStats || {}) }, 
            undefined, 
            bossTemplate, 
            statScale
        );
        newEnemies.push(new EnemyEntity(canvasSize.width / 2, GRID_SIZE * 3, bossInitialStats, bossTemplate, statScale));
    } else {
        const numEnemies = Math.min(8, 3 + Math.floor(currentLevel / 2)); 
        for (let i = 0; i < numEnemies; i++) {
            const enemyTemplate = currentBiome.enemies[Math.floor(Math.random() * currentBiome.enemies.length)];
            const enemyInitialStats = calculateFinalStatsForEntity(
                { ...defaultEmptyBaseStats, ...(enemyTemplate.baseStats || {}) }, 
                undefined, 
                enemyTemplate, 
                statScale
            );
            const ex = 100 + Math.random() * (canvasSize.width - 200); 
            const ey = GRID_SIZE * 2 + Math.random() * (canvasSize.height * 0.4); 
            newEnemies.push(new EnemyEntity(ex, ey, enemyInitialStats, enemyTemplate, statScale));
        }
    }
    
    const newPlacementSlots: PlacementSlotType[] = [];
    let slotIdCounter = 0;
    for (let y = GRID_SIZE; y < canvasSize.height - GRID_SIZE; y += GRID_SIZE) {
        for (let x = GRID_SIZE / 2; x < canvasSize.width; x += GRID_SIZE) {
            newPlacementSlots.push({ id: `slot-${slotIdCounter++}`, x: x, y: y, occupied: false });
        }
    }
    
    newHeroes.forEach(hero => {
        let bestSlot: PlacementSlotType | null = null;
        let minDist = Infinity;
        for (const slot of newPlacementSlots) {
            if (!slot.occupied) {
                const dist = Math.hypot(hero.x - slot.x, hero.y - slot.y);
                if (dist < minDist) {
                    minDist = dist;
                    bestSlot = slot;
                }
            }
        }
        if (bestSlot) {
            hero.x = bestSlot.x;
            hero.y = bestSlot.y;
            bestSlot.occupied = true;
        }
    });
    initialHeroesRef.current = [...newHeroes];
    heroesRef.current = newHeroes;
    enemiesRef.current = newEnemies;
    placementSlotsRef.current = newPlacementSlots;

    const newSceneryElements: SceneryElement[] = [];

    rainParticlesRef.current = [];
    if (currentBattleBiomeKey === 'FLORESTA') {
        const numRaindrops = 200;
        for (let i = 0; i < numRaindrops; i++) {
            rainParticlesRef.current.push({
                x: Math.random() * canvasSize.width * 1.2 - canvasSize.width * 0.1,
                y: Math.random() * canvasSize.height,
                length: Math.random() * 15 + 5,
                speed: Math.random() * 5 + 3,
                opacity: Math.random() * 0.3 + 0.2
            });
        }
    }

    if (currentBattleBiomeKey === 'PANTANO') {
        const numRivers = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numRivers; i++) {
            const riverPath: {x: number, y: number}[] = [];
            const numPoints = 4 + Math.floor(Math.random() * 3);
            const yStart = Math.random() * canvasSize.height;
            riverPath.push({ x: -50, y: yStart });
            for(let p = 1; p < numPoints - 1; p++) {
                riverPath.push({
                    x: (canvasSize.width / (numPoints-1)) * p + (Math.random() - 0.5) * 100,
                    y: Math.random() * canvasSize.height
                });
            }
            const yEnd = Math.random() * canvasSize.height;
            riverPath.push({ x: canvasSize.width + 50, y: yEnd });
            newSceneryElements.push({ item: 'river', path: riverPath, width: 40 + Math.random() * 30 });
        }
    }

    const numSceneryObjects = 50; 
    const biomeSceneryTypes = (currentBiome as BiomeType).scenery; 
    const objectSceneryTypes = biomeSceneryTypes.filter(s => s !== 'river'); 

    if (objectSceneryTypes && objectSceneryTypes.length > 0) {
        for (let i = 0; i < numSceneryObjects; i++) {
            const itemTypeName = objectSceneryTypes[Math.floor(Math.random() * objectSceneryTypes.length)];
            const xPos = Math.random() * canvasSize.width;
            const yPos = Math.random() * canvasSize.height; 
            const itemAlpha = 1.0; 
            let itemSize: number;
            if (itemTypeName === 'rock') {
                itemSize = Math.random() * (GRID_SIZE*0.20 - GRID_SIZE*0.10) + GRID_SIZE*0.10;
            } else if (itemTypeName === 'flower') {
                itemSize = Math.random() * 15 + 10;
            } else if (itemTypeName === 'puddle') {
                itemSize = Math.random() * 30 + 20;
            } else { 
                itemSize = Math.random() * 25 + 30; 
            }
            const baseSceneryProps = { x: xPos, y: yPos, size: itemSize, alpha: itemAlpha, biomeName: currentBattleBiomeKey as keyof BiomeData };
            
            switch (itemTypeName) {
                case 'tree':
                    let cactusData: TreeSceneryElement['cactus'] = undefined;
                    if (currentBattleBiomeKey === 'DESERTO') {
                        const numArms = Math.random() > 0.3 ? (Math.random() > 0.5 ? 2 : 1) : 0;
                        cactusData = { numArms, arm1: numArms >= 1 ? { heightRatio: (0.4 + Math.random() * 0.2), yOffsetRatio: (0.2 + Math.random() * 0.2) } : undefined, arm2: numArms === 2 ? { heightRatio: (0.4 + Math.random() * 0.2), yOffsetRatio: (0.3 + Math.random() * 0.2) } : undefined };
                    }
                    newSceneryElements.push({ ...baseSceneryProps, item: 'tree', foliageWidthMultiplier: (1 + Math.random() * 0.1), cactus: cactusData });
                    break;
                case 'pine_tree':
                    newSceneryElements.push({ ...baseSceneryProps, item: 'pine_tree' });
                    break;
                case 'puddle':
                    const puddlePoints: { dx: number; dy: number }[] = [];
                    const numPuddlePoints = 6 + Math.floor(Math.random() * 4);
                    const angleStep = (Math.PI * 2) / numPuddlePoints;
                    const baseRadius = itemSize;
                    for (let j = 0; j < numPuddlePoints; j++) {
                        const randomRadius = baseRadius * (0.7 + Math.random() * 0.6);
                        puddlePoints.push({
                            dx: randomRadius * Math.cos(angleStep * j),
                            dy: randomRadius * Math.sin(angleStep * j) * 0.6, // more elliptical
                        });
                    }
                    newSceneryElements.push({ ...baseSceneryProps, item: 'puddle', points: puddlePoints });
                    break;
                case 'flower':
                    newSceneryElements.push({
                        ...baseSceneryProps,
                        item: 'flower',
                        flowerType: Math.random() > 0.5 ? 'pink' : 'white'
                    });
                    break;
                case 'rock': 
                    const rockPoints: { dx: number; dy: number }[] = [];
                    const numRockPoints = 5 + Math.floor(Math.random() * 3); 
                    const angleStepRock = (Math.PI * 2) / numRockPoints;
                    for (let j = 0; j < numRockPoints; j++) {
                        rockPoints.push({ dx: itemSize * (0.3 + Math.random() * 0.4) * Math.cos(angleStepRock * j + (Math.random() - 0.5) * 0.3 * angleStepRock), dy: itemSize * (0.3 + Math.random() * 0.4) * Math.sin(angleStepRock * j + (Math.random() - 0.5) * 0.3 * angleStepRock) * 0.7 });
                    }
                    newSceneryElements.push({ ...baseSceneryProps, item: 'rock', rockPoints });
                    break;
                default:
                     break;
            }
        }
    }
    sceneryElementsRef.current = newSceneryElements;
    projectilesRef.current = [];
    damageNumbersRef.current = [];
    effectsRef.current = [];
    setSelectedEntityForInfo(null);
    setInternalGameState(GameState.PLACEMENT);
    setMessage("Posicione seus heróis!");
    
    // Pre-render background
    backgroundCanvasRef.current = document.createElement('canvas');
    backgroundCanvasRef.current.width = canvasSize.width;
    backgroundCanvasRef.current.height = canvasSize.height;
    const bgCtx = backgroundCanvasRef.current.getContext('2d');
    if (bgCtx) {
        if (currentBattleBiomeKey === 'FLORESTA') {
            bgCtx.fillStyle = currentBiome.color; // #78B446
            bgCtx.fillRect(0, 0, canvasSize.width, canvasSize.height);
            bgCtx.fillStyle = 'rgba(0,0,0,0.07)';
            for (let i = 0; i < 35; i++) {
                bgCtx.beginPath();
                const patchSize = 80 + Math.random() * 250;
                bgCtx.ellipse(
                    Math.random() * canvasSize.width,
                    Math.random() * canvasSize.height,
                    patchSize,
                    patchSize * (0.5 + Math.random() * 0.5),
                    Math.random() * Math.PI, 0, Math.PI * 2
                );
                bgCtx.fill();
            }
        } else {
            bgCtx.fillStyle = currentBiome.color;
            bgCtx.fillRect(0, 0, canvasSize.width, canvasSize.height);
        }
    }
  }, [playerData, classes, biomes, currentBattleBiomeKey, currentLevel, ALL_CLASSES_DATA, canvasSize]); 

  useEffect(() => { setupLevel(); }, [setupLevel]); 

    const executeAbility = useCallback((hero: HeroEntity, abilityId: string) => {
        if (internalGameState !== GameState.BATTLE || !hero.isAlive) return;
    
        const ability = hero.abilities.find(ab => ab.id === abilityId);
        if (!ability || (hero.abilityCooldowns[abilityId] || 0) > 0) return;
    
        setMessage(`${hero.combatStats.name}: ${ability.name} ativado!`);
        
        const heroes = heroesRef.current;
        const enemies = enemiesRef.current;
        const vfxManager = visualEffectsManagerRef.current;
        
        let didHealForForcaExtrema = false;
        const projectilesToSet: Projectile[] = [];
        const damageNumbersToSet: DamageNumber[] = [];
        const effectsToSet: DeathEffect[] = [];
    
        // This switch is now generic for any hero
        switch (ability.id) {
            case 'GUERREIRO_INTERCEPTAR': {
                const livingEnemies = enemies.filter(e => e.isAlive);
                if (livingEnemies.length === 0) {
                    setMessage("Nenhum alvo para Interceptar!");
                    return; // Return early, don't put on cooldown
                }
                livingEnemies.sort((a, b) => distanceToTarget(hero, a) - distanceToTarget(hero, b));
                const nearestEnemy = livingEnemies[0];
    
                hero.applyBuff({
                    id: ability.id,
                    abilityId: ability.id,
                    name: 'Interceptando',
                    icon: ability.icon,
                    durationMs: ability.durationMs || 2000,
                    remainingMs: ability.durationMs || 2000,
                    effects: {
                        dashToTarget: {
                            targetId: nearestEnemy.id,
                            speedMultiplier: ability.properties?.speedMultiplier,
                            onHitEffect: ability.properties?.onHitEffect,
                        }
                    },
                    appliedAt: Date.now(),
                    isBuff: true,
                    sourceEntityId: hero.id,
                    targetEntityId: hero.id
                });
                vfxManager?.showInterceptarTrail(hero, ability.durationMs || 2000);
                break;
            }
            case 'AVENTUREIRO_SOCO_SERIO':
                if (hero.target && hero.target.isAlive) {
                    const target = hero.target;
                    if (distanceToTarget(hero, target) <= hero.range * 1.2) {
                        hero.attackAnimProgress = 1;
                        const damageFromHp = target.maxHp * (ability.properties?.bonusDamagePercentTargetMaxHp / 100 || 0);
                        const abilityDamage = hero.effectiveDamage + damageFromHp;
                        let isCrit = hero.combatStats.chanceCritica && Math.random() * 100 < hero.combatStats.chanceCritica;
                        let finalDamage = isCrit ? Math.round(abilityDamage * (1 + (hero.combatStats.danoCritico || 50) / 100)) : Math.round(abilityDamage);
                        finalDamage = Math.max(1, finalDamage);
                        const dmgTaken = target.takeDamage(finalDamage, isCrit, hero);
                        if (target instanceof EnemyEntity && !target.isAgro) { target.isAgro = true; target.agroAllies(enemies); }
                        if (typeof dmgTaken === 'number') damageNumbersToSet.push(new DamageNumber(dmgTaken, target.x, target.y, isCrit ? 'orange' : 'white'));
                        else if (dmgTaken === 'esquiva') damageNumbersToSet.push(new DamageNumber("Esquiva!", target.x, target.y, 'white'));
                        else if (dmgTaken === 'bloqueado') damageNumbersToSet.push(new DamageNumber("Bloqueado!", target.x, target.y, 'cyan'));
                        if (target.currentHp <= 0 && !target.deathEffectCreated) { effectsToSet.push(new DeathEffect(target.x, target.y, '#757575', 15, 30)); target.deathEffectCreated = true; }
                        vfxManager?.showSocoSerioHit(target.x, target.y);
                    } else { setMessage("Alvo fora de alcance!"); return; }
                } else { setMessage("Nenhum alvo para o Soco Sério!"); return; }
                break;
            case 'MAGO_BOLA_DE_FOGO':
                if (hero.target && hero.target.isAlive) {
                    if (distanceToTarget(hero, hero.target) <= hero.range * 1.2) {
                        projectilesToSet.push(new Projectile(hero.x, hero.y, hero, hero.target, hero.effectiveDamage, false, {
                            color: '#FF4500', size: 10, debuffToApply: ability.properties?.debuff, sourceAbilityProperties: ability.properties, trailType: 'fire',
                        }));
                    } else { setMessage("Alvo fora de alcance!"); return; }
                } else { setMessage("Nenhum alvo para a Bola de Fogo!"); return; }
                break;
            case 'MAGO_EXPLOSAO_MAGICA':
                hero.applyBuff({ id: ability.id, abilityId: ability.id, name: ability.name, icon: ability.icon, durationMs: ability.durationMs || 5000, remainingMs: ability.durationMs || 5000, effects: { nextAttackCrit: true, nextAttackSplash: ability.properties?.nextAttackSplash }, appliedAt: Date.now(), isBuff: true, targetEntityId: hero.id, sourceEntityId: hero.id });
                vfxManager?.showExplosaoMagicaReady(hero);
                break;
            case 'MAGO_INTELECTO_SURREAL':
                heroes.forEach(ally => {
                    if (ally.isAlive) {
                        ally.applyBuff({ id: `${ability.id}_${ally.id}`, abilityId: ability.id, name: ability.name, icon: ability.icon, durationMs: ability.durationMs || 15000, remainingMs: ability.durationMs || 15000, effects: { danoCriticoPercent: ability.properties?.danoCriticoPercent, letalidadePercent: ability.properties?.letalidadePercent }, appliedAt: Date.now(), isBuff: true, sourceEntityId: hero.id, targetEntityId: ally.id });
                    }
                });
                vfxManager?.showIntelectoSurreal(heroes);
                break;
            case 'MAGO_EXPLOSAO_GELIDA':
                const targetForGelida = hero.target && hero.target.isAlive ? hero.target : enemies.filter(e => e.isAlive).sort((a, b) => distanceToTarget(hero, a) - distanceToTarget(hero, b))[0];
                if (targetForGelida) {
                    const radius = ability.properties?.radius || 120;
                    const gelidaDamage = hero.effectiveDamage + (hero.combatStats.letalidade * (ability.properties?.damageLethalityMultiplier || 2.0));
                    vfxManager?.showExplosaoGelida(targetForGelida.x, targetForGelida.y, radius);
                    enemies.forEach(enemy => {
                        if (enemy.isAlive && distanceToTarget(targetForGelida, enemy) <= radius) {
                            const dmgTaken = enemy.takeDamage(gelidaDamage, false, hero);
                            hero.afterDealingDamage(enemy, enemies);
                            if (typeof dmgTaken === 'number') damageNumbersToSet.push(new DamageNumber(dmgTaken, enemy.x, enemy.y, 'white'));
                            if (enemy.currentHp <= 0 && !enemy.deathEffectCreated) { effectsToSet.push(new DeathEffect(enemy.x, enemy.y, enemy.isBoss ? '#C62828' : '#757575', enemy.isBoss ? 35 : 15, enemy.isBoss ? 60 : 30)); enemy.deathEffectCreated = true; }
                            if (ability.properties?.debuff) {
                                const debuff = ability.properties.debuff;
                                enemy.applyDebuff({ id: `${debuff.id}_${enemy.id}`, abilityId: debuff.id, name: debuff.name, icon: debuff.icon, durationMs: debuff.durationMs, remainingMs: debuff.durationMs, effects: debuff.effects, appliedAt: Date.now(), isBuff: false, sourceEntityId: hero.id, targetEntityId: enemy.id });
                            }
                        }
                    });
                } else { setMessage("Nenhum alvo para Explosão Gélida!"); return; }
                break;
            case 'ARQUEIRO_DISPARO_PRECISO':
                if (hero.target && hero.target.isAlive) {
                    if (distanceToTarget(hero, hero.target) <= hero.range * 1.2) {
                        const projectileDamage = hero.effectiveDamage + (hero.combatStats.letalidade * (ability.properties?.damageLethalityMultiplier || 1.0));
                        projectilesToSet.push(new Projectile(hero.x, hero.y, hero, hero.target, projectileDamage, false, {
                            color: '#A5D6A7', size: 8, debuffToApply: ability.properties?.debuff, displayType: 'arrow', trailType: 'glitter'
                        }));
                        const multiShotBuff = hero.activeBuffs.find(b => b.effects.multiShot);
                        if (multiShotBuff?.effects.multiShot) {
                            const additionalTargets = getMultiShotTargets(hero, hero.target, enemies, multiShotBuff.effects.multiShot.count);
                            for (const additionalTarget of additionalTargets) {
                                projectilesToSet.push(new Projectile(hero.x, hero.y, hero, additionalTarget, projectileDamage, false, {
                                    color: '#A5D6A7', size: 8, debuffToApply: ability.properties?.debuff, displayType: 'arrow', trailType: 'glitter'
                                }));
                            }
                        }
                    } else { setMessage("Alvo fora de alcance!"); return; }
                } else { setMessage("Nenhum alvo para o Disparo Preciso!"); return; }
                break;
            case 'ARQUEIRO_TIRO_MORTAL':
                const debuffIdToConsume = ability.properties?.consumesDebuffId;
                enemies.forEach(enemy => {
                    const debuffInstance = enemy.activeDebuffs.find(d => d.abilityId === debuffIdToConsume);
                    if (enemy.isAlive && debuffInstance) {
                        const stacks = debuffInstance.stacks || 1;
                        const missingHp = enemy.maxHp - enemy.currentHp;
                        const damageFromStacks = (hero.effectiveDamage * (ability.properties?.damagePerStackMultiplier || 0.5)) * stacks;
                        const damageFromMissingHp = missingHp * ((ability.properties?.damagePercentMissingHp || 0) / 100);
                        const totalMortalDamage = damageFromStacks + damageFromMissingHp;
                        const dmgTaken = enemy.takeDamage(totalMortalDamage, true, hero);
                        hero.afterDealingDamage(enemy, enemies);
                        if (typeof dmgTaken === 'number') damageNumbersToSet.push(new DamageNumber(dmgTaken, enemy.x, enemy.y, 'orange'));
                        if (enemy.currentHp <= 0 && !enemy.deathEffectCreated) { effectsToSet.push(new DeathEffect(enemy.x, enemy.y, enemy.isBoss ? '#C62828' : '#757575', enemy.isBoss ? 35 : 15, enemy.isBoss ? 60 : 30)); enemy.deathEffectCreated = true; }
                        enemy.removeDebuff(debuffIdToConsume);
                        vfxManager?.showTiroMortalHit(enemy);
                    }
                });
                break;
            case 'ARQUEIRO_DISPARO_MULTIPLO': {
                const coneAngleDeg = ability.properties?.coneAngle || 60;
                const coneAngleRad = coneAngleDeg * (Math.PI / 180);
                const heroDirectionRad = hero.target ? Math.atan2(hero.target.y - hero.y, hero.target.x - hero.x) : (hero.x > canvasSize.width / 2 ? Math.PI : 0);
                const projectileDamage = hero.effectiveDamage + (hero.combatStats.letalidade * (ability.properties?.damageLethalityMultiplier || 1.0));
                const numProjectiles = ability.properties?.numProjectiles || 5;
                const isPiercing = ability.properties?.piercing === true;
                const angleStep = coneAngleRad / (numProjectiles > 1 ? numProjectiles - 1 : 1);
                const startAngle = heroDirectionRad - coneAngleRad / 2;
                for (let i = 0; i < numProjectiles; i++) {
                    const angle = numProjectiles === 1 ? heroDirectionRad : startAngle + i * angleStep;
                    const dummyTargetX = hero.x + Math.cos(angle) * 5000;
                    const dummyTargetY = hero.y + Math.sin(angle) * 5000;
                    const proj = new Projectile(hero.x, hero.y, hero, { x: dummyTargetX, y: dummyTargetY } as CombatCapable, projectileDamage, false, {
                        color: '#A5D6A7', size: 8, displayType: 'arrow', trailType: 'glitter', piercing: isPiercing, lifetimeMs: 1500
                    });
                    projectilesToSet.push(proj);
                }
                break;
            }
            case 'ARQUEIRO_HABILIDADE_E_PRECISAO':
                hero.applyBuff({ id: ability.id, abilityId: ability.id, name: ability.name, icon: ability.icon, durationMs: ability.durationMs || 5000, remainingMs: ability.durationMs || 5000, effects: { rangePercent: ability.properties?.rangePercent, velocidadeAtaquePercent: ability.properties?.velocidadeAtaquePercent, multiShot: ability.properties?.multiShot, }, appliedAt: Date.now(), isBuff: true, sourceEntityId: hero.id, targetEntityId: hero.id });
                vfxManager?.showHabilidadeEPrecisao(hero, ability.durationMs || 5000);
                break;
            case 'GUARDIÃO_GOLPE_DE_ESCUDO':
                if (hero.target && hero.target.isAlive) {
                    if (distanceToTarget(hero, hero.target) <= hero.range * 1.2) {
                        const shieldBashDamage = hero.effectiveDamage + (hero.maxHp * (ability.properties?.bonusDamagePercentCasterMaxHp / 100 || 0));
                        let isCrit = hero.combatStats.chanceCritica && Math.random() * 100 < hero.combatStats.chanceCritica;
                        let finalDamage = isCrit ? Math.round(shieldBashDamage * (1 + (hero.combatStats.danoCritico || 50) / 100)) : Math.round(shieldBashDamage);
                        const dmgTaken = hero.target.takeDamage(finalDamage, isCrit, hero);
                        hero.afterDealingDamage(hero.target, enemies);
                        if (typeof dmgTaken === 'number') damageNumbersToSet.push(new DamageNumber(dmgTaken, hero.target.x, hero.target.y, isCrit ? 'orange' : 'white'));
                        if (hero.target.currentHp <= 0 && !hero.target.deathEffectCreated) { effectsToSet.push(new DeathEffect(hero.target.x, hero.target.y, hero.target.isBoss ? '#C62828' : '#757575', hero.target.isBoss ? 35 : 15, hero.target.isBoss ? 60 : 30)); hero.target.deathEffectCreated = true; }
                        const stunDuration = ability.properties?.stunDurationMs || 2000;
                        hero.target.applyDebuff({ id: `stun_${hero.target.id}`, abilityId: ability.id, name: 'Atordoado', icon: '💫', durationMs: stunDuration, remainingMs: stunDuration, effects: { isImmobile: true }, appliedAt: Date.now(), isBuff: false, sourceEntityId: hero.id, targetEntityId: hero.target.id });
                        vfxManager?.showShieldBashImpact(hero.target.x, hero.target.y);
                        vfxManager?.showStunEffect(hero.target, stunDuration);
                    } else { setMessage("Alvo fora de alcance!"); return; }
                } else { setMessage("Nenhum alvo para o Golpe de Escudo!"); return; }
                break;
            case 'GUARDIÃO_PROVOCAR':
                const tauntRadius = ability.properties?.radius || 150;
                vfxManager?.showTaunt(hero, tauntRadius);
                enemies.forEach(enemy => {
                    if (enemy.isAlive && distanceToTarget(hero, enemy) <= tauntRadius) {
                        enemy.applyDebuff({ id: `taunt_${enemy.id}`, abilityId: ability.id, name: 'Provocado', icon: '🤬', durationMs: ability.durationMs || 4000, remainingMs: ability.durationMs || 4000, effects: { isTaunted: true }, appliedAt: Date.now(), isBuff: false, sourceEntityId: hero.id, targetEntityId: enemy.id });
                    }
                });
                hero.applyBuff({ id: ability.id, abilityId: ability.id, name: ability.name, icon: ability.icon, durationMs: ability.durationMs || 4000, remainingMs: ability.durationMs || 4000, effects: { resistenciaFlat: ability.properties?.resistanceBonusFlat || 50 }, appliedAt: Date.now(), isBuff: true, sourceEntityId: hero.id, targetEntityId: hero.id });
                break;
            case 'GUARDIÃO_FORCA_DE_BLOQUEIO':
                hero.applyBuff({ id: ability.id, abilityId: ability.id, name: ability.name, icon: ability.icon, durationMs: ability.durationMs || 15000, remainingMs: ability.durationMs || 15000, effects: { blockCharges: ability.properties?.blockCharges || 2 }, appliedAt: Date.now(), isBuff: true, sourceEntityId: hero.id, targetEntityId: hero.id });
                break;
            case 'GUARDIÃO_PROTEÇÃO_COMPARTILHADA':
                const shieldAmount = hero.maxHp * ((ability.properties?.shieldHpPercentOfCasterMaxHp || 0) / 100);
                heroes.forEach(ally => {
                    if (ally.isAlive) {
                        ally.applyShield(shieldAmount);
                    }
                });
                hero.shieldingGranted += shieldAmount * heroes.filter(h => h.isAlive).length;
                if (hero.currentHp / hero.maxHp > ((ability.properties?.healthThresholdPercent || 0) / 100 || 0.7)) {
                    hero.applyBuff({ id: `${ability.id}_vigor`, abilityId: ability.id, name: 'Vigor Extra', icon: '❤️‍🔥', durationMs: ability.properties?.buffDurationMs || 6000, remainingMs: ability.properties?.buffDurationMs || 6000, effects: { vigorPercent: ability.properties?.conditionalVigorBonusPercent || 50 }, appliedAt: Date.now(), isBuff: true, sourceEntityId: hero.id, targetEntityId: hero.id });
                }
                vfxManager?.showProtecaoCompartilhada(heroes);
                break;
            case 'ASSASSINO_MODO_OCULTO':
                hero.applyBuff({ id: ability.id, abilityId: ability.id, name: ability.name, icon: ability.icon, durationMs: ability.durationMs || 4000, remainingMs: ability.durationMs || 4000, effects: { isInvisible: true }, appliedAt: Date.now(), sourceEntityId: hero.id, targetEntityId: hero.id, isBuff: true });
                vfxManager?.showModoOcultoSmoke(hero);
                break;
            case 'ASSASSINO_GOLPE_DUPLO': {
                if (!hero.target || !hero.target.isAlive) { setMessage("Nenhum alvo para o Golpe Duplo!"); return; }
                if (distanceToTarget(hero, hero.target) > hero.range * 1.2) { setMessage("Alvo fora de alcance!"); return; }
                const target = hero.target;
                const abilityDamage = hero.effectiveDamage + (hero.combatStats.letalidade * (ability.properties?.damageLethalityMultiplier || 1.5));
                const isStealthed = hero.activeBuffs.some(b => b.effects.isInvisible);
                const isCrit = !!(ability.properties?.critFromStealth && isStealthed);
                const applyHit = (): UpdateResult[] => {
                    const results: UpdateResult[] = [];
                    if (!target.isAlive) return results;
                    let finalDamage = isCrit ? Math.round(abilityDamage * (1 + (hero.combatStats.danoCritico || 50) / 100)) : Math.round(abilityDamage);
                    finalDamage = Math.max(1, finalDamage);
                    const dmgTaken = target.takeDamage(finalDamage, isCrit, hero);
                    hero.afterDealingDamage(target, enemies);
                    vfxManager?.showSocoSerioHit(target.x, target.y);
                    let dmgNum: DamageNumber | undefined, effect: DeathEffect | undefined;
                    if (typeof dmgTaken === 'number') dmgNum = new DamageNumber(dmgTaken, target.x, target.y, isCrit ? 'orange' : 'white');
                    else if (dmgTaken === 'esquiva') dmgNum = new DamageNumber("Esquiva!", target.x, target.y, 'white');
                    else if (dmgTaken === 'bloqueado') dmgNum = new DamageNumber("Bloqueado!", target.x, target.y, 'cyan');
                    if (dmgNum) results.push({ newDamageNumber: dmgNum });
                    if (target.currentHp <= 0 && !target.deathEffectCreated) { effect = new DeathEffect(target.x, target.y, target.isBoss ? '#C62828' : '#757575', target.isBoss ? 35 : 15, target.isBoss ? 60 : 30); target.deathEffectCreated = true; results.push({ newEffect: effect }); }
                    return results;
                };
                hero.attackAnimProgress = 1;
                const firstHitResults = applyHit();
                firstHitResults.forEach(r => { if (r.newDamageNumber) damageNumbersToSet.push(r.newDamageNumber); if (r.newEffect) effectsToSet.push(r.newEffect); });
                delayedActionsRef.current.push({
                    executeAt: lastFrameTimeRef.current + (ability.properties?.hitIntervalMs || 200),
                    action: () => { if (hero?.isAlive) hero.attackAnimProgress = 1; return applyHit(); }
                });
                break;
            }
            case 'ASSASSINO_APUNHALAR': {
                const livingEnemies = enemies.filter(e => e.isAlive);
                if (livingEnemies.length === 0) { setMessage("Nenhum alvo disponível!"); return; }
                const currentTarget = hero.target; let finalTarget: CombatCapable | null = null;
                if (currentTarget && currentTarget.isAlive) { const otherEnemies = livingEnemies.filter(e => e.id !== currentTarget.id); if (otherEnemies.length > 0) { otherEnemies.sort((a, b) => distanceToTarget(hero, a) - distanceToTarget(hero, b)); finalTarget = otherEnemies[0]; } else { finalTarget = currentTarget; } }
                else { livingEnemies.sort((a, b) => distanceToTarget(hero, a) - distanceToTarget(hero, b)); finalTarget = livingEnemies[0]; }
                if (finalTarget) {
                    const startX = hero.x; const startY = hero.y; const vecX = startX - finalTarget.x; const vecY = startY - finalTarget.y; const len = Math.hypot(vecX, vecY) || 1; const normX = vecX / len; const normY = vecY / len; hero.x = finalTarget.x + normX * (finalTarget.size * 0.8); hero.y = finalTarget.y + normY * (finalTarget.size * 0.8);
                    vfxManager?.showApunhalarTeleport(startX, startY, hero.x, hero.y);
                    const abilityDamage = hero.effectiveDamage + (hero.combatStats.letalidade * (ability.properties?.damageLethalityMultiplier || 2.0));
                    const isStealthed = hero.activeBuffs.some(b => b.effects.isInvisible); const isCrit = !!(ability.properties?.critFromStealth && isStealthed);
                    let finalDamage = isCrit ? Math.round(abilityDamage * (1 + (hero.combatStats.danoCritico || 50) / 100)) : Math.round(abilityDamage); finalDamage = Math.max(1, finalDamage);
                    const dmgTaken = finalTarget.takeDamage(finalDamage, isCrit, hero); hero.afterDealingDamage(finalTarget, enemies);
                    let dmgNum: DamageNumber | undefined, effect: DeathEffect | undefined;
                    if (typeof dmgTaken === 'number') dmgNum = new DamageNumber(dmgTaken, finalTarget.x, finalTarget.y, isCrit ? 'orange' : 'white');
                    else if (dmgTaken === 'esquiva') dmgNum = new DamageNumber("Esquiva!", finalTarget.x, finalTarget.y, 'white');
                    else if (dmgTaken === 'bloqueado') dmgNum = new DamageNumber("Bloqueado!", finalTarget.x, finalTarget.y, 'cyan');
                    if (dmgNum) damageNumbersToSet.push(dmgNum);
                    if (finalTarget.currentHp <= 0 && !finalTarget.deathEffectCreated) { effect = new DeathEffect(finalTarget.x, finalTarget.y, finalTarget.isBoss ? '#C62828' : '#757575', finalTarget.isBoss ? 35 : 15, finalTarget.isBoss ? 60 : 30); finalTarget.deathEffectCreated = true; effectsToSet.push(effect); }
                    const debuffTemplate = ability.properties?.debuff;
                    if (debuffTemplate) { finalTarget.applyDebuff({ id: `${debuffTemplate.id}_${finalTarget.id}`, abilityId: debuffTemplate.id, name: debuffTemplate.name, icon: debuffTemplate.icon, durationMs: debuffTemplate.durationMs, remainingMs: debuffTemplate.durationMs, effects: { ...debuffTemplate.effects }, appliedAt: Date.now(), isBuff: false, sourceEntityId: hero.id, targetEntityId: finalTarget.id, }); vfxManager?.showPontosVitaisDebuff(finalTarget, debuffTemplate.durationMs); }
                } else { setMessage("Nenhum alvo para Apunhalar!"); return; }
                break;
            }
            case 'ASSASSINO_AGILIDADE_EXTREMA': {
                const isStealthed = hero.activeBuffs.some(b => b.effects.isInvisible);
                const multiplier = isStealthed ? (ability.properties?.stealthBonusMultiplier || 2) : 1;
                const buffEffects: ActiveBuffDebuffEffect = { chanceEsquivaPercent: (ability.properties?.chanceEsquivaPercent || 0) * multiplier, velocidadeAtaquePercent: (ability.properties?.velocidadeAtaquePercent || 0) * multiplier, velocidadeMovimentoPercent: (ability.properties?.velocidadeMovimentoPercent || 0) * multiplier, };
                hero.applyBuff({ id: ability.id, abilityId: ability.id, name: ability.name, icon: ability.icon, durationMs: ability.durationMs || 5000, remainingMs: ability.durationMs || 5000, effects: buffEffects, appliedAt: Date.now(), sourceEntityId: hero.id, targetEntityId: hero.id, isBuff: true });
                vfxManager?.showAgilidadeExtrema(hero, ability.durationMs || 5000);
                break;
            }
        }
    
        if (projectilesToSet.length > 0) projectilesRef.current.push(...projectilesToSet);
        if (damageNumbersToSet.length > 0) damageNumbersRef.current.push(...damageNumbersToSet);
        if (effectsToSet.length > 0) effectsRef.current.push(...effectsToSet);
        
        hero.abilityCooldowns[abilityId] = ability.cooldownMs;
    
    }, [internalGameState, canvasSize]);

    const handleActivateAbility = useCallback((abilityId: string) => {
        const mainHero = heroesRef.current.find(h => h.isPlayer);
        if (mainHero) {
            executeAbility(mainHero, abilityId);
        }
    }, [executeAbility]);

    const generateCombatReport = (finalHeroes: HeroEntity[], finalKills: EnemyKillCount): CombatReportData => {
        const report: CombatReportData = { heroStats: {}, enemiesKilled: finalKills };
        initialHeroesRef.current.forEach(initialHero => {
            const finalHeroState = finalHeroes.find(fh => fh.id === initialHero.id) || initialHero;
            report.heroStats[initialHero.combatStats.name] = {
                heroName: initialHero.combatStats.name,
                isDead: !finalHeroState.isAlive,
                damageDealt: finalHeroState.damageDealt,
                healingDone: finalHeroState.healingDone,
                shieldingGranted: finalHeroState.shieldingGranted,
                damageTaken: finalHeroState.damageTaken,
            };
        });
        return report;
    };
    
    const handleDragStart = useCallback((x: number, y: number) => {
        if (internalGameState !== GameState.PLACEMENT) return;
        const clickedHero = heroesRef.current.find(hero => Math.hypot(x - hero.x, y - hero.y) < hero.size / 2);
        if (clickedHero) {
            draggedHeroRef.current = { hero: clickedHero, originalX: clickedHero.x, originalY: clickedHero.y };
            setSelectedEntityForInfo(null);
        } else {
            const clickedEntity = [...heroesRef.current, ...enemiesRef.current].find(entity => Math.hypot(x - entity.x, y - entity.y) < entity.size / 2);
            setSelectedEntityForInfo(clickedEntity || null);
        }
    }, [internalGameState]);
    
    const handleDragMove = useCallback((x: number, y: number) => {
        if (draggedHeroRef.current) {
            draggedHeroRef.current.hero.x = x;
            draggedHeroRef.current.hero.y = y;
        }
    }, []);

    const handleDragEnd = useCallback((x: number, y: number) => {
        const draggedHero = draggedHeroRef.current;
        if (!draggedHero) return;
        
        const moveDistance = Math.hypot(x - draggedHero.originalX, y - draggedHero.originalY);
        if (moveDistance < 5) {
            setSelectedEntityForInfo(draggedHero.hero);
            draggedHero.hero.x = draggedHero.originalX;
            draggedHero.hero.y = draggedHero.originalY;
            draggedHeroRef.current = null;
            return;
        }

        const validSlots = placementSlotsRef.current.filter(slot => !slot.occupied && enemiesRef.current.every(enemy => Math.hypot(slot.x - enemy.x, slot.y - enemy.y) > MIN_PLACEMENT_DIST_TO_ENEMY));
        let bestSlot: PlacementSlotType | null = null;
        for (const slot of validSlots) {
            if (Math.hypot(x - slot.x, y - slot.y) < GRID_SIZE) {
                bestSlot = slot;
                break;
            }
        }

        const oldSlot = placementSlotsRef.current.find(s => s.x === draggedHero.originalX && s.y === draggedHero.originalY);
        if (bestSlot && oldSlot && bestSlot.id !== oldSlot.id) {
            oldSlot.occupied = false;
            bestSlot.occupied = true;
            draggedHero.hero.x = bestSlot.x;
            draggedHero.hero.y = bestSlot.y;
        } else {
            draggedHero.hero.x = draggedHero.originalX;
            draggedHero.hero.y = draggedHero.originalY;
        }
        draggedHeroRef.current = null;
    }, []);

    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvasSize.width / rect.width);
        const y = (event.clientY - rect.top) * (canvasSize.height / rect.height);
        handleDragStart(x, y);
    };
    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!draggedHeroRef.current) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvasSize.width / rect.width);
        const y = (event.clientY - rect.top) * (canvasSize.height / rect.height);
        handleDragMove(x, y);
    };
    const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!draggedHeroRef.current) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvasSize.width / rect.width);
        const y = (event.clientY - rect.top) * (canvasSize.height / rect.height);
        handleDragEnd(x, y);
    };
    const getTouchCoords = (event: React.TouchEvent<HTMLCanvasElement>): Point => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const touch = event.touches[0] || event.changedTouches[0];
        return { x: (touch.clientX - rect.left) * (canvasSize.width / rect.width), y: (touch.clientY - rect.top) * (canvasSize.height / rect.height) };
    };
    const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => { const { x, y } = getTouchCoords(event); handleDragStart(x, y); };
    const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => { if (!draggedHeroRef.current) return; event.preventDefault(); const { x, y } = getTouchCoords(event); handleDragMove(x, y); };
    const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => { if (!draggedHeroRef.current) return; const { x, y } = getTouchCoords(event); handleDragEnd(x, y); };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle hotkeys during the BATTLE state
      if (internalGameState !== GameState.BATTLE) return;

      const hotkeyIndex = ['1', '2', '3', '4'].indexOf(event.key);

      if (hotkeyIndex !== -1) {
        // Prevent default browser behavior for number keys (e.g., searching)
        event.preventDefault();
        
        const abilityToActivate = mainHeroAbilities[hotkeyIndex];
        if (abilityToActivate) {
          handleActivateAbility(abilityToActivate.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [internalGameState, mainHeroAbilities, handleActivateAbility]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const pixiApp = pixiAppRef.current;
    if (!ctx || !pixiApp) return;

    const gameLoop = (time: number) => {
        if (lastFrameTimeRef.current === 0) {
            lastFrameTimeRef.current = time;
            animationFrameId.current = requestAnimationFrame(gameLoop);
            return;
        }
        const deltaTime = time - lastFrameTimeRef.current;
        lastFrameTimeRef.current = time;

        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        if (backgroundCanvasRef.current) {
            ctx.drawImage(backgroundCanvasRef.current, 0, 0);
        } else {
            ctx.fillStyle = currentBiome.color;
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
        }

        if (currentBattleBiomeKey === 'FLORESTA') {
            ctx.strokeStyle = 'rgba(173, 216, 230, 0.5)';
            ctx.lineWidth = 1.5;
            rainParticlesRef.current.forEach(p => {
                p.y += p.speed;
                p.x += p.speed * 0.2; 
                if (p.y > canvasSize.height) {
                    p.y = -p.length;
                    p.x = Math.random() * canvasSize.width * 1.2 - canvasSize.width * 0.1;
                }
                ctx.globalAlpha = p.opacity;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.length * 0.2, p.y + p.length);
                ctx.stroke();
            });
            ctx.globalAlpha = 1.0; 
        }

        sceneryElementsRef.current.sort((a, b) => {
            const aIsGround = a.item === 'river' || a.item === 'puddle';
            const bIsGround = b.item === 'river' || b.item === 'puddle';
            if (aIsGround && !bIsGround) return -1;
            if (bIsGround && !aIsGround) return 1;
            // @ts-ignore
            return a.y - b.y;
        }).forEach(scenery => {
                if (scenery.item === 'tree') drawTree(ctx, scenery as TreeSceneryElement);
                else if (scenery.item === 'pine_tree') drawPineTree(ctx, scenery as PineTreeSceneryElement);
                else if (scenery.item === 'rock') drawRock(ctx, scenery as RockSceneryElement);
                else if (scenery.item === 'river') drawRiver(ctx, scenery as RiverSceneryElement);
                else if (scenery.item === 'puddle') drawPuddle(ctx, scenery as PuddleSceneryElement);
                else if (scenery.item === 'flower') drawFlower(ctx, scenery as FlowerSceneryElement);
            });

        if (internalGameState === GameState.PLACEMENT) {
            const validPlacementSlots = placementSlotsRef.current.filter(slot => enemiesRef.current.every(enemy => Math.hypot(slot.x - enemy.x, slot.y - enemy.y) > MIN_PLACEMENT_DIST_TO_ENEMY));
            validPlacementSlots.forEach(slot => {
                ctx.fillStyle = slot.occupied ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)';
                ctx.beginPath();
                ctx.arc(slot.x, slot.y, GRID_SIZE / 2 - 5, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        
        const heroes = heroesRef.current;
        const enemies = enemiesRef.current;
        const allEntities = [...heroes, ...enemies].sort((a, b) => a.y - b.y);
        
        const updatePack: { newProjectiles: Projectile[], newDamageNumbers: DamageNumber[], newEffects: DeathEffect[] } = { 
            newProjectiles: [], 
            newDamageNumbers: [], 
            newEffects: [] 
        };

        if (internalGameState === GameState.BATTLE) {
            allEntities.forEach(entity => {
                const { results, abilityToTrigger } = entity.update(deltaTime, heroes, enemies, canvasSize);
                
                if (entity instanceof HeroEntity && abilityToTrigger) {
                    executeAbility(entity, abilityToTrigger);
                }

                if (results.length > 0) {
                    results.forEach(result => {
                        if (result.newProjectile) updatePack.newProjectiles.push(result.newProjectile);
                        if (result.newDamageNumber) updatePack.newDamageNumbers.push(result.newDamageNumber);
                        if (result.newEffect) updatePack.newEffects.push(result.newEffect);
                        if (result.lifeStolen) updatePack.newDamageNumbers.push(new DamageNumber(`+${result.lifeStolen}`, entity.x, entity.y - 10, 'green'));
                    });
                }
            });

            const mainHero = heroesRef.current.find(h => h.isPlayer);
            if (mainHero) {
                setMainHeroAbilityCooldowns({ ...mainHero.abilityCooldowns });
            }

            // Process delayed actions
            const now = time;
            const actionsToExecute = delayedActionsRef.current.filter(a => now >= a.executeAt);
            if (actionsToExecute.length > 0) {
                delayedActionsRef.current = delayedActionsRef.current.filter(a => now < a.executeAt);
                actionsToExecute.forEach(actionContainer => {
                    const results = actionContainer.action();
                    results.forEach(result => {
                        if (result.newProjectile) updatePack.newProjectiles.push(result.newProjectile);
                        if (result.newDamageNumber) updatePack.newDamageNumbers.push(result.newDamageNumber);
                        if (result.newEffect) updatePack.newEffects.push(result.newEffect);
                    });
                });
            }
        }
        
        const remainingProjectiles: Projectile[] = [];
        projectilesRef.current.forEach(p => {
            const potentialTargets = (p.attacker as Character)._entityType === 'hero' ? enemies : heroes;
            const res = p.update(deltaTime, potentialTargets, visualEffectsManagerRef.current);
            if (res.newDamageNumbers) updatePack.newDamageNumbers.push(...res.newDamageNumbers);
            if (res.newEffects) updatePack.newEffects.push(...res.newEffects);
            if (p.lifetimeMs > 0) remainingProjectiles.push(p);
        });
        projectilesRef.current = [...remainingProjectiles, ...updatePack.newProjectiles];

        damageNumbersRef.current = [...damageNumbersRef.current.filter(dn => dn.update()), ...updatePack.newDamageNumbers];
        effectsRef.current = [...effectsRef.current.filter(e => e.update()), ...updatePack.newEffects];

        enemies.forEach(enemy => {
            if (!enemy.isAlive && !enemy.isCountedAsKilled) {
                if (!killedEnemiesRef.current[enemy.combatStats.name]) {
                    killedEnemiesRef.current[enemy.combatStats.name] = { emoji: enemy.emoji, count: 0 };
                }
                killedEnemiesRef.current[enemy.combatStats.name].count++;
                enemy.isCountedAsKilled = true;
            }
        });
        
        allEntities.forEach(entity => entity.draw(ctx, false, draggedHeroRef.current?.hero.id === entity.id));
        projectilesRef.current.forEach(p => p.draw(ctx));
        damageNumbersRef.current.forEach(dn => dn.draw(ctx));
        effectsRef.current.forEach(e => e.draw(ctx));

        if (selectedEntityForInfo) drawInfoPanel(ctx, selectedEntityForInfo);
        if(draggedHeroRef.current) draggedHeroRef.current.hero.draw(ctx, false, true);
        
        const boss = enemies.find(e => e.isBoss);
        if (boss) drawBossHealthBar(ctx, boss);
        
        pixiApp.renderer.render(pixiApp.stage);
        if (visualEffectsManagerRef.current) {
            visualEffectsManagerRef.current.update(deltaTime);
        }

        const isBossLevel = currentLevel > 0 && currentLevel % 10 === 0;
        if (!hasEndedLevel.current && internalGameState === GameState.BATTLE) {
            if (heroes.every(h => !h.isAlive)) {
                hasEndedLevel.current = true;
                const report = generateCombatReport(heroes, killedEnemiesRef.current);
                onGameEnd(false, currentBattleBiomeKey, isBossLevel, report); 
            } else if (enemies.every(e => !e.isAlive)) {
                hasEndedLevel.current = true;
                const report = generateCombatReport(heroes, killedEnemiesRef.current);
                onGameEnd(true, currentBattleBiomeKey, isBossLevel, report);
            }
        }

        animationFrameId.current = requestAnimationFrame(gameLoop);
    };

    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
  }, [internalGameState, canvasSize, executeAbility]); // Reduced dependency array
  
  const drawInfoPanel = (ctx: CanvasRenderingContext2D, entity: CombatCapable) => {
    const panelWidth = 200, panelHeight = 120, panelX = canvasSize.width - panelWidth - 10, panelY = 10;
    ctx.save();
    ctx.fillStyle = 'rgba(48, 43, 75, 0.85)';
    ctx.strokeStyle = '#5A5482';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E0DDEF';
    ctx.font = 'bold 16px Fredoka';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const entityChar = entity as Character;
    if (entityChar._entityType === 'enemy') ctx.fillText(`${(entity as EnemyEntity).emoji} ${entity.combatStats.name}`, panelX + 10, panelY + 10);
    else ctx.fillText(entity.combatStats.name, panelX + 10, panelY + 10);
    ctx.font = '14px Fredoka';
    ctx.fillText(`HP: ${Math.ceil(entity.currentHp)} / ${entity.maxHp}`, panelX + 10, panelY + 35);
    ctx.fillText(`Dano: ${entity.effectiveDamage}`, panelX + 10, panelY + 55);
    ctx.fillText(`Alcance: ${entity.range}`, panelX + 10, panelY + 75);
    ctx.fillText(`Vel. Atq: ${entity.attackIntervalMs}ms`, panelX + 10, panelY + 95);
    ctx.restore();
  };

  const drawBossHealthBar = (ctx: CanvasRenderingContext2D, boss: EnemyEntity) => {
    const barWidth = canvasSize.width * 0.6, barHeight = 25, barX = (canvasSize.width - barWidth) / 2, barY = 15;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 8); ctx.fill();
    const healthPercentage = boss.currentHp / boss.maxHp;
    ctx.fillStyle = '#D22B2B';
    drawRoundedRect(ctx, barX, barY, barWidth * healthPercentage, barHeight, 8); ctx.fill();
    if (boss.shieldHp > 0) {
        ctx.fillStyle = 'rgba(173, 216, 230, 0.85)';
        drawRoundedRect(ctx, barX, barY, barWidth * (boss.shieldHp / boss.maxHp), barHeight, 8); ctx.fill();
    }
    ctx.strokeStyle = '#5A5482'; ctx.lineWidth = 3;
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 8); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 16px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    ctx.fillText(`${boss.combatStats.name} - ${Math.ceil(boss.currentHp)} / ${boss.maxHp}`, canvasSize.width / 2, barY + barHeight / 2 + 1);
    ctx.restore();
  };

  const handleStartBattle = () => {
    if (internalGameState === GameState.PLACEMENT) {
      setInternalGameState(GameState.BATTLE);
      setMessage("A Batalha Começou!");
    }
  };

  const mainHero = heroesRef.current.find(h => h.isPlayer);
  const isSpectatorMode = internalGameState === GameState.BATTLE && !!mainHero && !mainHero.isAlive;

  return (
    <div className="w-full h-full relative" id="game-container-wrapper">
        <canvas
            ref={pixiCanvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"
            width={canvasSize.width}
            height={canvasSize.height}
        />
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10"
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        />
        
        <div className="absolute top-4 left-4 text-white text-6xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
            {currentLevel}
        </div>

        {message && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-message-display-bg text-text-light text-xl p-3 px-6 rounded-lg shadow-lg z-30 pointer-events-none">
                {message}
            </div>
        )}

        {internalGameState === GameState.PLACEMENT && (
            <button
            onClick={handleStartBattle}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-30 m-0 text-lg py-2.5 px-8 rounded-lg border-2 border-border-game bg-accent text-accent-text cursor-pointer shadow-button-default active:translate-y-1 active:shadow-button-active hover:bg-accent-hover transition-all duration-100 ease-in-out"
            >
            Iniciar Batalha
            </button>
        )}
        
        {internalGameState === GameState.BATTLE && (
            <AbilityBar 
                heroAbilities={mainHeroAbilities}
                abilityCooldowns={mainHeroAbilityCooldowns}
                onActivateAbility={handleActivateAbility}
                isSpectator={isSpectatorMode}
            />
        )}
    </div>
  );
};

export default React.memo(GameContainer);
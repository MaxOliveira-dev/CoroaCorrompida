

import React, { useState, useEffect } from 'react';
import MainMenu from './components/MainMenu/MainMenu';
import GameContainer from './components/Game/GameContainer'; 
import { Modal } from './components/Modal/Modal'; 
import PostBattleLootModal from './components/Modal/PostBattleLootModal'; 
import CombatReportModal from './components/Modal/CombatReportModal';
import PurchaseLootModal from './components/Modal/PurchaseLootModal';
import DefeatScreen from './components/Game/DefeatScreen'; // Import DefeatScreen

import { BIOMES as ALL_BIOMES, CLASSES as ALL_CLASSES, DROPPABLE_WEAPONS, GameState, PLAYER_DATA as defaultPlayerData, FORGE_COSTS_BY_TIER, BESTIARY_QUESTS, MARKET_ITEMS, ITEM_SELL_VALUE_BY_TIER } from './gameData'; // Added MARKET_ITEMS, ITEM_SELL_VALUE_BY_TIER
import type { PlayerData as PlayerDataType, PlayerFragments, BiomeData, ClassDataMap, Item as ItemType, EquippedItems, CombatReportData, MarketItem as MarketItemType, PurchaseOption } from './types';

interface PendingLoot {
  fragments: PlayerFragments;
  // items: ItemType[]; // If direct items can also be awarded
}

interface PendingPurchaseLoot {
  fragments: PlayerFragments;
  cost: number;
  currency: 'coins' | 'gems';
}

const App: React.FC = () => {
  const [playerData, setPlayerData] = useState<PlayerDataType>(() => {
    const savedData = localStorage.getItem('heroBattlePlayerData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            // Ensure fragments object exists
            if (!parsedData.fragments) {
                parsedData.fragments = {};
            }
            // Ensure hasHadFirstWin flag exists
            if (parsedData.hasHadFirstWin === undefined) {
                parsedData.hasHadFirstWin = false;
            }
            // Ensure bestiary exists
            if (!parsedData.bestiary) {
                parsedData.bestiary = {};
            }
            // Ensure currencies exist
            if (parsedData.coins === undefined) {
                parsedData.coins = defaultPlayerData.coins;
            }
            if (parsedData.gems === undefined) {
                parsedData.gems = defaultPlayerData.gems;
            }
            return parsedData;
        } catch (e) {
            console.error("Could not parse player data from localStorage, using default data.", e);
            localStorage.removeItem('heroBattlePlayerData'); // Clear bad data
            return defaultPlayerData;
        }
    }
    return defaultPlayerData;
  });
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [currentBattleBiomeKey, setCurrentBattleBiomeKey] = useState<string | null>(null);
  const [appMessage, setAppMessage] = useState<string | null>(null);
  const [pendingLoot, setPendingLoot] = useState<PendingLoot | null>(null);
  const [combatReport, setCombatReport] = useState<CombatReportData | null>(null);
  const [showCombatReport, setShowCombatReport] = useState(false);
  const [pendingPurchaseLoot, setPendingPurchaseLoot] = useState<PendingPurchaseLoot | null>(null);


  useEffect(() => {
    localStorage.setItem('heroBattlePlayerData', JSON.stringify(playerData));
  }, [playerData]);

  const handleUpdatePlayerName = (newName: string) => {
    setPlayerData(prev => ({ ...prev, name: newName }));
  };

  const itemTypeToSlotKeyMap: { [itemType: string]: keyof EquippedItems | undefined } = {
    'sword': 'weapon',
    'axe': 'weapon',
    'bow': 'weapon',
    'staff': 'weapon',
    'dagger': 'weapon',
    'shield': 'weapon', 
    'armor': 'armor',     
    'ring': 'ring',       
    'necklace': 'enchantment',
  };

  const handleEquipFromBackpack = (itemIndex: number) => {
    setPlayerData(prev => {
      const backpack = [...prev.inventory.backpack];
      const equipped = { ...prev.inventory.equipped };
      const itemToEquip = backpack[itemIndex];

      if (!itemToEquip) return prev;

      const targetSlotKey = itemTypeToSlotKeyMap[itemToEquip.type];

      if (targetSlotKey) {
        const currentlyEquippedItem = equipped[targetSlotKey];
        equipped[targetSlotKey] = itemToEquip;
        backpack[itemIndex] = currentlyEquippedItem; 
      } else {
        setAppMessage(`Não há slot compatível para ${itemToEquip.name}.`);
        return prev; 
      }

      if (equipped[targetSlotKey] && equipped[targetSlotKey]?.hasNotification) {
        equipped[targetSlotKey] = { ...equipped[targetSlotKey]!, hasNotification: false };
      }

      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          equipped,
          backpack
        }
      };
    });
  };

  const handleUnequipItem = (slotKey: keyof EquippedItems) => {
    setPlayerData(prev => {
      const equipped = { ...prev.inventory.equipped };
      const backpack = [...prev.inventory.backpack];
      const itemToUnequip = equipped[slotKey];

      if (!itemToUnequip) return prev;

      const emptySlotIndex = backpack.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        setAppMessage("Inventário cheio! Não é possível desequipar o item.");
        return prev;
      }

      backpack[emptySlotIndex] = itemToUnequip;
      equipped[slotKey] = null;

      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          equipped,
          backpack
        }
      };
    });
  };

  const handleForgeItem = (itemToForge: ItemType) => {
    setPlayerData(prev => {
        if (!itemToForge.tier) return prev; // Safety check for items without a tier

        const requiredFragments = FORGE_COSTS_BY_TIER[itemToForge.tier];
        const currentFragments = prev.fragments[itemToForge.name] || 0;

        if (currentFragments < requiredFragments) {
            setAppMessage(`Fragmentos insuficientes para forjar ${itemToForge.name}.`);
            return prev;
        }

        // Check if player already owns this item
        const allPlayerItems = [
            ...Object.values(prev.inventory.equipped),
            ...prev.inventory.backpack
        ].filter((item): item is ItemType => item !== null);

        const hasDuplicate = allPlayerItems.some(item => item.name === itemToForge.name);

        // If it's a new unique item, check for backpack space before consuming fragments
        if (!hasDuplicate) {
            const emptySlotIndex = prev.inventory.backpack.findIndex(slot => slot === null);
            if (emptySlotIndex === -1) {
                setAppMessage("Inventário cheio! Libere espaço para forjar este novo item.");
                return prev;
            }
        }

        // From here, we are committed to consuming the fragments
        const newFragments = { ...prev.fragments };
        newFragments[itemToForge.name] = currentFragments - requiredFragments;

        if (hasDuplicate) {
            // Sell the duplicate for gold
            const sellValue = ITEM_SELL_VALUE_BY_TIER[itemToForge.tier] || 0;
            const newCoins = prev.coins + sellValue;
            
            setAppMessage(`Item repetido! ${itemToForge.name} foi vendido por ${sellValue}💰.`);
            
            return {
                ...prev,
                fragments: newFragments,
                coins: newCoins,
            };
        } else {
            // Add the new item to the backpack
            const emptySlotIndex = prev.inventory.backpack.findIndex(slot => slot === null)!; // We've already checked, so it's safe
            const newBackpack = [...prev.inventory.backpack];
            newBackpack[emptySlotIndex] = { ...itemToForge, hasNotification: true, id: Date.now() };

            setAppMessage(`${itemToForge.name} forjado com sucesso!`);
            
            return {
                ...prev,
                fragments: newFragments,
                inventory: {
                    ...prev.inventory,
                    backpack: newBackpack
                }
            };
        }
    });
  };

  const handleClaimBestiaryReward = (enemyName: string) => {
    setPlayerData(prev => {
        const bestiaryEntry = prev.bestiary[enemyName];
        if (!bestiaryEntry) return prev;

        const questData = BESTIARY_QUESTS[enemyName];
        if (!questData) return prev;

        const currentTierIndex = bestiaryEntry.claimedTier;
        const questTier = questData.tiers[currentTierIndex];
        if (!questTier || bestiaryEntry.kills < questTier.required) {
            setAppMessage("Missão ainda não concluída!");
            return prev;
        }

        const newBestiary = { ...prev.bestiary };
        newBestiary[enemyName] = { ...bestiaryEntry, claimedTier: currentTierIndex + 1 };
        
        const newCoins = prev.coins + questTier.reward;
        
        setAppMessage(`Recompensa de ${questTier.reward}💰 coletada por caçar ${enemyName}!`);

        return {
            ...prev,
            coins: newCoins,
            bestiary: newBestiary,
        };
    });
  };

  const handlePurchaseMarketItem = (item: MarketItemType, option: PurchaseOption) => {
    const hasEnoughCurrency = option.currency === 'coins'
      ? playerData.coins >= option.cost
      : playerData.gems >= option.cost;

    if (!hasEnoughCurrency) {
      setAppMessage(`Recursos insuficientes para comprar ${item.name}.`);
      return;
    }

    const availableItemsToDrop = DROPPABLE_WEAPONS.filter(weapon => 
      item.contents.fragmentTiers.some(tier => tier === weapon.tier)
    );

    if (availableItemsToDrop.length === 0) {
      setAppMessage('Não há itens elegíveis para esta caixa no momento.');
      return;
    }

    const totalFragmentsToAward = item.contents.fragmentAmount * option.quantity;
    const generatedFragments: PlayerFragments = {};

    for (let i = 0; i < totalFragmentsToAward; i++) {
      const randomItem = availableItemsToDrop[Math.floor(Math.random() * availableItemsToDrop.length)];
      generatedFragments[randomItem.name] = (generatedFragments[randomItem.name] || 0) + 1;
    }

    setPendingPurchaseLoot({
      fragments: generatedFragments,
      cost: option.cost,
      currency: option.currency
    });
  };

  const handleClaimPurchaseLoot = () => {
    if (!pendingPurchaseLoot) return;

    setPlayerData(prev => {
      const newPlayerData = { ...prev };

      // 1. Deduct cost
      if (pendingPurchaseLoot.currency === 'coins') {
        newPlayerData.coins -= pendingPurchaseLoot.cost;
      } else {
        newPlayerData.gems -= pendingPurchaseLoot.cost;
      }

      // 2. Add fragments
      const newFragments = { ...newPlayerData.fragments };
      for (const [itemName, quantity] of Object.entries(pendingPurchaseLoot.fragments)) {
        newFragments[itemName] = (newFragments[itemName] || 0) + quantity;
      }
      newPlayerData.fragments = newFragments;

      return newPlayerData;
    });

    setPendingPurchaseLoot(null);
  };

  const handleStartExploration = (biomeKey: string) => {
    setCurrentBattleBiomeKey(biomeKey);
    setGameState(GameState.PLACEMENT);
  };

  const handleGameEnd = (playerWon: boolean, biomeKey: string, isBossLevel: boolean, report: CombatReportData) => {
    setCombatReport(report);
    const currentLevel = playerData.progress[biomeKey] || 1;
    let newPlayerData = { ...playerData };
    
    // Update bestiary kills from the report, regardless of win/loss
    const newBestiary = { ...newPlayerData.bestiary };
    for (const [enemyName, killData] of Object.entries(report.enemiesKilled)) {
        if (!newBestiary[enemyName]) {
            newBestiary[enemyName] = { kills: 0, claimedTier: 0 };
        }
        newBestiary[enemyName].kills += killData.count;
    }
    newPlayerData = { ...newPlayerData, bestiary: newBestiary };

    let awardedFragments: PlayerFragments = {};

    if (playerWon) {
      newPlayerData = {
        ...newPlayerData,
        progress: {
          ...newPlayerData.progress,
          [biomeKey]: currentLevel + 1,
        }
      };

      // First win bonus
      if (!newPlayerData.hasHadFirstWin) {
        awardedFragments["Espada Velha"] = (awardedFragments["Espada Velha"] || 0) + 10;
        newPlayerData.hasHadFirstWin = true;
        console.log("Awarded 10 Espada Velha fragments for first win!");
      }

      // Regular Fragment Drop Logic
      const numberOfFragmentBundles = 1 + Math.floor(Math.random() * 2); // 1 to 2 bundles
      for (let i = 0; i < numberOfFragmentBundles; i++) {
        let potentialDrops = [...DROPPABLE_WEAPONS];
        if (!isBossLevel) {
          potentialDrops = potentialDrops.filter(item => item.tier !== 4);
        }
        if (potentialDrops.length === 0) continue;

        const selectedItem = potentialDrops[Math.floor(Math.random() * potentialDrops.length)];
        if (!selectedItem || !selectedItem.tier) continue;

        let quantity = 0;
        switch (selectedItem.tier) {
          case 1: quantity = 1; break; // 1
          case 2: quantity = 1; break; // 1
          case 3: quantity = 1; break; // 1
          case 4: quantity = 1; break; // 1 (Boss Only)
          default: quantity = 1;
        }
        quantity += Math.floor(currentLevel / 15); // Threat level bonus

        awardedFragments[selectedItem.name] = (awardedFragments[selectedItem.name] || 0) + quantity;
      }
      
      if (Object.keys(awardedFragments).length > 0) {
        setPendingLoot({ fragments: awardedFragments });
      }
      setGameState(GameState.POST_BATTLE_REWARDS); 
    } else {
      // Player lost, set explicit state
      setGameState(GameState.LEVEL_LOST);
    }
    setPlayerData(newPlayerData);
  };
  
  const processPendingLoot = () => {
    if (pendingLoot) {
        setPlayerData(prev => {
            const newFragments = { ...prev.fragments };
            for (const itemName in pendingLoot.fragments) {
                newFragments[itemName] = (newFragments[itemName] || 0) + pendingLoot.fragments[itemName];
            }
            return { ...prev, fragments: newFragments, hasHadFirstWin: prev.hasHadFirstWin }; 
        });
    }
    setPendingLoot(null);
  };

  const handleCloseLootModalAndProceed = () => {
    processPendingLoot();
    if(currentBattleBiomeKey){
        // After a win, go to the next level automatically
        startNextLevel(currentBattleBiomeKey);
    } else {
        setGameState(GameState.MENU); 
    }
  };

  const handleReturnToMenuFromLootScreen = () => {
    processPendingLoot();
    setGameState(GameState.MENU);
    setCurrentBattleBiomeKey(null);
    setCombatReport(null);
  };

  const handleShowCombatReport = () => setShowCombatReport(true);
  const handleHideCombatReport = () => setShowCombatReport(false);


  const returnToMenu = () => {
    setGameState(GameState.MENU);
    setCurrentBattleBiomeKey(null);
    setPendingLoot(null);
    setCombatReport(null); 
  };

  const startNextLevel = (biomeKey: string) => {
    setCurrentBattleBiomeKey(biomeKey);
    setGameState(GameState.PLACEMENT);
    setPendingLoot(null);
    setCombatReport(null);
  };

  return (
    <>
      {appMessage && (
        <Modal
          title="Notificação"
          onClose={() => setAppMessage(null)}
          buttons={[{ text: "OK", onClick: () => setAppMessage(null), styleType: 'default' }]}
        >
          <p className="text-text-light">{appMessage}</p>
        </Modal>
      )}

      {pendingPurchaseLoot && (
        <PurchaseLootModal
          loot={pendingPurchaseLoot.fragments}
          onClaim={handleClaimPurchaseLoot}
          allPossibleItems={DROPPABLE_WEAPONS}
        />
      )}

      {gameState === GameState.MENU && (
        <div className="w-screen h-screen flex justify-center items-center p-4 bg-brand-background">
            <MainMenu
              playerData={playerData}
              biomes={ALL_BIOMES}
              classes={ALL_CLASSES}
              droppableWeapons={DROPPABLE_WEAPONS}
              onUpdatePlayerName={handleUpdatePlayerName}
              onEquipFromBackpack={handleEquipFromBackpack}
              onUnequipItem={handleUnequipItem}
              onStartGame={handleStartExploration}
              onForgeItem={handleForgeItem}
              onClaimBestiaryReward={handleClaimBestiaryReward}
              marketItems={MARKET_ITEMS}
              onPurchaseMarketItem={handlePurchaseMarketItem}
            />
        </div>
      )}

      {(gameState === GameState.PLACEMENT || gameState === GameState.BATTLE || gameState === GameState.GAME_OVER_INTERNAL) && currentBattleBiomeKey && (
        <div id="game-view-fullscreen-wrapper" className="fixed inset-0 bg-brand-background z-10">
          <div 
            id="game-canvas-responsive-container" 
            className="relative w-full h-full"
          >
            <div 
              id="game-wrapper-game" 
              className="absolute inset-0 overflow-hidden"
            >
              <GameContainer
                playerData={playerData}
                classes={ALL_CLASSES}
                biomes={ALL_BIOMES}
                currentBattleBiomeKey={currentBattleBiomeKey}
                onGameEnd={handleGameEnd} 
                initialGameState={gameState}
                onShowCombatReport={handleShowCombatReport}
              />
            </div>
          </div>
        </div>
      )}
      
      {gameState === GameState.LEVEL_LOST && currentBattleBiomeKey && (
        <div className="fixed inset-0 bg-brand-background z-30">
            <DefeatScreen
              onRetry={() => startNextLevel(currentBattleBiomeKey)}
              onMainMenu={returnToMenu}
              onShowReport={handleShowCombatReport}
            />
        </div>
      )}

      {gameState === GameState.POST_BATTLE_REWARDS && pendingLoot && currentBattleBiomeKey && (
        <PostBattleLootModal
            loot={pendingLoot}
            onClose={handleCloseLootModalAndProceed}
            onReturnToMenuClick={handleReturnToMenuFromLootScreen}
            onShowReportClick={handleShowCombatReport}
            allPossibleItems={DROPPABLE_WEAPONS}
        />
      )}

      {showCombatReport && combatReport && (
        <CombatReportModal
          report={combatReport}
          onClose={handleHideCombatReport}
          heroesData={ALL_CLASSES}
        />
      )}
    </>
  );
};

export default App;
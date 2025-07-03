


import React, { useState, useMemo } from 'react'; // Added useMemo
import AppHeader from './AppHeader';
// Removed: import FacilityCard from './FacilityCard'; // No longer used directly here
import BottomNavBar, { NavItemKey } from './BottomNavBar';
import BattleTab from './BattleTab'; 
import HeroTab from './HeroTab'; 
import ForgeTab from './ForgeTab'; 
import BestiaryTab from './BestiaryTab'; 
import MarketTab from './MarketTab';
import Tooltip from '../Tooltip/Tooltip'; 
import SimpleTooltip from '../Tooltip/SimpleTooltip'; 
import EnemyTooltip from '../Tooltip/EnemyTooltip'; 

import type { PlayerData, BiomeData, ClassDataMap, Item as ItemType, EquippedItems, EnemyTemplate, MarketItem as MarketItemType, PurchaseOption } from '../../types';
import { FORGE_COSTS_BY_TIER, BESTIARY_QUESTS } from '../../gameData'; 

interface MainMenuProps {
  playerData: PlayerData;
  biomes: BiomeData;
  classes: ClassDataMap;
  droppableWeapons: ItemType[]; 
  onUpdatePlayerName: (newName: string) => void;
  onEquipFromBackpack: (itemIndex: number) => void;
  onUnequipItem: (slotKey: keyof EquippedItems) => void; 
  onStartGame: (biomeKey: string) => void;
  onForgeItem: (itemToForge: ItemType) => void;
  onClaimBestiaryReward: (enemyName: string) => void;
  marketItems: MarketItemType[];
  onPurchaseMarketItem: (item: MarketItemType, option: PurchaseOption) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({
  playerData,
  biomes,
  classes,
  droppableWeapons,
  onUpdatePlayerName,
  onEquipFromBackpack,
  onUnequipItem, 
  onStartGame,
  onForgeItem,
  onClaimBestiaryReward,
  marketItems,
  onPurchaseMarketItem
}) => {
  const [activeNavItem, setActiveNavItem] = useState<NavItemKey>('Batalhar'); 

  // Item Tooltip State
  const [tooltipItem, setTooltipItem] = useState<ItemType | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  // Simple Text Tooltip State (for status descriptions)
  const [simpleTooltipText, setSimpleTooltipText] = useState<string | null>(null);
  const [simpleTooltipVisible, setSimpleTooltipVisible] = useState<boolean>(false);
  const [simpleTooltipPosition, setSimpleTooltipPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  // Enemy Tooltip State
  const [enemyTooltipData, setEnemyTooltipData] = useState<EnemyTemplate | null>(null);
  const [enemyTooltipVisible, setEnemyTooltipVisible] = useState<boolean>(false);
  const [enemyTooltipPosition, setEnemyTooltipPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  const forgeableItemsCount = useMemo(() => {
    return droppableWeapons.reduce((count, item) => {
      if (item.tier) {
        const requiredFragments = FORGE_COSTS_BY_TIER[item.tier];
        const currentFragments = playerData.fragments[item.name] || 0;
        if (currentFragments >= requiredFragments) {
          return count + 1;
        }
      }
      return count;
    }, 0);
  }, [playerData.fragments, droppableWeapons]);

  const bestiaryRewardsCount = useMemo(() => {
    let count = 0;
    for (const enemyName in playerData.bestiary) {
        const questData = BESTIARY_QUESTS[enemyName];
        if (!questData) continue;
        
        const playerEntry = playerData.bestiary[enemyName];
        const currentTierIndex = playerEntry.claimedTier;
        const questTier = questData.tiers[currentTierIndex];

        if (questTier && playerEntry.kills >= questTier.required) {
            count++;
        }
    }
    return count;
  }, [playerData.bestiary]);


  const handleShowTooltip = (item: ItemType, event: React.MouseEvent) => {
    setTooltipItem(item);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    setTooltipVisible(true);
  };

  const handleHideTooltip = () => {
    setTooltipVisible(false);
  };

  const handleShowSimpleTooltip = (text: string, event: React.MouseEvent) => {
    setSimpleTooltipText(text);
    setSimpleTooltipPosition({ x: event.clientX, y: event.clientY });
    setSimpleTooltipVisible(true);
  };

  const handleHideSimpleTooltip = () => {
    setSimpleTooltipVisible(false);
  };

  const handleShowEnemyTooltip = (enemy: EnemyTemplate, event: React.MouseEvent) => {
    setEnemyTooltipData(enemy);
    setEnemyTooltipPosition({ x: event.clientX, y: event.clientY });
    setEnemyTooltipVisible(true);
  };

  const handleHideEnemyTooltip = () => {
    setEnemyTooltipVisible(false);
    setEnemyTooltipData(null); // Clear data when hiding
  };

  const handleNavChange = (item: NavItemKey) => {
    setActiveNavItem(item);
  };

  return (
    <>
      <Tooltip item={tooltipItem} visible={tooltipVisible} position={tooltipPosition} classes={classes} />
      <SimpleTooltip text={simpleTooltipText} visible={simpleTooltipVisible} position={simpleTooltipPosition} />
      <EnemyTooltip enemy={enemyTooltipData} visible={enemyTooltipVisible} position={enemyTooltipPosition} />
      <div
          id="main-menu-container"
          className="w-full max-w-[420px] h-full mx-auto bg-brand-background flex flex-col shadow-xl rounded-lg overflow-hidden border-2 border-brand-surface"
      >
        <AppHeader gems={playerData.gems} coins={playerData.coins} kingImageUrl="https://placehold.co/100x120/FFD700/302B4B?text=👑" />

        <div className="flex-grow overflow-y-auto custom-scrollbar p-0 space-y-0">
          {activeNavItem === 'Mercado' && (
            <MarketTab
              playerData={playerData}
              marketItems={marketItems}
              onPurchase={onPurchaseMarketItem}
            />
          )}

          {activeNavItem === 'Forjar' && ( 
            <ForgeTab
              playerData={playerData}
              forgeableItems={droppableWeapons}
              onForgeItem={onForgeItem}
              onShowTooltip={handleShowTooltip}
              onHideTooltip={handleHideTooltip}
            />
          )}

          {activeNavItem === 'Bestiário' && (
            <BestiaryTab
                playerData={playerData}
                biomesData={biomes}
                bestiaryQuests={BESTIARY_QUESTS}
                onClaimReward={onClaimBestiaryReward}
                onShowEnemyTooltip={handleShowEnemyTooltip}
                onHideEnemyTooltip={handleHideEnemyTooltip}
            />
          )}

          {activeNavItem === 'Batalhar' && (
             <BattleTab
                biomes={biomes}
                playerProgress={playerData.progress}
                onStartGame={onStartGame}
              />
          )}

          {activeNavItem === 'Herói' && (
            <HeroTab
              playerData={playerData}
              classes={classes}
              onUpdatePlayerName={onUpdatePlayerName}
              onEquipFromBackpack={onEquipFromBackpack}
              onUnequipItem={onUnequipItem}
              onShowTooltip={handleShowTooltip}
              onHideTooltip={handleHideTooltip}
              onShowSimpleTooltip={handleShowSimpleTooltip}
              onHideSimpleTooltip={handleHideSimpleTooltip}
            />
          )}
        </div>

        <BottomNavBar 
            activeItem={activeNavItem} 
            onNavChange={handleNavChange} 
            forgeNotificationCount={forgeableItemsCount}
            bestiaryNotificationCount={bestiaryRewardsCount}
        />
      </div>
    </>
  );
};

export default MainMenu;
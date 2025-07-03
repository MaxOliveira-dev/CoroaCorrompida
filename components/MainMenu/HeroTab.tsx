


import React, { useState } from 'react';
import type { PlayerData, ClassDataMap, BaseStats, ClassData, Item, EquippedItems, Ability } from '../../types';
import EquipmentSlot from './EquipmentSlot';
import HeroDisplay from './HeroDisplay';
import InventorySection from './InventorySection';
import StatsDetailView from './StatsDetailView'; 
import AbilitiesTab from './AbilitiesTab'; // New import

interface HeroTabProps {
  playerData: PlayerData;
  classes: ClassDataMap;
  onUpdatePlayerName: (newName: string) => void; 
  onEquipFromBackpack: (itemIndex: number) => void;
  onUnequipItem: (slotKey: keyof EquippedItems) => void;
  onShowTooltip: (item: Item, event: React.MouseEvent) => void;
  onHideTooltip: () => void;
  onShowSimpleTooltip: (text: string, event: React.MouseEvent) => void; 
  onHideSimpleTooltip: () => void; 
}

export const calculateFinalStats = (playerData: PlayerData, classes: ClassDataMap): BaseStats & Partial<ClassData> & { hp: number, damage: number, abilities?: Ability[] } => {
    const calculatedBaseStats: BaseStats = { ...playerData.baseStats };

    Object.values(playerData.inventory.equipped).forEach(item => {
        if (item && item.statBonuses) {
            for (const [statKey, bonusValue] of Object.entries(item.statBonuses)) {
                if (bonusValue !== undefined) {
                    const key = statKey as keyof BaseStats;
                    calculatedBaseStats[key] = (calculatedBaseStats[key] || 0) + (bonusValue as number);
                }
            }
        }
    });

    const equippedWeaponItem = playerData.inventory.equipped.weapon;
    
    // Determine hero class based on equipped weapon's 'equipsToClass' property
    let heroClassKey: keyof ClassDataMap = 'AVENTUREIRO'; // Default to Aventureiro
    if (equippedWeaponItem && equippedWeaponItem.equipsToClass) {
        heroClassKey = equippedWeaponItem.equipsToClass;
    } else if (equippedWeaponItem) {
        // Fallback to type-based mapping if equipsToClass is missing (legacy or other items)
        const weaponTypeToClassKey: { [key: string]: keyof ClassDataMap | undefined } = {
            'bow': 'ARQUEIRO', 'sword': 'GUERREIRO', 'axe': 'GUERREIRO',
            'staff': 'MAGO', 'dagger': 'ASSASSINO', 'shield': 'GUARDIÃO'
            // 'unarmed' or undefined type will correctly fall through to AVENTUREIRO
        };
        heroClassKey = weaponTypeToClassKey[equippedWeaponItem.type] || 'AVENTUREIRO';
    }
    
    const heroClass = classes[heroClassKey];
    const finalStats: Partial<ClassData> & { abilities?: Ability[] } = {};

    if (heroClass) {
        finalStats.name = heroClass.name; 
        finalStats.color = heroClass.color;
        finalStats.bodyColor = heroClass.bodyColor;
        // If 'AVENTUREIRO' and weapon is 'unarmed', or if no weapon, HeroDisplay will show no weapon
        finalStats.weapon = equippedWeaponItem ? heroClass.weapon : 'unarmed'; 
        finalStats.range = heroClass.range;
        finalStats.attackSpeed = heroClass.attackSpeed; 
        finalStats.velocidadeMovimento = heroClass.velocidadeMovimento; 
        finalStats.abilities = heroClass.abilities;
    }
    
    const completeStats = {
        ...calculatedBaseStats, 
        ...finalStats, 
        hp: Math.floor((calculatedBaseStats.vigor || 0) * 10.85 + ((heroClass?.hp || 0) as number)), 
        damage: Math.floor((calculatedBaseStats.letalidade || 0) * 1.25 + ((heroClass?.damage || 0) as number)), 
    };

    return completeStats as BaseStats & Partial<ClassData> & { hp: number, damage: number, abilities?: Ability[] };
};


const HeroTab: React.FC<HeroTabProps> = ({
  playerData,
  classes,
  onUpdatePlayerName, 
  onEquipFromBackpack,
  onUnequipItem,
  onShowTooltip, 
  onHideTooltip,
  onShowSimpleTooltip, 
  onHideSimpleTooltip  
}) => {
  const { inventory } = playerData; 
  const finalStats = calculateFinalStats(playerData, classes);
  const [activeSubTab, setActiveSubTab] = useState<'equipment' | 'status' | 'abilities'>('equipment');

  type UiSlotType = 'weapon' | 'armor' | 'ring' | 'enchantment';

  const getEquippedItemForSlot = (uiSlotType: UiSlotType): Item | null => {
    switch (uiSlotType) {
      case 'weapon': return inventory.equipped.weapon;
      case 'armor': return inventory.equipped.armor;
      case 'ring': return inventory.equipped.ring;
      case 'enchantment': return inventory.equipped.enchantment;
      default: return null;
    }
  };

  const handleItemUnequip = (uiSlotType: UiSlotType) => {
    const slotKeyToUnequip = uiSlotType as keyof EquippedItems;
    if (inventory.equipped[slotKeyToUnequip]) {
      onUnequipItem(slotKeyToUnequip);
    }
  };

  const getSubTabButtonStyle = (tabName: 'equipment' | 'status' | 'abilities') => {
    const isActive = activeSubTab === tabName;
    return `py-2 px-4 text-sm font-semibold rounded-t-md transition-colors duration-150 focus:outline-none w-1/3
            ${isActive 
              ? 'bg-brand-surface text-brand-accent border-b-2 border-brand-accent' 
              : 'bg-brand-background text-text-muted hover:bg-brand-card hover:text-text-light'
            }`;
  };

  return (
    <div id="hero-content" className="flex flex-col h-full bg-hero-content-bg text-text-light custom-scrollbar overflow-y-auto">
      {/* Character Display Area */}
      <div className="bg-hero-area-bg p-3 md:p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
          <div className="flex flex-col gap-2 pt-8"> 
            <EquipmentSlot
              id="equip-weapon"
              slotType="weapon"
              item={getEquippedItemForSlot('weapon')}
              onClick={() => getEquippedItemForSlot('weapon') && handleItemUnequip('weapon')}
              ariaLabel="Arma equipada"
              onShowTooltip={onShowTooltip}
              onHideTooltip={onHideTooltip}
            />
            <EquipmentSlot
              id="equip-ring"
              slotType="ring"
              item={getEquippedItemForSlot('ring')}
              onClick={() => getEquippedItemForSlot('ring') && handleItemUnequip('ring')}
              ariaLabel="Anel equipado"
              onShowTooltip={onShowTooltip}
              onHideTooltip={onHideTooltip}
            />
          </div>
          <div className="flex flex-col items-center pt-2">
            <HeroDisplay
              displayedClassName={finalStats.name || "Herói"}
              heroClassData={finalStats}
            />
            <div className="flex justify-center items-center space-x-4 mt-2">
              <div className="flex items-center text-red-500">
                <span className="text-lg mr-1">❤️</span>
                <span className="font-bold text-sm text-gray-700">
                  {finalStats.hp > 1000 ? `${(finalStats.hp / 1000).toFixed(2)}K` : finalStats.hp}
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <span className="text-lg mr-1">⚔️</span>
                <span className="font-bold text-sm text-gray-700">{finalStats.damage}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-8"> 
            <EquipmentSlot
              id="equip-armor"
              slotType="armor"
              item={getEquippedItemForSlot('armor')}
              onClick={() => getEquippedItemForSlot('armor') && handleItemUnequip('armor')}
              ariaLabel="Armadura equipada"
              onShowTooltip={onShowTooltip}
              onHideTooltip={onHideTooltip}
            />
            <EquipmentSlot
              id="equip-enchantment"
              slotType="enchantment"
              item={getEquippedItemForSlot('enchantment')}
              onClick={() => getEquippedItemForSlot('enchantment') && handleItemUnequip('enchantment')}
              ariaLabel="Encantamento equipado"
              onShowTooltip={onShowTooltip}
              onHideTooltip={onHideTooltip}
            />
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex sticky top-0 z-10 bg-brand-background shadow-sm">
        <button
          onClick={() => setActiveSubTab('equipment')}
          className={getSubTabButtonStyle('equipment')}
          aria-pressed={activeSubTab === 'equipment'}
        >
          Equipamento
        </button>
        <button
          onClick={() => setActiveSubTab('status')}
          className={getSubTabButtonStyle('status')}
          aria-pressed={activeSubTab === 'status'}
        >
          Status
        </button>
        <button
          onClick={() => setActiveSubTab('abilities')}
          className={getSubTabButtonStyle('abilities')}
          aria-pressed={activeSubTab === 'abilities'}
        >
          Habilidades
        </button>
      </div>
      
      {/* Content based on active sub-tab */}
      <div className="flex-grow p-3 bg-brand-background overflow-y-auto custom-scrollbar">
        {activeSubTab === 'equipment' && (
          <>
            <InventorySection
              backpack={inventory.backpack}
              onItemClick={onEquipFromBackpack}
              onShowTooltip={onShowTooltip}
              onHideTooltip={onHideTooltip}
            />
          </>
        )}
        {activeSubTab === 'status' && (
          <StatsDetailView 
            baseStats={playerData.baseStats} 
            finalStats={finalStats} 
            onShowSimpleTooltip={onShowSimpleTooltip} 
            onHideSimpleTooltip={onHideSimpleTooltip} 
          />
        )}
        {activeSubTab === 'abilities' && (
          <AbilitiesTab abilities={finalStats.abilities || []} />
        )}
      </div>
    </div>
  );
};

export default HeroTab;
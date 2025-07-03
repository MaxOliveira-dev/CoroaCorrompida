
import React, { useState, useMemo } from 'react';
import type { PlayerData, Item as ItemType } from '../../types';
import { FORGE_COSTS_BY_TIER } from '../../gameData';

// Define categories and mapping
type ForgeCategory = 'ALL' | 'WEAPON' | 'ARMOR';

const ITEM_TYPE_TO_CATEGORY: { [key: string]: ForgeCategory } = {
  'sword': 'WEAPON',
  'axe': 'WEAPON',
  'bow': 'WEAPON',
  'staff': 'WEAPON',
  'dagger': 'WEAPON',
  'shield': 'WEAPON',
  'armor': 'ARMOR',
  'ring': 'ARMOR',      // Rings and other accessories can be grouped with armor for simplicity
  'enchantment': 'ARMOR'
};

const CATEGORIES: { key: ForgeCategory; label: string }[] = [
    { key: 'ALL', label: 'Todos' },
    { key: 'WEAPON', label: 'Armas' },
    { key: 'ARMOR', label: 'Armaduras' },
];


interface ForgeTabProps {
  playerData: PlayerData;
  forgeableItems: ItemType[];
  onForgeItem: (itemToForge: ItemType) => void;
  onShowTooltip: (item: ItemType, event: React.MouseEvent) => void;
  onHideTooltip: () => void;
}

const ForgeTab: React.FC<ForgeTabProps> = ({
  playerData,
  forgeableItems,
  onForgeItem,
  onShowTooltip,
  onHideTooltip,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ForgeCategory>('ALL');

  const getTierColor = (tier: number | undefined): string => {
    if (!tier) return 'text-gray-400';
    return `text-item-tier-${tier}`;
  };

  const handleForgeClick = (item: ItemType) => {
    const requiredFragments = item.tier ? FORGE_COSTS_BY_TIER[item.tier] : Infinity;
    const currentFragments = playerData.fragments[item.name] || 0;
    if (currentFragments >= requiredFragments) {
      onForgeItem(item);
    }
  };
  
  const filteredAndSortedItems = useMemo(() => {
    return [...forgeableItems]
      .filter(item => {
        if (selectedCategory === 'ALL') return true;
        return ITEM_TYPE_TO_CATEGORY[item.type] === selectedCategory;
      })
      .sort((a, b) => {
        const tierA = a.tier || 0;
        const tierB = b.tier || 0;
        if (tierA !== tierB) {
          return tierA - tierB;
        }
        return a.name.localeCompare(b.name);
      });
  }, [forgeableItems, selectedCategory]);

  return (
    <div className="p-4 flex flex-col h-full bg-brand-background">
      <h2 className="text-xl font-semibold text-text-light mb-4 text-center shrink-0">Forjar Equipamentos</h2>
      
      {/* Category Filters */}
      <div className="flex justify-center gap-2 mb-4 shrink-0">
        {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.key;
            return (
                <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-150 focus:outline-none
                        ${isActive
                            ? 'bg-brand-accent text-brand-accent-text shadow-md'
                            : 'bg-brand-surface text-text-muted hover:bg-brand-card hover:text-text-light'
                        }`}
                >
                    {cat.label}
                </button>
            )
        })}
      </div>
      
      {/* Items Grid */}
      <div className="flex-grow overflow-y-auto custom-scrollbar -mr-2 pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredAndSortedItems.map((item) => {
            if (!item.tier) return null;

            const requiredFragments = FORGE_COSTS_BY_TIER[item.tier];
            const currentFragments = playerData.fragments[item.name] || 0;
            const canForge = currentFragments >= requiredFragments;
            const progressPercent = Math.min(100, (currentFragments / requiredFragments) * 100);

            return (
              <div
                key={item.name}
                className="bg-brand-surface p-3 rounded-lg shadow-md flex flex-col items-center border border-brand-card"
              >
                <div className="flex items-center w-full mb-2">
                  <span
                    className="text-4xl mr-3 cursor-help"
                    onMouseEnter={(e) => onShowTooltip(item, e)}
                    onMouseLeave={onHideTooltip}
                  >
                    {item.icon}
                  </span>
                  <div className="flex-grow">
                    <h3 className={`text-md font-semibold ${getTierColor(item.tier)}`}>{item.name}</h3>
                    <p className="text-xs text-brand-secondary">Tier: {item.tier}</p>
                  </div>
                </div>
                
                <div className="w-full mb-2">
                  <p className="text-xs text-text-muted text-center mb-1">
                    Fragmentos: {currentFragments} / {requiredFragments}
                  </p>
                  <div className="w-full bg-progress-bar-bg rounded-full h-2.5 overflow-hidden border border-brand-card-locked">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getTierColor(item.tier).replace('text-', 'bg-')}`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                <button
                  onClick={() => handleForgeClick(item)}
                  disabled={!canForge}
                  className={`w-full mt-auto py-2 px-4 rounded-md text-sm font-semibold transition-colors duration-150
                              ${canForge
                                ? 'bg-brand-accent text-brand-accent-text hover:bg-accent-hover shadow-button-default'
                                : 'bg-brand-card-locked text-text-muted cursor-not-allowed'
                              }`}
                >
                  Forjar
                </button>
              </div>
            );
          })}
        </div>
        {filteredAndSortedItems.length === 0 && (
          <p className="text-center text-text-muted py-10">
            Nenhum item desta categoria disponível para forja.
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgeTab;

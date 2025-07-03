
import React from 'react';
import type { Item } from '../../types';
import InventorySlot from './InventorySlot';

interface InventorySectionProps {
  backpack: (Item | null)[];
  onItemClick: (index: number) => void;
  onShowTooltip: (item: Item, event: React.MouseEvent) => void; // New prop
  onHideTooltip: () => void; // New prop
}

const InventorySection: React.FC<InventorySectionProps> = ({ 
  backpack, 
  onItemClick,
  onShowTooltip,
  onHideTooltip
}) => {
  // Ensure backpack always has a multiple of 5 slots for consistent grid display, or fill up to a certain max (e.g. 15 slots = 3 rows)
  const displaySlots = 15; // For example, 3 rows of 5
  const itemsToDisplay = Array(displaySlots).fill(null).map((_, i) => backpack[i] || null);


  return (
    <div className="inventory-section bg-brand-surface p-2.5 rounded-lg shadow-inner">
      <div className="grid grid-cols-5 gap-2 sm:gap-2.5 justify-center">
        {itemsToDisplay.map((item, index) => (
          <InventorySlot
            key={`inv-slot-${index}`}
            id={`inv-slot-${index}`}
            item={item}
            onClick={() => item && onItemClick(backpack.indexOf(item))} // Ensure original index is used for callback
            ariaLabel={`Inventário slot ${index + 1}`}
            onShowTooltip={onShowTooltip}
            onHideTooltip={onHideTooltip}
          />
        ))}
      </div>
    </div>
  );
};

export default InventorySection;
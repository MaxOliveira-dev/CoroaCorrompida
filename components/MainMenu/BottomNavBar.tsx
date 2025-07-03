


import React from 'react';

export type NavItemKey = 'Mercado' | 'Forjar' | 'Bestiário' | 'Batalhar' | 'Herói'; // Renamed Masmorra to Batalhar

interface NavItem {
  key: NavItemKey;
  label: string;
  icon: string; // Emoji or SVG path
}

const NAV_ITEMS: NavItem[] = [
  { key: 'Mercado', label: 'Mercado', icon: '🛍️' },
  { key: 'Forjar', label: 'Forjar', icon: '🧩' },
  { key: 'Bestiário', label: 'Bestiário', icon: '🐾' },
  { key: 'Batalhar', label: 'Batalhar', icon: '⚔️' }, // Renamed Masmorra to Batalhar
  { key: 'Herói', label: 'Herói', icon: '👑' },
];

interface BottomNavBarProps {
  activeItem: NavItemKey;
  onNavChange: (itemKey: NavItemKey) => void;
  forgeNotificationCount?: number; 
  bestiaryNotificationCount?: number; // New prop for bestiary notifications
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeItem, onNavChange, forgeNotificationCount, bestiaryNotificationCount }) => {
  return (
    <div className="bg-brand-card flex justify-around items-center p-1 shadow-inner border-t-2 border-brand-surface">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeItem;
        const showForgeNotification = item.key === 'Forjar' && forgeNotificationCount && forgeNotificationCount > 0;
        const showBestiaryNotification = item.key === 'Bestiário' && bestiaryNotificationCount && bestiaryNotificationCount > 0;

        return (
          <button
            key={item.key}
            onClick={() => onNavChange(item.key)}
            className={`relative flex flex-col items-center justify-center p-2 rounded-md transition-colors duration-150 w-1/5
                        ${isActive ? 'bg-brand-accent text-brand-accent-text' : 'text-brand-secondary hover:bg-brand-surface'}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={`text-2xl ${isActive ? '' : 'opacity-70'}`}>{item.icon}</span>
            <span className={`text-[10px] sm:text-xs font-medium mt-0.5 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
            
            {(showForgeNotification || showBestiaryNotification) && (
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center border-2 border-brand-card">
                {item.key === 'Forjar' ? (forgeNotificationCount > 9 ? '9+' : forgeNotificationCount) :
                 item.key === 'Bestiário' ? (bestiaryNotificationCount > 9 ? '9+' : bestiaryNotificationCount) : ''}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNavBar;
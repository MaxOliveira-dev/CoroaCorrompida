
import React from 'react';
import type { Item, BaseStats, ClassDataMap } from '../../types';

interface TooltipProps {
  item: Item | null;
  visible: boolean;
  position: { x: number; y: number };
  classes: ClassDataMap;
}

// Helper to format stat keys for display
const formatStatName = (key: string): string => {
  switch (key) {
    case 'letalidade': return 'Letalidade';
    case 'vigor': return 'Vigor';
    case 'resistencia': return 'Resistência';
    case 'velocidadeAtaque': return 'Vel. Ataque';
    case 'velocidadeMovimento': return 'Vel. Movimento';
    case 'chanceCritica': return 'Chance Crítica';
    case 'danoCritico': return 'Dano Crítico';
    case 'chanceEsquiva': return 'Esquiva';
    case 'vampirismo': return 'Vampirismo';
    default: return key.charAt(0).toUpperCase() + key.slice(1);
  }
};

const Tooltip: React.FC<TooltipProps> = ({ item, visible, position, classes }) => {
  if (!visible || !item) {
    return null;
  }

  const classKey = item?.equipsToClass;
  const classData = classKey ? classes[classKey] : null;

  const tierColors: { [key: number]: string } = {
    1: 'text-item-tier-1', 
    2: 'text-item-tier-2', 
    3: 'text-item-tier-3', 
    4: 'text-item-tier-4', 
  };
  const tierBorderColors: { [key: number]: string } = {
    1: 'border-item-tier-1',
    2: 'border-item-tier-2',
    3: 'border-item-tier-3',
    4: 'border-item-tier-4',
  };

  const nameColorClass = item.tier ? tierColors[item.tier] : 'text-text-light';
  const borderColorClass = item.tier ? tierBorderColors[item.tier] : 'border-brand-surface';

  const tooltipWidth = 220; 
  let tooltipHeightEstimate = 100 + (item.description ? 30 : 0) + (item.statBonuses ? Object.keys(item.statBonuses).length * 20 : 0);
  if (classData) {
      tooltipHeightEstimate += 120; // Add space for class info
  }
  
  let x = position.x + 15;
  let y = position.y + 15;

  if (typeof window !== 'undefined') {
    if (x + tooltipWidth > window.innerWidth) {
      x = position.x - tooltipWidth - 15; 
    }
    if (y + tooltipHeightEstimate > window.innerHeight) {
      y = position.y - tooltipHeightEstimate - 5; 
    }
     // Ensure tooltip doesn't go off-screen top or left
    if (x < 0) x = 5;
    if (y < 0) y = 5;
  }


  return (
    <div
      className={`fixed p-3 rounded-lg shadow-xl bg-brand-card border ${borderColorClass} text-sm text-text-light z-[100] transition-opacity duration-100 w-[220px] pointer-events-none`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        opacity: visible ? 1 : 0,
      }}
      role="tooltip"
    >
      <div className="flex items-center mb-2 pb-2 border-b border-brand-surface">
        <span className="text-3xl mr-3">{item.icon}</span>
        <h4 className={`font-bold text-base ${nameColorClass}`}>{item.name}</h4>
      </div>
      <div className="space-y-1">
        {item.tier && (
          <p>
            <span className="font-semibold text-brand-secondary">Tier:</span>{' '}
            <span className={nameColorClass}>{item.tier}</span>
          </p>
        )}
        <p>
          <span className="font-semibold text-brand-secondary">Tipo:</span> {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
        </p>
        
        {item.statBonuses && Object.keys(item.statBonuses).length > 0 && (
          <div className="mt-2 pt-2 border-t border-brand-surface space-y-0.5">
            {(Object.entries(item.statBonuses) as [keyof BaseStats, number][]).map(([key, value]) => (
              value !== 0 && ( // Only display if bonus is not zero
                <p key={key}>
                  <span className="font-semibold text-brand-secondary">{formatStatName(key)}:</span>{' '}
                  <span className="text-green-400">
                    {value > 0 ? '+' : ''}{value}
                    {key === 'velocidadeAtaque' || key === 'chanceCritica' || key === 'danoCritico' || key === 'chanceEsquiva' || key === 'vampirismo' ? '%' : ''}
                  </span>
                </p>
              )
            ))}
          </div>
        )}

        {classData && (
             <div className="mt-2 pt-2 border-t border-brand-surface space-y-0.5">
                 <h5 className="font-semibold text-brand-primary">Classe: {classData.name}</h5>
                 <p><span className="text-brand-secondary">HP Base:</span> <span className="text-text-light">{classData.hp}</span></p>
                 <p><span className="text-brand-secondary">Dano Base:</span> <span className="text-text-light">{classData.damage}</span></p>
                 <p><span className="text-brand-secondary">Alcance:</span> <span className="text-text-light">{classData.range}</span></p>
                 <p><span className="text-brand-secondary">Intervalo Atq.:</span> <span className="text-text-light">{classData.attackSpeed}ms</span></p>
                 <p><span className="text-brand-secondary">Vel. Movimento:</span> <span className="text-text-light">{classData.velocidadeMovimento}</span></p>
            </div>
        )}

        {item.description && (
          <p className="mt-2 pt-2 border-t border-brand-surface opacity-90 text-xs">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default Tooltip;

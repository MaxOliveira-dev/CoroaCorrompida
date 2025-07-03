import React from 'react';
import type { BaseStats, ClassData, PlayerData } from '../../types';

interface StatsDetailViewProps {
  baseStats: BaseStats;
  finalStats: BaseStats & Partial<ClassData> & { hp: number; damage: number };
  onShowSimpleTooltip: (text: string, event: React.MouseEvent) => void;
  onHideSimpleTooltip: () => void;
}

type StatKey = keyof BaseStats | 'hp' | 'damage' | 'range' | 'attackSpeed' | 'velocidadeMovimentoClass';

interface StatDisplayConfig {
  key: StatKey;
  name: string;
  format?: (value: number) => string;
  suffix?: string;
  prefix?: string;
  isPercentage?: boolean;
  isTimeMs?: boolean;
  isBaseStat?: boolean; // Indicates if it's a direct BaseStats field for bonus calculation
}

const STATS_CONFIG: StatDisplayConfig[] = [
  { key: 'hp', name: 'HP Total', format: (v) => v > 1000 ? `${(v / 1000).toFixed(2)}K` : v.toFixed(0) },
  { key: 'damage', name: 'Dano Base', format: (v) => v.toFixed(0) },
  { key: 'letalidade', name: 'Letalidade', isBaseStat: true },
  { key: 'vigor', name: 'Vigor', isBaseStat: true },
  { key: 'resistencia', name: 'Resistência', isBaseStat: true },
  { key: 'velocidadeAtaque', name: 'Mod. Vel. Ataque', suffix: '%', isBaseStat: true },
  { key: 'attackSpeed', name: 'Intervalo Ataque', suffix: 'ms', isTimeMs: true },
  { key: 'velocidadeMovimento', name: 'Vel. Movimento Base', format: (v) => v.toFixed(1), isBaseStat: true },
  { key: 'range', name: 'Alcance' },
  { key: 'chanceCritica', name: 'Chance Crítica', suffix: '%', isBaseStat: true },
  { key: 'danoCritico', name: 'Dano Crítico', prefix: '+', suffix: '%', isBaseStat: true },
  { key: 'chanceEsquiva', name: 'Esquiva', suffix: '%', isBaseStat: true },
  { key: 'vampirismo', name: 'Vampirismo', suffix: '%', isBaseStat: true },
];

const STATUS_DESCRIPTIONS: Record<StatKey, string> = {
  hp: "Vida máxima do seu herói. Chegar a 0 HP resulta em derrota.",
  damage: "Dano base causado pelos ataques do seu herói antes de outros modificadores.",
  letalidade: "Aumenta o dano final dos seus ataques. Cada ponto de Letalidade aumenta o dano em 1.25.",
  vigor: "Aumenta a vida máxima do seu herói. Cada ponto de Vigor aumenta a vida em aproximadamente 10.85.",
  resistencia: "Reduz o dano percentual recebido de ataques inimigos.",
  velocidadeAtaque: "Modificador percentual na velocidade com que seu herói ataca. Valores positivos aumentam a frequência de ataques (reduzem o intervalo).",
  attackSpeed: "Tempo em milissegundos entre os ataques do herói (base da classe). Menor é melhor. Modificado pela 'Vel. Ataque'.",
  velocidadeMovimento: "Velocidade com que seu herói se move pelo campo de batalha (base do personagem).",
  velocidadeMovimentoClass: "Velocidade de movimento base da classe do herói.", // Added for completeness if needed
  range: "Distância máxima em que seu herói pode atacar um alvo.",
  chanceCritica: "Probabilidade de seus ataques causarem dano crítico aumentado.",
  danoCritico: "Percentual de dano extra causado em um acerto crítico (adicionado ao dano base).",
  chanceEsquiva: "Probabilidade de seu herói evitar completamente o dano de um ataque inimigo.",
  vampirismo: "Percentual do dano causado que é convertido em cura para o seu herói."
};


const StatsDetailView: React.FC<StatsDetailViewProps> = ({ 
  baseStats, 
  finalStats, 
  onShowSimpleTooltip, 
  onHideSimpleTooltip 
}) => {
  return (
    <div className="p-4 bg-brand-surface rounded-lg shadow-inner text-text-light space-y-2">
      <h3 className="text-lg font-semibold text-brand-primary mb-3">Detalhes dos Atributos</h3>
      {STATS_CONFIG.map(config => {
        const finalValue = finalStats[config.key as keyof typeof finalStats] as number | undefined;

        if (finalValue === undefined || finalValue === null) {
          return null; 
        }

        let baseValueForBonusCalc: number | undefined;
        if (config.isBaseStat) {
            baseValueForBonusCalc = baseStats[config.key as keyof BaseStats] as number | undefined;
        }

        const bonus = (config.isBaseStat && baseValueForBonusCalc !== undefined && finalValue !== undefined) 
                        ? finalValue - baseValueForBonusCalc 
                        : 0;

        let displayValue = config.format ? config.format(finalValue) : finalValue.toString();
        if (config.prefix) displayValue = config.prefix + displayValue;
        if (config.suffix) displayValue += config.suffix;
        
        let bonusDisplay = "";
        if (config.isTimeMs && baseValueForBonusCalc !== undefined && finalValue !== baseValueForBonusCalc) {
            const diff = finalValue - baseValueForBonusCalc; 
            if (diff < 0) {
                bonusDisplay = ` (${baseValueForBonusCalc.toFixed(0)}${config.suffix || ''} <span class="text-green-400">${diff.toFixed(0)}${config.suffix || ''}</span>)`;
            } else if (diff > 0) {
                bonusDisplay = ` (${baseValueForBonusCalc.toFixed(0)}${config.suffix || ''} <span class="text-red-400">+${diff.toFixed(0)}${config.suffix || ''}</span>)`;
            }
        } else if (bonus !== 0 && config.isBaseStat) {
            const bonusPrecision = (config.key === 'velocidadeMovimento') ? 1 : 0; // More precision for movement speed bonus
            bonusDisplay = ` (${(baseValueForBonusCalc?.toFixed(bonusPrecision) || '0')}${config.isPercentage || config.suffix === '%' ? '%' : ''} <span class="text-green-400">${bonus > 0 ? '+' : ''}${bonus.toFixed(bonusPrecision)}${config.isPercentage || config.suffix === '%' ? '%' : ''}</span>)`;
        }

        const description = STATUS_DESCRIPTIONS[config.key] || "";

        return (
          <div key={config.key} className="flex justify-between items-center text-sm border-b border-brand-card pb-1">
            <span 
              className="font-medium text-brand-secondary cursor-help"
              onMouseEnter={(e) => description && onShowSimpleTooltip(description, e)}
              onMouseLeave={onHideSimpleTooltip}
            >
              {config.name}:
            </span>
            <span className="font-semibold" dangerouslySetInnerHTML={{ __html: `${displayValue}${bonusDisplay}` }}>
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StatsDetailView;

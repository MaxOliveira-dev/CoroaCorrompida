
import React, { useState } from 'react';
import type { BiomeData, PlayerProgress } from '../../types';
import ExploreTab from './ExploreTab';

interface BattleTabProps {
  biomes: BiomeData;
  playerProgress: PlayerProgress;
  onStartGame: (biomeKey: string) => void;
}

const GameModeCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ icon, title, description, onClick, disabled = false }) => {
  const cardClasses = `
    bg-brand-surface p-4 rounded-lg shadow-md flex items-center space-x-4 border-2 border-brand-card
    transition-all duration-200 ease-in-out
    ${disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'cursor-pointer hover:bg-brand-card hover:border-brand-primary hover:scale-105'
    }
  `;

  return (
    <div className="relative">
      <div className={cardClasses} onClick={!disabled ? onClick : undefined}>
        <span className="text-5xl">{icon}</span>
        <div className="flex-grow">
          <h3 className="text-lg font-bold text-text-light">{title}</h3>
          <p className="text-sm text-brand-secondary">{description}</p>
        </div>
      </div>
      {disabled && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
          Em Breve
        </div>
      )}
    </div>
  );
};

const BattleTab: React.FC<BattleTabProps> = ({ biomes, playerProgress, onStartGame }) => {
  const [activeMode, setActiveMode] = useState<'selection' | 'explore'>('selection');

  if (activeMode === 'explore') {
    return (
      <div className="relative h-full flex flex-col">
        <button
          onClick={() => setActiveMode('selection')}
          className="absolute top-2 left-2 z-10 bg-brand-card hover:bg-brand-surface text-text-light px-3 py-1 rounded-full text-sm font-semibold"
        >
          &larr; Voltar
        </button>
        <ExploreTab
          biomes={biomes}
          playerProgress={playerProgress}
          onStartGame={onStartGame}
        />
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full bg-brand-background">
      <h2 className="text-xl font-semibold text-text-light mb-6 text-center shrink-0">Modos de Jogo</h2>
      <div className="flex-grow overflow-y-auto custom-scrollbar -mr-2 pr-2">
        <div className="space-y-4">
          <GameModeCard
            icon="🗺️"
            title="Explorar Biomas"
            description="Aventure-se por diferentes terras e derrote chefes para coletar recompensas."
            onClick={() => setActiveMode('explore')}
          />
          <GameModeCard
            icon="🏟️"
            title="Coliseu"
            description="Enfrente outros jogadores em batalhas JxJ e suba no ranking."
            disabled
          />
          <GameModeCard
            icon="🗼"
            title="Torre da Sobrevivência"
            description="Suba andares de uma torre infinita enfrentando ondas de inimigos."
            disabled
          />
        </div>
      </div>
    </div>
  );
};

export default BattleTab;

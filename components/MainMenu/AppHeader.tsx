import React from 'react';

interface AppHeaderProps {
  gems: number;
  coins: number;
  kingImageUrl: string; // Prop still received but not used for the image itself
}

const AppHeader: React.FC<AppHeaderProps> = ({ gems, coins, kingImageUrl }) => {
  return (
    <div className="bg-brand-surface p-3 shadow-md">
      <div className="flex justify-between items-center mb-3">
        <div className="flex space-x-3">
          <div className="bg-brand-card text-text-light px-3 py-1 rounded-full text-sm flex items-center shadow-sm transition-all duration-200 ease-in-out hover:scale-105 hover:brightness-110">
            <span className="text-brand-accent mr-1.5 text-lg">💎</span> {gems}
          </div>
          <div className="bg-brand-card text-text-light px-3 py-1 rounded-full text-sm flex items-center shadow-sm transition-all duration-200 ease-in-out hover:scale-105 hover:brightness-110">
            <span className="text-brand-accent mr-1.5 text-lg">💰</span> {coins}
          </div>
        </div>
        {/* Placeholder for settings or other icons */}
        <div>
           {/* <button className="text-text-muted hover:text-text-light text-xl">⚙️</button> */}
        </div>
      </div>
      {/* The h-28 div that was here has been removed */}
    </div>
  );
};

export default AppHeader;
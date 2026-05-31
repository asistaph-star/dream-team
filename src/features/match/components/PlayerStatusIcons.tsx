import React from 'react';

interface PlayerStatusIconsProps {
  isHot: boolean;
  isCold: boolean;
}

export const PlayerStatusIcons: React.FC<PlayerStatusIconsProps> = ({
  isHot,
  isCold,
}) => {
  return (
    <>
      {isHot && <img src="/fire_emoji.png" alt="HOT" className="card-hot-icon" />}
      {isCold && <img src="/ice_emoji.png" alt="COLD" className="card-cold-icon" />}
    </>
  );
};

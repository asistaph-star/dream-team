import React from 'react';

interface FoulPipsProps {
  fouls: number;
}

export const FoulPips: React.FC<FoulPipsProps> = ({ fouls }) => {
  if (fouls === 0) return null;
  return (
    <div style={{ position: 'absolute', bottom: -10, left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: 2 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div 
          key={i} 
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: i < fouls ? (fouls >= 4 ? '#ef4444' : fouls >= 3 ? '#eab308' : '#f97316') : '#374151',
            border: '1px solid #1f2937',
            animation: fouls >= 4 && i < fouls ? 'pulse 1s infinite' : 'none',
          }} 
        />
      ))}
    </div>
  );
};

import React from 'react';
import tuiLogo from '../assets/tui logo.png';

function Logo({ size = 'small' }) {

  const sizes = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  return (
    <div className={`flex items-center justify-center ${sizes[size]}`}>
      <img 
        src={tuiLogo} 
        alt="TUI Logo" 
        
        className="w-full h-full rounded-full overflow-hidden object-cover border border-gray-100 shadow-sm" 
      />
    </div>
  );
}

export default Logo;
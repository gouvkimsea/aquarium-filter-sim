import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Initializing 3D Aquatic Environment...',
}) => {
  return (
    <div id="viewport-loading-screen" className="viewport-loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner-ring">
          <Loader2 className="animate-spin text-cyan-400" size={36} />
        </div>
        <p className="loading-text">{message}</p>
        <span className="loading-subtext">Compiling Three.js shaders & setting up cameras</span>
      </div>
    </div>
  );
};

import React from 'react';
import { Waves, Activity, Droplets, Maximize2 } from 'lucide-react';

export const Header: React.FC = () => {
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Error attempting to exit fullscreen:', err);
      });
    }
  };

  return (
    <header id="main-header" className="app-header">
      <div className="header-left">
        <div className="logo-badge">
          <Waves className="logo-icon" size={24} />
        </div>
        <div className="title-block">
          <h1 id="app-title" className="app-title">Aquarium Filter Simulator</h1>
          <span className="prototype-badge">3D Prototype v0.1.0</span>
        </div>
      </div>

      <div className="header-center">
        <div className="telemetry-pill" title="Filter Turnover Status">
          <Activity size={14} className="text-emerald-400" />
          <span>Stage: Mechanical + Bio + Chemical</span>
        </div>
        <div className="telemetry-pill" title="Current Modeled Flow Rate">
          <Droplets size={14} className="text-cyan-400" />
          <span>Simulated Flow: 150 GPH</span>
        </div>
      </div>

      <div className="header-right">
        <button
          id="fullscreen-toggle-btn"
          className="header-action-btn"
          onClick={toggleFullScreen}
          title="Toggle Fullscreen"
          aria-label="Toggle Fullscreen"
        >
          <Maximize2 size={16} />
        </button>

        <a
          id="github-repo-link"
          href="https://github.com/gouvkimsea/aquarium-filter-sim"
          target="_blank"
          rel="noreferrer"
          className="header-action-btn"
          title="View on GitHub"
          aria-label="View on GitHub"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      </div>
    </header>
  );
};

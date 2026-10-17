import React from 'react';
import { Cpu, MousePointer, CheckCircle, RotateCcw } from 'lucide-react';
import type { WebGLDiagnosticInfo } from '../../types/scene';

interface Props {
  diagnostic: WebGLDiagnosticInfo;
  onResetView: () => void;
}

export const StatusBar: React.FC<Props> = ({ diagnostic, onResetView }) => {
  return (
    <footer id="app-status-bar" className="status-bar">
      <div className="status-left">
        <div className="status-item" id="webgl-status-pill">
          <CheckCircle size={13} className="text-emerald-400" />
          <span>WebGL Acceleration: Active</span>
        </div>

        {diagnostic.renderer && (
          <div className="status-item gpu-info" title={diagnostic.renderer}>
            <Cpu size={13} className="text-cyan-400" />
            <span className="gpu-name-truncate">{diagnostic.renderer}</span>
          </div>
        )}
      </div>

      <div className="status-center">
        <div className="nav-hints">
          <MousePointer size={12} />
          <span>Left-Click: Rotate</span>
          <span className="divider">•</span>
          <span>Right-Click: Pan</span>
          <span className="divider">•</span>
          <span>Scroll: Zoom</span>
        </div>
      </div>

      <div className="status-right">
        <button
          id="reset-camera-btn"
          className="reset-view-btn"
          onClick={onResetView}
          title="Reset Camera to Default"
        >
          <RotateCcw size={12} />
          <span>Reset Camera</span>
        </button>
      </div>
    </footer>
  );
};

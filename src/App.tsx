import { useState, Suspense, useCallback } from 'react';
import { AquariumViewport } from './components/canvas/AquariumViewport';
import { Header } from './components/layout/Header';
import { ControlPanel } from './components/layout/ControlPanel';
import { StatusBar } from './components/layout/StatusBar';
import { WebGLErrorBoundary } from './components/common/WebGLErrorBoundary';
import { LoadingScreen } from './components/common/LoadingScreen';
import { useWebGLSupport } from './hooks/useWebGLSupport';
import type { SceneSettings } from './types/scene';
import './App.css';

export function App() {
  const diagnostic = useWebGLSupport();
  const [contextLost, setContextLost] = useState(false);

  const [settings, setSettings] = useState<SceneSettings>({
    wireframe: false,
    lightingPreset: 'daylight',
    showHelpers: false,
    waterOpacity: 0.35,
    cameraPreset: 'default',
  });

  const handleResetCamera = useCallback(() => {
    setSettings((prev) => ({ ...prev, cameraPreset: 'default' }));
  }, []);

  const handleContextLost = useCallback(() => {
    setContextLost(true);
  }, []);

  return (
    <div id="aquarium-app-root" className="app-container">
      {/* Top Application Header */}
      <Header />

      {/* Main 3D Viewport Shell with WebGL Capability Check & Error Handling */}
      <main id="main-viewport-shell" className="viewport-shell">
        <WebGLErrorBoundary
          fallbackMessage={
            !diagnostic.isSupported
              ? diagnostic.errorMessage
              : contextLost
                ? 'WebGL Context was lost. Your GPU or browser may have reset graphics memory.'
                : undefined
          }
        >
          <Suspense fallback={<LoadingScreen />}>
            <AquariumViewport
              settings={settings}
              onContextLost={handleContextLost}
            />
          </Suspense>
        </WebGLErrorBoundary>

        {/* Floating Glassmorphic Viewport Controls */}
        <ControlPanel
          settings={settings}
          onUpdateSettings={setSettings}
        />
      </main>

      {/* Bottom Status & Diagnostics Bar */}
      <StatusBar
        diagnostic={diagnostic}
        onResetView={handleResetCamera}
      />
    </div>
  );
}

export default App;

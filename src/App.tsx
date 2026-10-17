import { Suspense, useCallback, useState } from 'react';
import { EditorProvider } from './context/EditorContext';
import { TopToolbar } from './components/toolbar/TopToolbar';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { RightSidebar } from './components/sidebar/RightSidebar';
import { CADStatusBar } from './components/statusbar/CADStatusBar';
import { AquariumViewport } from './components/canvas/AquariumViewport';
import { WebGLErrorBoundary } from './components/common/WebGLErrorBoundary';
import { LoadingScreen } from './components/common/LoadingScreen';
import { useWebGLSupport } from './hooks/useWebGLSupport';
import './App.css';

function MainEditorShell() {
  const diagnostic = useWebGLSupport();
  const [contextLost, setContextLost] = useState(false);

  const handleContextLost = useCallback(() => {
    setContextLost(true);
  }, []);

  return (
    <div id="aquarium-editor-root" className="cad-app-container">
      {/* 1. Compact Top CAD Toolbar */}
      <TopToolbar />

      {/* 2. Main 3D Editor Workspace (Left Sidebar | Central Viewport | Right Sidebar) */}
      <div id="cad-editor-workspace" className="cad-workspace">
        {/* Left Sidebar: Component Library & Scene Hierarchy */}
        <LeftSidebar />

        {/* Central 3D Viewport */}
        <main id="cad-main-viewport" className="cad-viewport-center">
          <WebGLErrorBoundary
            fallbackMessage={
              !diagnostic.isSupported
                ? diagnostic.errorMessage
                : contextLost
                  ? 'WebGL Context was lost. Graphics device reset.'
                  : undefined
            }
          >
            <Suspense fallback={<LoadingScreen message="Initializing CAD Viewport..." />}>
              <AquariumViewport onContextLost={handleContextLost} />
            </Suspense>
          </WebGLErrorBoundary>
        </main>

        {/* Right Sidebar: Selected Object Properties Inspector */}
        <RightSidebar />
      </div>

      {/* 3. Small Status Bar */}
      <CADStatusBar />
    </div>
  );
}

export function App() {
  return (
    <EditorProvider>
      <MainEditorShell />
    </EditorProvider>
  );
}

export default App;

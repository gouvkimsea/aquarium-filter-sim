import { useState, useEffect } from 'react';
import type { WebGLDiagnosticInfo } from '../types/scene';

export function useWebGLSupport(): WebGLDiagnosticInfo {
  const [diagnostic, setDiagnostic] = useState<WebGLDiagnosticInfo>({
    isSupported: true,
  });

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      // Try WebGL2 first, then fallback to WebGL
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');

      if (!gl) {
        setDiagnostic({
          isSupported: false,
          errorMessage:
            'WebGL is not supported or is disabled in your browser. Please ensure hardware acceleration is enabled.',
        });
        return;
      }

      const glContext = gl as WebGLRenderingContext;
      const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo
        ? glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : glContext.getParameter(glContext.VENDOR);
      const renderer = debugInfo
        ? glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : glContext.getParameter(glContext.RENDERER);
      const version = glContext.getParameter(glContext.VERSION);

      setDiagnostic({
        isSupported: true,
        version: String(version),
        vendor: String(vendor),
        renderer: String(renderer),
      });
    } catch (err) {
      setDiagnostic({
        isSupported: false,
        errorMessage:
          err instanceof Error
            ? err.message
            : 'Unknown error occurred while checking WebGL support.',
      });
    }
  }, []);

  return diagnostic;
}

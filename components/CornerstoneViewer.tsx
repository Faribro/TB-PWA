'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers, AlertCircle, Loader2 } from 'lucide-react';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

interface CornerstoneViewerProps {
  fileUrl: string;
  authToken?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INITIALIZATION (Prevents Fast Refresh crashes)
// ═══════════════════════════════════════════════════════════════════════════
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function initCornerstone(authToken?: string): Promise<void> {
  // Return existing promise if initialization is in progress
  if (initializationPromise) return initializationPromise;
  
  // Skip if already initialized
  if (isInitialized) return Promise.resolve();

  initializationPromise = (async () => {
    try {
      console.log('[Cornerstone] Initializing singleton...');

      // Configure WADO Image Loader
      cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
      cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

      // Configure auth headers
      cornerstoneWADOImageLoader.configure({
        beforeSend: (xhr: XMLHttpRequest) => {
          if (authToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
          }
        },
      });

      // Initialize Web Workers for DICOM parsing with codec paths
      const config = {
        maxWebWorkers: navigator.hardwareConcurrency || 4,
        startWebWorkersOnDemand: true,
        taskConfiguration: {
          decodeTask: {
            initializeCodecsOnStartup: true,
            strict: false,
            codecsPath: '/codecs',
          },
        },
      };

      cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
      console.log('[Cornerstone] Web Workers initialized with codec support');

      // Initialize Cornerstone3D
      await cornerstone.init();

      // Initialize Cornerstone Tools (optional, for future tool integration)
      cornerstoneTools.init();

      isInitialized = true;
      console.log('[Cornerstone] Initialization complete');
    } catch (error) {
      console.error('[Cornerstone] Initialization failed:', error);
      initializationPromise = null; // Allow retry
      throw error;
    }
  })();

  return initializationPromise;
}

// ═══════════════════════════════════════════════════════════════════════════
// CORNERSTONE VIEWER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function CornerstoneViewer({ fileUrl, authToken }: CornerstoneViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const cleanupRef = useRef(false); // Prevent double cleanup

  useEffect(() => {
    if (!viewportRef.current || !fileUrl) return;

    let renderingEngine: cornerstone.Types.IRenderingEngine | null = null;
    let viewportId: string | null = null;
    cleanupRef.current = false;

    async function setupViewer() {
      try {
        setStatus('loading');
        setErrorMessage('');

        // Step 1: Initialize Cornerstone (singleton)
        await initCornerstone(authToken);

        if (!viewportRef.current) {
          throw new Error('Viewport element unmounted during initialization');
        }

        // Step 2: Create unique IDs
        const renderingEngineId = `cornerstoneEngine_${Date.now()}`;
        viewportId = `stackViewport_${Date.now()}`;

        // Step 3: Create Rendering Engine
        renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

        // Step 4: Define viewport input
        const viewportInput: cornerstone.Types.PublicViewportInput = {
          viewportId,
          type: cornerstone.Enums.ViewportType.STACK,
          element: viewportRef.current,
          defaultOptions: {
            background: [0, 0, 0] as cornerstone.Types.Point3, // Black background
          },
        };

        // Step 5: Enable the viewport
        renderingEngine.enableElement(viewportInput);

        // Step 6: Get the viewport instance
        const viewport = renderingEngine.getViewport(viewportId) as cornerstone.Types.IStackViewport;

        if (!viewport) {
          throw new Error('Failed to create viewport instance');
        }

        // Step 7: Prepare image ID with wadouri prefix
        const imageId = `wadouri:${fileUrl}`;
        console.log('[Cornerstone] Loading image:', imageId);
        console.log('[Cornerstone] Auth token present:', !!authToken);

        // Step 8: Set the stack (single image for now)
        await viewport.setStack([imageId]);
        console.log('[Cornerstone] Stack set successfully');

        // Step 9: Apply default window/level (lung-friendly defaults)
        viewport.setProperties({ 
          voiRange: { upper: 2000, lower: -500 } 
        });
        console.log('[Cornerstone] Applied default VOI range');

        // Step 10: Initial render
        viewport.render();
        console.log('[Cornerstone] Initial render complete');
        
        // Step 11: Force resize with delay to ensure canvas fills properly
        setTimeout(() => {
          if (renderingEngine && viewportId) {
            renderingEngine.resize(true);
            const vp = renderingEngine.getViewport(viewportId);
            if (vp) {
              vp.render();
              console.log('[Cornerstone] Delayed resize and re-render complete');
            }
          }
        }, 100);

        setStatus('ready');
        console.log('[Cornerstone] Image rendered successfully');
      } catch (error: any) {
        console.error('[Cornerstone] Setup failed:', error);
        setStatus('error');
        setErrorMessage(error?.message || 'Failed to load DICOM image');
      }
    }

    setupViewer();

    // ═══════════════════════════════════════════════════════════════════════════
    // CLEANUP (Memory Safety)
    // ═══════════════════════════════════════════════════════════════════════════
    return () => {
      if (cleanupRef.current) return; // Already cleaned up
      cleanupRef.current = true;
      
      try {
        if (renderingEngine && viewportId) {
          console.log('[Cornerstone] Cleaning up viewport:', viewportId);
          renderingEngine.disableElement(viewportId);
          renderingEngine.destroy();
        }
      } catch (error) {
        // Silently ignore cleanup errors in development (React StrictMode double-mount)
        console.warn('[Cornerstone] Cleanup warning (safe to ignore in dev):', error);
      }
    };
  }, [fileUrl, authToken]);

  return (
    <div className="w-full h-full relative bg-black">
      {/* Viewport Canvas */}
      <div
        ref={viewportRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Loading Overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-white font-bold text-sm">Loading DICOM image...</p>
            <p className="text-slate-400 text-xs mt-1">Initializing medical engine</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center px-8">
            <div className="inline-block p-6 bg-red-500/10 border border-red-500/20 rounded-3xl mb-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Failed to Load DICOM</h3>
            <p className="text-red-400 font-bold text-sm mb-4 max-w-md">{errorMessage}</p>
            <div className="text-left bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-w-md">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Debug Info</p>
              <p className="text-xs text-slate-300 font-mono break-all">{fileUrl}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Indicator (fades out after 2s) */}
      {status === 'ready' && (
        <div className="absolute top-4 right-4 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl backdrop-blur-xl animate-pulse z-10">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
            ✓ DICOM Loaded
          </p>
        </div>
      )}
    </div>
  );
}

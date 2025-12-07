import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Toolbar, type ToolType } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { HelpModal } from './components/HelpModal';
import { GRID_W, GRID_H, PIXEL_SIZE } from './constants';
import { createEmptyGrid, cloneGrid, floodFill, type GridData } from './utils/grid';
import type { CameraState } from './utils/geometry';
import { createTextStamp, processImageStamp, type StampBuffer } from './utils/stamp';
import { generateBlueprintData } from './utils/blueprint';

function App() {

  // --- State ---
  // const [gridData] = useState<GridData>(() => createEmptyGrid(GRID_W, GRID_H));
  // We use a mutable ref for the grid to avoid React renders on every pixel change,
  // but we pass the *same* array instance to Canvas. Canvas RAF loop sees changes.
  // Undo/Redo needs to replace the array content or update the ref.
  // Actually, if we replace the array, we need to signal Canvas.
  // Let's use a Ref for the "active" grid, and only useState for things that change UI.
  // But wait, Canvas takes `gridData` as prop. If I change the content of the array, it works.
  // If I load a new array (Undo), I need to update the prop.
  // So:
  const gridRef = useRef<GridData>(createEmptyGrid(GRID_W, GRID_H));
  const [, setTick] = useState(0); // Force render

  const [camera, setCamera] = useState<CameraState>(() => ({
    x: (GRID_W * PIXEL_SIZE) / 2,
    y: (GRID_H * PIXEL_SIZE) / 2,
    zoom: 0.8
  }));

  const [tool, setTool] = useState<ToolType>('brush');
  const [color, setColor] = useState('#ffffff');

  // History
  const historyRef = useRef<GridData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveHistory = useCallback(() => {
    const snapshot = cloneGrid(gridRef.current);
    const newHistory = historyRef.current.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > 20) newHistory.shift();
    historyRef.current = newHistory;
    setHistoryIndex(newHistory.length - 1);
  }, [historyIndex]);

  // Initial Save
  useEffect(() => {
    if (historyIndex === -1 && historyRef.current.length === 0) {
      saveHistory();
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const snapshot = historyRef.current[newIdx];
      // Restore
      // We must copy back to our mutable grid OR update the ref and force render
      gridRef.current = cloneGrid(snapshot);
      setHistoryIndex(newIdx);
      setTick(t => t + 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < historyRef.current.length - 1) {
      const newIdx = historyIndex + 1;
      const snapshot = historyRef.current[newIdx];
      gridRef.current = cloneGrid(snapshot);
      setHistoryIndex(newIdx);
      setTick(t => t + 1);
    }
  }, [historyIndex]);

  // Stamps
  const [stampMode, setStampMode] = useState<'text' | 'image' | null>(null);
  const [stampBuffer, setStampBuffer] = useState<StampBuffer | null>(null);
  const [stampScale, setStampScale] = useState(1);

  const handleTextStamp = async (text: string) => {
    const buffer = await createTextStamp(text, color);
    if (buffer) {
      setStampBuffer(buffer);
      setStampMode('text');
      setStampScale(1);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const { buffer } = await processImageStamp(e.target.files[0]);
        setStampBuffer(buffer);
        setStampMode('image');
        setStampScale(1);
      } catch (err) {
        console.error(err);
      }
      e.target.value = "";
    }
  };

  // Paste support
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const { buffer } = await processImageStamp(blob);
            setStampBuffer(buffer);
            setStampMode('image');
            setStampScale(1);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Power & Blueprint
  const [autoPole, setAutoPole] = useState(false);
  const [poleType, setPoleType] = useState("medium-electric-pole");
  const [qualityIdx, setQualityIdx] = useState(0);

  const copyBlueprint = () => {
    const { bpString, status } = generateBlueprintData(gridRef.current, GRID_W, GRID_H, poleType, qualityIdx, autoPole);
    if (bpString) {
      navigator.clipboard.writeText(bpString).then(() => {
        setStatusMsg("Blueprint Copied!");
        setTimeout(() => setStatusMsg(""), 3000);
      });
    } else {
      alert(status);
    }
  };

  // Interactions
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const camStart = useRef({ x: 0, y: 0 });

  const onInteractStart = (e: React.MouseEvent | React.TouchEvent, x: number, y: number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const button = 'button' in e ? e.button : 0;

    if (button === 2 || tool === 'pan') {
      setIsPanning(true);
      panStart.current = { x: clientX, y: clientY };
      camStart.current = { ...camera };
      return;
    }

    if (stampMode && stampBuffer) {
      // wait for up? or click? 
      // Original: Click to paint.
      commitStamp(x, y);
      return;
    }

    if (tool === 'fill') {
      const newGrid = floodFill(gridRef.current, x, y, color, GRID_W, GRID_H);
      if (newGrid !== gridRef.current) {
        gridRef.current = newGrid;
        saveHistory();
        setTick(t => t + 1);
      }
    } else {
      // Brush / Erase
      draw(x, y);
    }
  };

  const draw = (x: number, y: number) => {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;
    const t = tool === 'erase' ? null : color;
    if (gridRef.current[y][x] !== t) {
      gridRef.current[y][x] = t;
      // We don't need to setTick here because mutating ref + Canvas RAF handles it visually.
      // But we need to know we Changed something to save history on MouseUp.
      changedRef.current = true;
    }
  };

  const changedRef = useRef(false);

  const onInteractMove = (e: React.MouseEvent | React.TouchEvent, x: number, y: number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (isPanning) {
      const dx = (clientX - panStart.current.x) / camera.zoom;
      const dy = (clientY - panStart.current.y) / camera.zoom;
      setCamera({
        ...camera,
        x: camStart.current.x - dx,
        y: camStart.current.y - dy
      });
      return;
    }

    if (stampMode) return; // Ghost is handled by Canvas render loop

    // If mouse is down (buttons=1 for left click)
    // If mouse is down (buttons=1 for left click)
    // const buttons = 'buttons' in e ? e.buttons : 1;
    // Actually Pointer Events are better but we use Mouse/Touch.
    // For MouseEvent: buttons===1. For Touch, we only get move if touching.

    const isDown = (e.nativeEvent instanceof MouseEvent) ? (e.nativeEvent.buttons === 1) : true;

    if (isDown && (tool === 'brush' || tool === 'erase')) {
      draw(x, y);
    }
  };

  const onInteractEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (changedRef.current) {
      saveHistory();
      changedRef.current = false;
    }
  };

  const commitStamp = (cx: number, cy: number) => {
    if (!stampBuffer) return;

    const drawW = stampMode === 'text' ? stampBuffer.w * stampScale : stampBuffer.w;
    const drawH = stampMode === 'text' ? stampBuffer.h * stampScale : stampBuffer.h;
    // Image scaling logic might differ, for now sticking to simple.

    // Center
    const startX = cx - Math.floor(drawW / 2);
    const startY = cy - Math.floor(drawH / 2);

    let changed = false;

    const renderScale = stampMode === 'text' ? stampScale : 1;
    // Note: original image stamp didn't scale well in logic, let's just assume 1:1 for image if processing was done.

    for (let sy = 0; sy < stampBuffer.h; sy++) {
      for (let sx = 0; sx < stampBuffer.w; sx++) {
        const col = stampBuffer.data[sy][sx];
        if (col) {
          // For text, scale pixels
          for (let dy = 0; dy < renderScale; dy++) {
            for (let dx = 0; dx < renderScale; dx++) {
              const gx = startX + sx * renderScale + dx;
              const gy = startY + sy * renderScale + dy;
              if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
                gridRef.current[gy][gx] = col;
                changed = true;
              }
            }
          }
        }
      }
    }

    if (changed) {
      saveHistory();
      setTick(t => t + 1);
    }

    setStampMode(null);
    setStampBuffer(null);
  };

  const handleZoomKey = useCallback((e: KeyboardEvent) => {
    if (stampMode) {
      if (e.key === "+" || e.key === "=") {
        setStampScale(s => s + 1); // Only text uses integer scale efficiently? Original used float for images.
      }
      if (e.key === "-" || e.key === "_") {
        setStampScale(s => Math.max(1, s - 1));
      }
      if (e.key === "Escape") {
        setStampMode(null);
        setStampBuffer(null);
      }
    } else {
      if (e.key.toLowerCase() === 'h') setTool('pan');
      if (e.key.toLowerCase() === 'b') setTool('brush');
      if (e.key.toLowerCase() === 'f') setTool('fill');
      if (e.key.toLowerCase() === 'e') setTool('erase');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo(); else undo();
      }
    }
  }, [stampMode, undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleZoomKey);
    return () => window.removeEventListener('keydown', handleZoomKey);
  }, [handleZoomKey]);

  // Coords
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [statusMsg, setStatusMsg] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        try {
          const { buffer } = await processImageStamp(file);
          setStampBuffer(buffer);
          setStampMode('image');
          setStampScale(1);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }, []);

  return (
    <div
      className="flex flex-col h-screen bg-gray-900 text-gray-300 font-sans"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Header onToggleHelp={() => setShowHelp(true)} />

      <main className="flex-1 overflow-hidden relative w-full flex flex-col md:flex-row">
        <div id="view-draw" className="absolute inset-0 flex flex-col md:flex-row w-full h-full">

          {/* Canvas Area */}
          <main className="flex-1 flex flex-col relative bg-gray-950 order-1 md:order-2 h-[60vh] md:h-auto overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={copyBlueprint}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg shadow-lg text-xs md:text-sm flex items-center gap-2 transition-transform hover:-translate-y-0.5 active:scale-95 border border-yellow-400/20 backdrop-blur-sm opacity-90 hover:opacity-100"
              >
                📋 <span className="hidden sm:inline">Copy Blueprint</span>
              </button>
            </div>

            {stampMode && (
              <div className="absolute top-4 left-4 z-10 bg-blue-600/90 backdrop-blur text-white px-3 py-1.5 rounded-lg shadow-lg text-[10px] md:text-xs font-bold border border-blue-400/30 flex items-center gap-2 pointer-events-none">
                🎯 <span>Click to Stamp</span>
              </div>
            )}

            <Canvas
              gridData={gridRef.current}
              camera={camera}
              setCamera={setCamera}
              onInteractStart={onInteractStart}
              onInteractMove={onInteractMove}
              onInteractEnd={onInteractEnd}
              stampMode={stampMode}
              stampBuffer={stampBuffer}
              stampScale={stampScale}
              autoPole={autoPole}
              poleType={poleType}
              qualityIdx={qualityIdx}
              onHover={(x, y) => setCoords({ x, y })}
            />

            <div className="h-6 md:h-8 bg-gray-900 border-t border-gray-800 flex items-center px-4 md:px-6 text-[10px] text-gray-500 justify-between shrink-0 font-mono">
              <span className="opacity-70">X: {coords.x} Y: {coords.y}</span>
              <span className={`font-bold opacity-70 ${statusMsg ? 'text-green-400' : ''}`}>{statusMsg || "READY"}</span>
            </div>
          </main>

          <Toolbar
            currentTool={tool} setTool={setTool}
            color={color} setColor={setColor}
            onUndo={undo} onRedo={redo}
            renderTextStamp={handleTextStamp}
            onImageUpload={handleImageUpload}
            autoPole={autoPole} setAutoPole={setAutoPole}
            poleType={poleType} setPoleType={setPoleType}
            qualityIdx={qualityIdx} setQualityIdx={setQualityIdx}
            isDragging={isDragging}
          />

        </div>
      </main>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;

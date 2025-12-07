import React, { useRef, useEffect, useCallback } from 'react';
import type { CameraState } from '../utils/geometry';
import { getWorldCoords } from '../utils/geometry';
import type { GridData } from '../utils/grid';
import { PIXEL_SIZE, GRID_W, GRID_H, POLE_DATA } from '../constants';
import type { StampBuffer } from '../utils/stamp';
import { calculateActivePoles } from '../utils/blueprint';

interface CanvasProps {
    gridData: GridData;
    camera: CameraState;
    setCamera: (c: CameraState) => void;

    // Interactions
    onInteractStart: (e: React.MouseEvent | React.TouchEvent, x: number, y: number) => void;
    onInteractMove: (e: React.MouseEvent | React.TouchEvent, x: number, y: number) => void;
    onInteractEnd: (e: React.MouseEvent | React.TouchEvent) => void;

    // Visuals
    stampMode: 'text' | 'image' | null;
    stampBuffer: StampBuffer | null;
    stampScale: number;

    autoPole: boolean;
    poleType: string;
    qualityIdx: number;

    // Coordinates display
    onHover: (x: number, y: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    gridData, camera, setCamera,
    onInteractStart, onInteractMove, onInteractEnd,
    stampMode, stampBuffer, stampScale,
    autoPole, poleType, qualityIdx,
    onHover
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // const requestRef = useRef<number>();

    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3.0;

    // Render Logic
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { alpha: false });
        if (!canvas || !ctx || !containerRef.current) return;

        const vw = containerRef.current.clientWidth;
        const vh = containerRef.current.clientHeight;

        if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
        }

        const w = canvas.width;
        const h = canvas.height;

        // 1. Background
        ctx.fillStyle = "#111827";
        ctx.fillRect(0, 0, w, h);

        ctx.save();

        // 2. Camera
        ctx.translate(w / 2, h / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        // 3. Culling Bounds
        // Screen Rect: (0,0) to (w,h)
        // World = (Screen - Center) / Zoom + Camera
        const worldL = (0 - w / 2) / camera.zoom + camera.x;
        const worldR = (w - w / 2) / camera.zoom + camera.x;
        const worldT = (0 - h / 2) / camera.zoom + camera.y;
        const worldB = (h - h / 2) / camera.zoom + camera.y;

        const minTileX = Math.max(0, Math.floor(worldL / PIXEL_SIZE));
        const maxTileX = Math.min(GRID_W - 1, Math.floor(worldR / PIXEL_SIZE) + 1);
        const minTileY = Math.max(0, Math.floor(worldT / PIXEL_SIZE));
        const maxTileY = Math.min(GRID_H - 1, Math.floor(worldB / PIXEL_SIZE) + 1);

        // 4. Grid Lines
        ctx.lineWidth = 1;

        // Chunk Lines (32)
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 2 / camera.zoom;
        ctx.beginPath();
        const startChunkX = Math.floor(minTileX / 32) * 32;
        for (let x = startChunkX; x <= maxTileX; x += 32) {
            ctx.moveTo(x * PIXEL_SIZE, minTileY * PIXEL_SIZE);
            ctx.lineTo(x * PIXEL_SIZE, (maxTileY + 1) * PIXEL_SIZE);
        }
        const startChunkY = Math.floor(minTileY / 32) * 32;
        for (let y = startChunkY; y <= maxTileY; y += 32) {
            ctx.moveTo(minTileX * PIXEL_SIZE, y * PIXEL_SIZE);
            ctx.lineTo((maxTileX + 1) * PIXEL_SIZE, y * PIXEL_SIZE);
        }
        ctx.stroke();

        // Detailed Grid
        if (camera.zoom > 0.3) {
            ctx.strokeStyle = "#1f2937";
            ctx.lineWidth = 1 / camera.zoom;
            ctx.beginPath();
            for (let x = minTileX; x <= maxTileX; x++) {
                if (x % 32 === 0) continue;
                ctx.moveTo(x * PIXEL_SIZE, minTileY * PIXEL_SIZE);
                ctx.lineTo(x * PIXEL_SIZE, (maxTileY + 1) * PIXEL_SIZE);
            }
            for (let y = minTileY; y <= maxTileY; y++) {
                if (y % 32 === 0) continue;
                ctx.moveTo(minTileX * PIXEL_SIZE, y * PIXEL_SIZE);
                ctx.lineTo((maxTileX + 1) * PIXEL_SIZE, y * PIXEL_SIZE);
            }
            ctx.stroke();
        }

        // 5. Active Pixels
        for (let y = minTileY; y <= maxTileY; y++) {
            for (let x = minTileX; x <= maxTileX; x++) {
                const color = gridData[y][x];
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        x * PIXEL_SIZE + 0.5,
                        y * PIXEL_SIZE + 0.5,
                        PIXEL_SIZE - 1,
                        PIXEL_SIZE - 1
                    );
                }
            }
        }

        // 6. Stamp Preview
        if (stampMode && stampBuffer && lastMousePos.current) {
            const worldPos = getWorldCoords(lastMousePos.current.x, lastMousePos.current.y, canvas.getBoundingClientRect(), camera, w, h);
            const cx = Math.floor(worldPos.x / PIXEL_SIZE);
            const cy = Math.floor(worldPos.y / PIXEL_SIZE);

            let renderScale = 1;
            let drawW = stampBuffer.w;
            let drawH = stampBuffer.h;

            if (stampMode === 'text') {
                renderScale = stampScale;
                drawW = stampBuffer.w * renderScale;
                drawH = stampBuffer.h * renderScale;
            }
            // For image, we assume buffer is already scaled? 
            // Logic in original: processImageFile sets stampScale=1. 
            // Resizing image stamp: `refreshStampBuffer` uses `stampScale` to resize the canvas source.

            const startX = cx - Math.floor(drawW / 2);
            const startY = cy - Math.floor(drawH / 2);

            ctx.globalAlpha = 0.5;
            for (let sy = 0; sy < stampBuffer.h; sy++) {
                for (let sx = 0; sx < stampBuffer.w; sx++) {
                    const col = stampBuffer.data[sy][sx];
                    if (col) {
                        const originX = startX + (sx * renderScale);
                        const originY = startY + (sy * renderScale);
                        if (originX > maxTileX || originX + renderScale < minTileX) continue;
                        if (originY > maxTileY || originY + renderScale < minTileY) continue;

                        ctx.fillStyle = col;
                        ctx.fillRect(originX * PIXEL_SIZE, originY * PIXEL_SIZE, PIXEL_SIZE * renderScale, PIXEL_SIZE * renderScale);
                    }
                }
            }
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2 / camera.zoom;
            ctx.strokeRect(startX * PIXEL_SIZE, startY * PIXEL_SIZE, drawW * PIXEL_SIZE, drawH * PIXEL_SIZE);
        }

        // 7. Auto Poles
        if (autoPole) {
            const data = POLE_DATA[poleType];
            const poles = calculateActivePoles(poleType, qualityIdx, minTileX, minTileY, maxTileX, maxTileY, gridData, GRID_W, GRID_H);
            const size = data.size;
            const coverage = data.supply[qualityIdx];

            poles.forEach(p => {
                const x = p.x;
                const y = p.y;
                ctx.strokeStyle = "#3b82f6";
                ctx.lineWidth = 2 / camera.zoom;
                ctx.strokeRect(x * PIXEL_SIZE + 1, y * PIXEL_SIZE + 1, size * PIXEL_SIZE - 2, size * PIXEL_SIZE - 2);

                ctx.lineWidth = 1 / camera.zoom;
                ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
                const supplyX = x + size / 2 - coverage / 2;
                const supplyY = y + size / 2 - coverage / 2;
                ctx.strokeRect(supplyX * PIXEL_SIZE, supplyY * PIXEL_SIZE, coverage * PIXEL_SIZE, coverage * PIXEL_SIZE);
                ctx.setLineDash([]);
            });
        }

        ctx.restore();

    }, [gridData, camera, stampMode, stampBuffer, stampScale, autoPole, poleType, qualityIdx]);

    // Animation Loop
    useEffect(() => {
        let handle: number;
        const loop = () => {
            render();
            handle = requestAnimationFrame(loop);
        }
        handle = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(handle);
    }, [render]);


    // Interactivity
    const lastMousePos = useRef<{ x: number, y: number } | null>(null);

    const handleWheel = (e: React.WheelEvent) => {
        if (stampMode) return; // Parent handles stamp resize? Or we handle it?
        // Let's stop propagation if we handle zoom
        if (!stampMode) {
            e.stopPropagation();
            // Zoom logic
            const delta = e.deltaY < 0 ? 1 : -1;
            const zoomIntensity = 0.1;
            const newZoom = Math.min(Math.max(MIN_ZOOM, camera.zoom + (delta * zoomIntensity * camera.zoom)), MAX_ZOOM);

            if (newZoom !== camera.zoom) {
                const rect = canvasRef.current!.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const w = canvasRef.current!.width;
                const h = canvasRef.current!.height;

                // World before zoom
                const worldBeforeX = (mouseX - w / 2) / camera.zoom + camera.x;
                const worldBeforeY = (mouseY - h / 2) / camera.zoom + camera.y;

                const newX = worldBeforeX - (mouseX - w / 2) / newZoom;
                const newY = worldBeforeY - (mouseY - h / 2) / newZoom;

                setCamera({ x: newX, y: newY, zoom: newZoom });
            }
        }
    };

    // Mouse Event Wrappers


    const onMouseMove = (e: React.MouseEvent) => {
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const world = getWorldCoords(e.clientX, e.clientY, rect, camera, canvasRef.current!.width, canvasRef.current!.height);
            const gx = Math.floor(world.x / PIXEL_SIZE);
            const gy = Math.floor(world.y / PIXEL_SIZE);
            onHover(gx, gy);

            onInteractMove(e, gx, gy);
        }
    };

    const onMouseDown = (e: React.MouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const world = getWorldCoords(e.clientX, e.clientY, rect, camera, canvasRef.current!.width, canvasRef.current!.height);
        onInteractStart(e, Math.floor(world.x / PIXEL_SIZE), Math.floor(world.y / PIXEL_SIZE));
    };

    return (
        <div
            ref={containerRef}
            className="relative flex-1 bg-[#0d0e12] touch-none w-full h-full cursor-crosshair overflow-hidden"
        >
            <canvas
                ref={canvasRef}
                className="block w-full h-full outline-none"
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onInteractEnd}
                onMouseLeave={onInteractEnd}
                onWheel={handleWheel}
                // Touch
                onTouchStart={(e) => {
                    const t = e.touches[0];
                    const rect = canvasRef.current!.getBoundingClientRect();
                    const world = getWorldCoords(t.clientX, t.clientY, rect, camera, canvasRef.current!.width, canvasRef.current!.height);
                    onInteractStart(e, Math.floor(world.x / PIXEL_SIZE), Math.floor(world.y / PIXEL_SIZE));
                }}
                onTouchMove={(e) => {
                    const t = e.touches[0];
                    lastMousePos.current = { x: t.clientX, y: t.clientY };
                    const rect = canvasRef.current!.getBoundingClientRect();
                    const world = getWorldCoords(t.clientX, t.clientY, rect, camera, canvasRef.current!.width, canvasRef.current!.height);
                    onHover(Math.floor(world.x / PIXEL_SIZE), Math.floor(world.y / PIXEL_SIZE));
                    onInteractMove(e, Math.floor(world.x / PIXEL_SIZE), Math.floor(world.y / PIXEL_SIZE));
                }}
                onTouchEnd={onInteractEnd}
            />
        </div>
    );
};

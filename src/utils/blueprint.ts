import pako from "pako";
import type { GridData } from "./grid";
import { POLE_DATA, QUALITY_NAMES } from "../constants";

export interface BlueprintEntity {
    entity_number: number;
    name: string;
    position: { x: number; y: number };
    color?: { r: number; g: number; b: number; a: number };
    always_on?: boolean;
    quality?: string;
    neighbours?: number[];
}

export interface BlueprintJson {
    blueprint: {
        item: string;
        label: string;
        entities: BlueprintEntity[];
        icons: { signal: { type: string; name: string }; index: number }[];
        version: number;
    };
}

export function hexToRgb(hex: string) {
    const bigint = parseInt(hex.replace("#", ""), 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

export function encodeBlueprint(blueprintJson: BlueprintJson): string | null {
    try {
        const jsonString = JSON.stringify(blueprintJson);
        const utf8Encoder = new TextEncoder();
        const jsonBytes = utf8Encoder.encode(jsonString);
        const compressed = pako.deflate(jsonBytes, { level: 9 });
        // Convert Uint8Array to binary string for btoa
        let binary = '';
        const len = compressed.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(compressed[i]);
        }
        return "0" + btoa(binary);
    } catch (e) {
        console.error(e);
        return null;
    }
}

export interface ActivePole {
    x: number;
    y: number;
    id: number; // temp index
    group: number;
    neighbours?: number[]; // indices in activePoles array
    entity_number?: number;
}

export function calculateActivePoles(
    type: string,
    qualityIdx: number,
    boundsMinX: number,
    boundsMinY: number,
    boundsMaxX: number,
    boundsMaxY: number,
    gridData: GridData,
    gridW: number,
    gridH: number
): ActivePole[] {
    const data = POLE_DATA[type];
    const coverage = data.supply[qualityIdx];
    const reach = data.wire[qualityIdx];
    const offset = Math.floor((coverage - 1) / 2);

    const margin = coverage + 5;
    const searchMinX = Math.max(0, boundsMinX - margin);
    const searchMaxX = Math.min(gridW, boundsMaxX + margin);
    const searchMinY = Math.max(0, boundsMinY - margin);
    const searchMaxY = Math.min(gridH, boundsMaxY + margin);

    const areaHasLamp = (px: number, py: number, w: number, h: number) => {
        const sx = Math.max(0, px);
        const sy = Math.max(0, py);
        const ex = Math.min(gridW, px + w);
        const ey = Math.min(gridH, py + h);
        for (let y = sy; y < ey; y++) {
            for (let x = sx; x < ex; x++) {
                if (gridData[y][x]) return true;
            }
        }
        return false;
    };

    const activePoles: ActivePole[] = [];

    const startX = Math.floor((searchMinX) / coverage) * coverage + offset;
    const startY = Math.floor((searchMinY) / coverage) * coverage + offset;

    for (let y = startY; y <= searchMaxY; y += coverage) {
        for (let x = startX; x <= searchMaxX; x += coverage) {
            if (areaHasLamp(x - offset, y - offset, coverage, coverage)) {
                activePoles.push({ x, y, id: activePoles.length, group: activePoles.length });
            }
        }
    }

    if (activePoles.length === 0) return [];

    // Connectivity Graph
    let groups: ActivePole[][] = [];
    activePoles.forEach(p => {
        p.group = groups.length;
        groups.push([p]);
    });

    const findGroup = (pole: ActivePole) => {
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].includes(pole)) return i;
        }
        return -1;
    };

    for (let i = 0; i < activePoles.length; i++) {
        for (let j = i + 1; j < activePoles.length; j++) {
            const p1 = activePoles[i];
            const p2 = activePoles[j];
            const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            if (dist <= reach) {
                const g1 = findGroup(p1);
                const g2 = findGroup(p2);
                if (g1 !== g2) {
                    const merged = groups[g1].concat(groups[g2]);
                    groups[g2] = [];
                    groups[g1] = merged;
                }
            }
        }
    }
    groups = groups.filter(g => g.length > 0);

    while (groups.length > 1) {
        let minD = Infinity;
        let bestPair: { p1: ActivePole, p2: ActivePole } | null = null;
        let bestG1 = -1;
        let bestG2 = -1;

        for (let i = 0; i < groups.length; i++) {
            for (let j = i + 1; j < groups.length; j++) {
                for (let p1 of groups[i]) {
                    for (let p2 of groups[j]) {
                        const d = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
                        if (d < minD) {
                            minD = d;
                            bestPair = { p1, p2 };
                            bestG1 = i;
                            bestG2 = j;
                        }
                    }
                }
            }
        }

        if (!bestPair) break;

        const start = bestPair.p1;
        const end = bestPair.p2;
        const step = reach;

        let cx = start.x;
        let cy = start.y;

        const bridgePoles: { x: number, y: number }[] = [];

        while (Math.abs(cx - end.x) > step) {
            cx += Math.sign(end.x - cx) * step;
            bridgePoles.push({ x: cx, y: cy });
        }
        cx = end.x;
        while (Math.abs(cy - end.y) > step) {
            cy += Math.sign(end.y - cy) * step;
            bridgePoles.push({ x: cx, y: cy });
        }

        bridgePoles.forEach(bp => {
            if (!activePoles.some(ap => ap.x === bp.x && ap.y === bp.y)) {
                const newPole: ActivePole = { x: bp.x, y: bp.y, id: -1, group: -1 }; // temporary ID
                activePoles.push(newPole);
                groups[bestG1].push(newPole);
            }
        });

        groups[bestG1] = groups[bestG1].concat(groups[bestG2]);
        groups.splice(bestG2, 1);
    }

    return activePoles;
}

export function calculateSmartPoles(
    type: string,
    qualityIdx: number,
    boundsMinX: number,
    boundsMinY: number,
    boundsMaxX: number,
    boundsMaxY: number,
    gridData: GridData,
    gridW: number,
    gridH: number
): ActivePole[] {
    const data = POLE_DATA[type];
    const coverage = data.supply[qualityIdx]; // Width/Height of supply area
    const offset = Math.floor((coverage - 1) / 2); // Center offset
    // const reach = data.wire[qualityIdx]; // Not used for placement, only for wiring later

    // 1. Identify all pixels that need coverage
    // detailedPixels: {x, y, covered}
    const pixels: { x: number, y: number, covered: boolean }[] = [];
    const pixelSet = new Set<string>();

    for (let y = boundsMinY; y <= boundsMaxY; y++) {
        for (let x = boundsMinX; x <= boundsMaxX; x++) {
            if (gridData[y][x]) {
                pixels.push({ x, y, covered: false });
                pixelSet.add(`${x},${y}`);
            }
        }
    }

    if (pixels.length === 0) return [];

    const activePoles: ActivePole[] = [];
    let uncoveredCount = pixels.length;

    // 2. Generate Candidate Positions
    // A candidate is valid if it covers at least one pixel.
    // Optimization: Only consider positions that are "centered" relative to some pixel?
    // Or just iterate every possible top-left position that could cover a pixel?
    // A pole at (px, py) covers [px, px+size-1] x [py, py+size-1] physical footprint
    // Supply area is larger: [px + size/2 - cov/2, ...]
    // Let's us Supply Area Top-Left (sx, sy) as the main coordinate for simplicity iterate.
    // Supply Rect: [sx, sy, coverage, coverage]
    // The pole entity is at:
    // PoleX = sx + coverage/2 - size/2
    // PoleY = sy + coverage/2 - size/2
    // We want Integer coords.
    // Let's iterate candidates based on the grid of the bounding box extended by coverage.

    // Better selection of candidates:
    // For every pixel `p`, a pole covers it if the pole's supply rect contains `p`.
    // Supply Rect (sx, sy) contains (px, py) iff sx <= px < sx + coverage AND sy <= py < sy + coverage
    // So sx in (px - coverage + 1, px)
    // We can collect all "useful" candidate Supply Rect Top-Lefts.

    const candidateScores = new Map<string, { sx: number, sy: number, cost: number, covers: number[] }>();

    // Helper to get ID
    const cId = (sx: number, sy: number) => `${sx},${sy}`;

    // For every pixel, generate potential candidates that cover it
    for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        // Possible supply top-lefts that cover this pixel
        const startSX = p.x - coverage + 1;
        const startSY = p.y - coverage + 1;
        // We iterate all valid top-lefts for supply area
        for (let sy = startSY; sy <= p.y; sy++) {
            for (let sx = startSX; sx <= p.x; sx++) {
                // Bounds check (optional, but good to keep poles somewhat in bounds)
                // if (sx < 0 || sy < 0 || sx >= gridW || sy >= gridH) continue; 
                // Actually supply area can be anywhere, but pole entity must be essentially "valid"

                const id = cId(sx, sy);
                if (!candidateScores.has(id)) {
                    // Calculate Cost
                    // Real Pole Position
                    // supply center = sx + coverage/2
                    // pole top-left = supply center - size/2
                    const realX = Math.round(sx + coverage / 2 - data.size / 2);
                    const realY = Math.round(sy + coverage / 2 - data.size / 2);

                    let cost = 1.0;
                    // Check overlap with image (Soft Constraint)
                    let overlaps = false;
                    for (let py = 0; py < data.size; py++) {
                        for (let px = 0; px < data.size; px++) {
                            const checkX = realX + px;
                            const checkY = realY + py;
                            if (checkX >= 0 && checkX < gridW && checkY >= 0 && checkY < gridH) {
                                if (gridData[checkY][checkX]) {
                                    overlaps = true;
                                    break;
                                }
                            }
                        }
                        if (overlaps) break;
                    }
                    if (overlaps) cost += 1000; // High penalty

                    candidateScores.set(id, { sx, sy, cost, covers: [] });
                }
                candidateScores.get(id)!.covers.push(i);
            }
        }
    }

    // 3. Greedy Loop
    const usedCandidates = new Set<string>();

    while (uncoveredCount > 0) {
        let bestCandidate = null;
        let maxScore = -1;

        // Evaluate all candidates
        // Optimization: We could maintain a heap or priority queue, but simple iteration is easier to implement first.
        // JS Map iteration is efficient enough for typical canvas size?
        // number of candidates ~ pixels * coverage^2. 
        // 512x512 with cov 7 = 250k * 49 = 12M checks? A bit heavy for single frame.
        // But active pixels are sparse usually.
        // Let's optimization: We only iterate candidates that cover CURRENTLY UNCOVERED pixels.

        // Actually, we can just iterate the map.
        // Score = NewCovered / Cost.

        for (const [id, cand] of candidateScores) {
            if (usedCandidates.has(id)) continue;

            let newlyCovered = 0;
            for (const pIdx of cand.covers) {
                if (!pixels[pIdx].covered) newlyCovered++;
            }

            if (newlyCovered === 0) {
                // Optimization: Remove useless candidate?
                // candidateScores.delete(id); 
                continue;
            }

            const score = newlyCovered / cand.cost;
            if (score > maxScore) {
                maxScore = score;
                bestCandidate = cand;
            }
        }

        if (!bestCandidate) break; // Should not happen if uncovered > 0

        // Select best
        usedCandidates.add(cId(bestCandidate.sx, bestCandidate.sy));

        // Apply coverage
        for (const pIdx of bestCandidate.covers) {
            if (!pixels[pIdx].covered) {
                pixels[pIdx].covered = true;
                uncoveredCount--;
            }
        }

        // Add to result
        const realX = Math.round(bestCandidate.sx + coverage / 2 - data.size / 2);
        const realY = Math.round(bestCandidate.sy + coverage / 2 - data.size / 2);

        // Push Pole
        activePoles.push({
            x: realX,
            y: realY,
            id: activePoles.length,
            group: activePoles.length
        });
    }

    return activePoles;
}

export function generateBlueprintData(
    gridData: GridData,
    gridW: number,
    gridH: number,
    poleType: string,
    qualityIdx: number,
    autoPole: boolean,
    smartPlacement: boolean
): { bpString: string | null, status: string } {

    const entities: BlueprintEntity[] = [];
    let entityId = 1;
    const data = POLE_DATA[poleType];

    let minX = gridW, minY = gridH, maxX = -1, maxY = -1;
    let hasPixels = false;

    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            if (gridData[y][x]) {
                hasPixels = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (!hasPixels) {
        return { bpString: null, status: "Empty Canvas" };
    }

    const poles: ActivePole[] = [];
    if (autoPole) {
        let activePoles: ActivePole[];
        if (smartPlacement) {
            activePoles = calculateSmartPoles(poleType, qualityIdx, minX, minY, maxX, maxY, gridData, gridW, gridH);
        } else {
            activePoles = calculateActivePoles(poleType, qualityIdx, minX, minY, maxX, maxY, gridData, gridW, gridH);
        }
        const reach = data.wire[qualityIdx];

        // Calc Edges
        const edges: { u: number, v: number, dist: number }[] = [];
        for (let i = 0; i < activePoles.length; i++) {
            for (let j = i + 1; j < activePoles.length; j++) {
                const p1 = activePoles[i];
                const p2 = activePoles[j];
                const d2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
                if (d2 <= reach * reach) {
                    edges.push({ u: i, v: j, dist: d2 });
                }
            }
        }
        edges.sort((a, b) => a.dist - b.dist);

        const parent = new Array(activePoles.length).fill(0).map((_, i) => i);
        const find = (i: number): number => {
            if (parent[i] !== i) parent[i] = find(parent[i]);
            return parent[i];
        };
        const union = (i: number, j: number) => {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                parent[rootI] = rootJ;
                return true;
            }
            return false;
        };

        activePoles.forEach(p => p.neighbours = []);
        edges.forEach(edge => {
            if (union(edge.u, edge.v)) {
                activePoles[edge.u].neighbours!.push(edge.v);
                activePoles[edge.v].neighbours!.push(edge.u);
            }
        });

        activePoles.forEach((p) => {
            p.entity_number = entityId++;
        });

        activePoles.forEach((p) => {
            const neighbourIds = p.neighbours!.map(nIdx => activePoles[nIdx].entity_number!);
            const entity: BlueprintEntity = {
                entity_number: p.entity_number!,
                name: poleType,
                position: { x: p.x - minX, y: p.y - minY },
                neighbours: neighbourIds
            };
            if (qualityIdx > 0) {
                entity.quality = QUALITY_NAMES[qualityIdx];
            }
            entities.push(entity);
            poles.push(p);
        });
    }

    const isPole = (x: number, y: number) => {
        if (!autoPole) return false;
        return poles.some(p => {
            return x >= p.x && x < p.x + data.size && y >= p.y && y < p.y + data.size;
        });
    };

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const hex = gridData[y][x];
            if (hex) {
                if (isPole(x, y)) continue;

                const rgb = hexToRgb(hex);
                entities.push({
                    entity_number: entityId++,
                    name: "small-lamp",
                    position: { x: x - minX, y: y - minY },
                    color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255, a: 1 },
                    always_on: true,
                });
            }
        }
    }

    const bp: BlueprintJson = {
        blueprint: {
            item: "blueprint",
            label: "Factorio Art",
            entities: entities,
            icons: [{ signal: { type: "item", name: "small-lamp" }, index: 1 }],
            version: 562949958139904,
        },
    };

    return { bpString: encodeBlueprint(bp), status: "Success" };
}

export type GridData = (string | null)[][];

export function createEmptyGrid(w: number, h: number): GridData {
    return Array.from({ length: h }, () => Array(w).fill(null));
}

export function cloneGrid(grid: GridData): GridData {
    return grid.map(row => row.slice());
}

/**
 * Iterative flood fill to avoid stack overflow on large grids.
 */
export function floodFill(grid: GridData, sx: number, sy: number, fillColor: string, width: number, height: number): GridData {
    const targetColor = grid[sy][sx];
    if (targetColor === fillColor) return grid;

    const newGrid = cloneGrid(grid);
    const stack = [[sx, sy]];

    while (stack.length) {
        const pop = stack.pop();
        if (!pop) continue;
        const [x, y] = pop;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (newGrid[y][x] !== targetColor) continue;

        newGrid[y][x] = fillColor;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return newGrid;
}

export function countLamps(grid: GridData, width: number, height: number): number {
    let count = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x]) count++;
        }
    }
    return count;
}

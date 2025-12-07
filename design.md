# Factorio Lamp Editor - Design & Functionality Spec

## 1. Overview

The **Factorio Lamp Editor** is a lightweight, web-based tool designed to create pixel art and export it as **Factorio Blueprints** made of Small Lamps. It runs entirely in the browser using Vanilla JavaScript, HTML5 Canvas, and Tailwind CSS.

## 2. Core Architecture

- **Tech Stack**: Vanilla JS, HTML5 Canvas, Tailwind CSS (CDN), Pako (for zlib compression).
- **Structure**: Single-file architecture (`index.html`) containing logic, styles, and markup.
- **Rendering**: accelerated HTML5 Canvas rendering loop using `requestAnimationFrame`.
- **State Management**:
  - `gridData`: A GRID_W x GRID_H sparse matrix (2D Array) storing hex color codes or `null`.
  - `drawHistory`: Simple stack-based undo/redo system.

## 3. Key Features

### 3.1 Drawing Tools

- **Brush (B)**: Paints single cells with the selected color.
- **Fill (F)**: Flood fills connected cells of the same color.
- **Eraser (E)**: Removes lamps (sets cell to null).
- **Pan (H)**: Drag to move the view (alternative to Right-Click drag).

### 3.2 Navigation & Viewport

- **Infinite Canvas feel**:
  - **Zoom**: Mouse wheel scales the view (0.7x to 3.0x), centering on the cursor.
  - **Pan**: Right-click drag or 'Pan' tool to move around.
- **Culling**: The renderer only draws visible tiles for performance optimization.
- **Grid**: Displays chunk lines (every 32 tiles) and pixel grid (when zoomed in).

### 3.3 Stamping System

The app supports "stamping" patterns onto the grid.

- **Unified Logic**:
  - **Aiming**: Move mouse to preview stamp. "Ghost" follows cursor.
  - **Commit**: Click to paint the stamp onto the grid.
  - **Scaling**: Both Text and Image stamps support scaling using `+`/`-` keys or Mouse Wheel.
    - **Text**: Integer scaling (1x, 2x, etc.).
    - **Image**: Fine scaling (0.1 steps).

- **Stamp Types**:
  - **Text Stamp**:
    - Uses a custom 5x5 internal pixel font (`FACTORIO_FONT`).
    - Supports `A-Z`, `a-z`, `0-9`, and basic symbols.
  - **Image Stamp**:
    - Imports user uploaded images or **Pasted (Ctrl+V)** images.
    - Automatically resizes to fit reasonable bounds (~30px max dimension initially) on import.
    - Converts image pixels to closest hex color.

- **Interaction Model**:
  - **Priority**: Stamp Mode takes precedence over other tools (like Pan).
  - **Phase 1 (Aiming)**: Move mouse to preview stamp.
  - **Phase 2 (Commit)**: Click to paint the stamp onto the grid.

### 3.4 Blueprint Generation

- **Entities**: Generates `small-lamp` entities with `always_on: true` and specific `color` (RGB).
- **Power Poles**:
  - **Auto-place Poles**: Optional feature to automatically overlay power poles.
  - **Types**: Supports "Small", "Medium", "Big" Electric Poles, and "Substation".
  - **Quality**: Supports Factorio 2.0 Quality (Normal to Legendary).
  - **Logic**: Uses a coverage-based grid algorithm to place poles and Minimum Spanning Tree (MST) for wiring.
- **Encoding**:
  1.  JSON structure creation.
  2.  `TextEncoder` (UTF-8).
  3.  `pako.deflate` (Zlib compression, Level 9).
  4.  Base64 encoding with "0" prefix (Factorio Blueprint String format).

## 4. Input & Controls

| Action           | Mouse                 | Keyboard       |
| :--------------- | :-------------------- | :------------- |
| **Draw**         | Left Click / Drag     | -              |
| **Pan**          | Right Click Drag      | `H` (Tool)     |
| **Zoom**         | Wheel                 | -              |
| **Paste Image**  | -                     | `Ctrl+V`       |
| **Undo**         | -                     | `Ctrl+Z`       |
| **Redo**         | -                     | `Ctrl+Shift+Z` |
| **Resize Stamp** | Wheel (in stamp mode) | `+` / `-`      |
| **Cancel Stamp** | -                     | `Esc`          |

**Touch Support**:

- Maps `touchstart`/`move`/`end` to mouse events.
- Supports the drag-to-stamp flow natively.

## 5. Technical Constraints & Rules

1.  **Grid Limit**: Fixed at GRID_W x GRID_H pixels.
2.  **Color Palette**: User can pick any Hex color. Factorio lamps support RGB colors.
3.  **Coordinate System**: (0,0) is top-left of the internal grid. Blueprint exports center relatively to the selection.
4.  **Performance**:
    - Canvas redraws on state change.
    - Large flood fills are iterative to avoid stack overflow.
    - Blueprint generation scans bounding box of active pixels.

## 6. Future / LLM Guidelines

- **Code modification**: When modifying, ensure the Single File structure is maintained unless a refactor to modules is explicitly requested.
- **UI**: Keep the dark/industrial "Factorio-like" aesthetic (Slate/Gray/Yellow/Orange).
- **Logic**: Always verify coordinate math when touching the `renderCanvas` or `getWorldCoords` functions.

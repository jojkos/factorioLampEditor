export interface Point {
    x: number;
    y: number;
}

export interface CameraState {
    x: number;
    y: number;
    zoom: number;
}

export function getWorldCoords(
    clientX: number,
    clientY: number,
    rect: DOMRect,
    camera: CameraState,
    width: number,
    height: number
): Point {
    // Screen relative to canvas center
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // Transform: World = (Screen - Center) / Zoom + Camera
    // Note: Camera (x,y) is the point at the center of the screen
    const worldX = (screenX - width / 2) / camera.zoom + camera.x;
    const worldY = (screenY - height / 2) / camera.zoom + camera.y;

    return { x: worldX, y: worldY };
}

export function getScreenCoords(
    worldX: number,
    worldY: number,
    rect: DOMRect,
    camera: CameraState,
    width: number,
    height: number
): Point {
    // Screen = (World - Camera) * Zoom + Center
    const screenX = (worldX - camera.x) * camera.zoom + width / 2;
    const screenY = (worldY - camera.y) * camera.zoom + height / 2;
    return { x: screenX + rect.left, y: screenY + rect.top };
}

import { FACTORIO_FONT } from "../constants";

export interface StampBuffer {
    w: number;
    h: number;
    data: (string | null)[][];
}

export async function createTextStamp(text: string, color: string): Promise<StampBuffer | null> {
    if (!text) return null;

    let w = 0;
    const h = 8;
    if (text.length > 0) {
        w = (text.length * 6) + (Math.max(0, text.length - 1));
    }

    const buffer = new Array(h)
        .fill(null)
        .map(() => new Array(w).fill(null));

    let cursor = 0;
    for (let idx = 0; idx < text.length; idx++) {
        const char = text[idx];
        const map = FACTORIO_FONT[char] || FACTORIO_FONT["?"];

        if (!map) {
            cursor += 7;
            continue;
        }

        const charMap = map.length === 48 ? map : FACTORIO_FONT["?"];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 6; c++) {
                if (charMap[r * 6 + c]) buffer[r][cursor + c] = color;
            }
        }
        cursor += 7;
    }

    return { w, h, data: buffer };
}

export function processImageStamp(file: File): Promise<{ buffer: StampBuffer, image: HTMLImageElement, baseSize: { w: number, h: number } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const fitInfo = Math.min(1, 30 / img.width, 30 / img.height);
                const baseW = Math.floor(img.width * fitInfo);
                const baseH = Math.floor(img.height * fitInfo);

                // Initial Buffer generation
                const buffer = generateImageBuffer(img, baseW, baseH);
                resolve({ buffer, image: img, baseSize: { w: baseW, h: baseH } });
            };
            img.onerror = reject;
            if (typeof e.target?.result === 'string') {
                img.src = e.target.result;
            } else {
                reject("Failed to read file");
            }
        }
        reader.readAsDataURL(file);
    });
}

export function generateImageBuffer(img: HTMLImageElement, targetW: number, targetH: number): StampBuffer {
    const oc = document.createElement("canvas");
    oc.width = targetW; oc.height = targetH;
    const octx = oc.getContext("2d");
    if (!octx) throw new Error("Context failed");

    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(img, 0, 0, targetW, targetH);
    const data = octx.getImageData(0, 0, targetW, targetH).data;
    const buffer = new Array(targetH).fill(null).map(() => new Array(targetW).fill(null));
    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            const i = (y * targetW + x) * 4;
            if (data[i + 3] > 128) {
                const hex = "#" + ((1 << 24) + (data[i] << 16) + (data[i + 1] << 8) + data[i + 2]).toString(16).slice(1);
                buffer[y][x] = hex;
            }
        }
    }
    return { w: targetW, h: targetH, data: buffer };
}

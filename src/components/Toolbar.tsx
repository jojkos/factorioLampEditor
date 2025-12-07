import React from 'react';
import { QUALITY_COLORS, QUALITY_IMAGES, QUALITY_NAMES, POLE_DATA } from '../constants';

export type ToolType = 'brush' | 'fill' | 'erase' | 'pan';

interface ToolbarProps {
    currentTool: ToolType;
    setTool: (t: ToolType) => void;
    color: string;
    setColor: (c: string) => void;
    onUndo: () => void;
    onRedo: () => void;

    // Stamp props
    renderTextStamp: (text: string) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

    // Pole Props
    autoPole: boolean;
    setAutoPole: (v: boolean) => void;
    poleType: string;
    setPoleType: (v: string) => void;
    qualityIdx: number;
    setQualityIdx: (v: number) => void;
    isDragging?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    currentTool, setTool,
    color, setColor,
    onUndo, onRedo,
    renderTextStamp, onImageUpload,
    autoPole, setAutoPole,
    poleType, setPoleType,
    qualityIdx, setQualityIdx,
    isDragging = false
}) => {
    const [showQualityDropdown, setShowQualityDropdown] = React.useState(false);
    const [textInput, setTextInput] = React.useState("");

    const handleTextSubmit = () => {
        renderTextStamp(textInput);
    }

    return (
        <aside className="w-full md:w-72 bg-gray-800 border-t md:border-t-0 md:border-r border-gray-700 flex flex-col shrink-0 overflow-y-auto shadow-2xl z-10 order-2 md:order-1 max-h-[40vh] md:max-h-full">

            {/* Drawing Tools */}
            <div className="p-4 md:p-6 border-b border-gray-700">
                <div className="flex justify-between items-center mb-2 md:mb-4">
                    <h3 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Drawing Tools
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 relative rounded overflow-hidden border border-gray-600 shadow-sm group hover:border-gray-500 transition-colors">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="absolute inset-0 p-0 m-0 border-0 outline-none cursor-pointer w-[150%] h-[150%] -top-1/4 -left-1/4"
                                title="Choose Color"
                            />
                        </div>
                        <div className="flex gap-1">
                            <button className="tool-btn text-xs py-1 px-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded border border-gray-600" onClick={onUndo} title="Undo">
                                <i className="fa-solid fa-rotate-left"></i>
                            </button>
                            <button className="tool-btn text-xs py-1 px-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded border border-gray-600" onClick={onRedo} title="Redo">
                                <i className="fa-solid fa-rotate-right"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {[
                        { id: 'pan', icon: 'fa-hand', label: 'Pan (H)' },
                        { id: 'brush', icon: 'fa-pencil', label: 'Brush (B)' },
                        { id: 'fill', icon: 'fa-fill-drip', label: 'Fill (F)' },
                        { id: 'erase', icon: 'fa-eraser', label: 'Erase (E)' }
                    ].map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => setTool(tool.id as ToolType)}
                            className={`aspect-square flex items-center justify-center text-xl rounded border transition-all ${currentTool === tool.id
                                ? 'bg-yellow-600 text-white border-yellow-500 transform -translate-y-[2px] shadow-sm'
                                : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                                }`}
                            title={tool.label}
                        >
                            <i className={`fa-solid ${tool.icon}`}></i>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stamps */}
            <div className="p-4 md:p-6 border-b border-gray-700">
                <h3 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 md:mb-4">
                    Stamps
                </h3>
                <div className="mb-3 md:mb-5">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Text"
                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-xs font-mono text-yellow-500 focus:border-yellow-500 outline-none transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        />
                        <button
                            className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                            onClick={handleTextSubmit}
                        >
                            Text
                        </button>
                    </div>
                </div>

                <div className="mb-2">
                    <label className={`flex items-center justify-center w-full h-10 px-4 transition border rounded cursor-pointer group gap-2 ${isDragging
                            ? 'bg-blue-600 border-blue-400 animate-pulse ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800'
                            : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                        }`}>
                        <i className="fa-solid fa-file-import text-gray-200 group-hover:text-white transition-colors"></i>
                        <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors uppercase tracking-wider">
                            Import Image
                        </span>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={onImageUpload}
                        />
                    </label>
                </div>
            </div>

            {/* Power Support */}
            <div className="p-4 md:p-6 border-b border-gray-700">
                <h3 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 md:mb-4">
                    Power Support
                </h3>

                <div className="space-y-3">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={autoPole}
                            onChange={(e) => setAutoPole(e.target.checked)}
                            className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-gray-200">Auto-place Poles</span>
                    </label>

                    <div className="relative mb-2">
                        <select
                            value={poleType}
                            onChange={(e) => setPoleType(e.target.value)}
                            className="w-full bg-gray-900 text-white text-xs font-bold border border-gray-600 rounded-lg pl-3 pr-8 py-2 outline-none focus:border-blue-500 appearance-none disabled:opacity-50"
                        >
                            {Object.keys(POLE_DATA).map(k => (
                                <option key={k} value={k}>{k.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                            <i className="fa-solid fa-chevron-down text-[10px]"></i>
                        </div>
                    </div>

                    <div className="relative z-20">
                        <button
                            onClick={() => setShowQualityDropdown(!showQualityDropdown)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-2 pr-3 py-2 flex items-center justify-between hover:border-gray-500 transition-colors focus:outline-none focus:border-blue-500"
                        >
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                                <img src={QUALITY_IMAGES[qualityIdx]} className="w-5 h-5 object-contain" />
                                <span className="capitalize" style={{ color: qualityIdx > 0 ? QUALITY_COLORS[qualityIdx] : '#e5e7eb' }}>
                                    {QUALITY_NAMES[qualityIdx]}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-400">▼</span>
                        </button>

                        {showQualityDropdown && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl overflow-hidden flex flex-col">
                                {QUALITY_NAMES.map((name, idx) => (
                                    <button
                                        key={name}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-left transition-colors w-full border-b border-gray-800 last:border-0"
                                        onClick={() => {
                                            setQualityIdx(idx);
                                            setShowQualityDropdown(false);
                                        }}
                                    >
                                        <img src={QUALITY_IMAGES[idx]} className="w-5 h-5 object-contain" />
                                        <span className={`text-xs font-bold capitalize ${idx === 0 ? 'text-gray-300' : ''}`} style={{ color: idx > 0 ? QUALITY_COLORS[idx] : '' }}>
                                            {name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Click outside listener could be added in a useEffect here or in Layout */}
                        {showQualityDropdown && (
                            <div className="fixed inset-0 z-[-1]" onClick={() => setShowQualityDropdown(false)}></div>
                        )}
                    </div>
                </div>
            </div>

        </aside>
    );
};

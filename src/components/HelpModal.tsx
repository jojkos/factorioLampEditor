import React from 'react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-w-lg w-full p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    ✕
                </button>

                <div className="space-y-6 text-sm text-gray-300">

                    {/* Navigation */}
                    <div>
                        <h3 className="font-bold text-gray-100 mb-2 border-b border-gray-700 pb-1 flex items-center gap-2">
                            Navigation
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="flex justify-between"><span>Pan Canvas</span> <span className="bg-gray-700 px-1.5 rounded text-xs text-white">Right Click Drag</span></div>
                            <div className="flex justify-between"><span>Zoom</span> <span className="bg-gray-700 px-1.5 rounded text-xs text-white">Scroll</span></div>
                            <div className="flex justify-between"><span>Pan Tool</span> <span className="bg-gray-700 px-1.5 rounded text-xs text-yellow-500 font-mono">H</span></div>
                        </div>
                    </div>

                    {/* Tools */}
                    <div>
                        <h3 className="font-bold text-gray-100 mb-2 border-b border-gray-700 pb-1 flex items-center gap-2">
                            Drawing Tools
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-pencil text-gray-500"></i>
                                <span>Brush</span>
                                <span className="ml-auto bg-gray-700 px-1.5 rounded text-xs text-yellow-500 font-mono">B</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-fill-drip text-gray-500"></i>
                                <span>Fill (Flood)</span>
                                <span className="ml-auto bg-gray-700 px-1.5 rounded text-xs text-yellow-500 font-mono">F</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-eraser text-gray-500"></i>
                                <span>Eraser</span>
                                <span className="ml-auto bg-gray-700 px-1.5 rounded text-xs text-yellow-500 font-mono">E</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-rotate-left text-gray-500"></i>
                                <span>Undo / Redo</span>
                                <span className="ml-auto bg-gray-700 px-1.5 rounded text-xs text-yellow-500 font-mono">Ctrl+Z / Shift+Z</span>
                            </div>
                        </div>
                    </div>

                    {/* Stamping */}
                    <div>
                        <h3 className="font-bold text-gray-100 mb-2 border-b border-gray-700 pb-1 flex items-center gap-2">
                            Stamping
                        </h3>
                        <ul className="space-y-2 pl-1 list-disc list-inside">
                            <li>Press to stamp.</li>
                            <li><strong>Mouse Wheel</strong> or <strong>+/-</strong> to resize stamp.</li>
                            <li><strong>ESC</strong> to cancel.</li>
                        </ul>
                    </div>

                    {/* Exporting */}
                    <div>
                        <h3 className="font-bold text-gray-100 mb-2 border-b border-gray-700 pb-1 flex items-center gap-2">
                            Exporting
                        </h3>
                        <div className="text-xs text-gray-400">
                            <p className="mb-1">Click <strong>Copy Blueprint</strong> to generate a Factorio string.</p>
                            <p>Use <strong>Auto-place Poles</strong> to overlay Medium Poles or Substations automatically.</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <button onClick={onClose} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg transition-colors">Got it!</button>
                </div>
            </div>
        </div>
    );
};

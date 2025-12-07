import React from 'react';

interface HeaderProps {
    onToggleHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleHelp }) => {
    return (
        <header className="bg-gray-900 border-b border-gray-700 shadow-xl z-20 shrink-0">
            <div className="flex items-center justify-between px-4 py-3 h-16">
                {/* Logo Section */}
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20 shrink-0">
                        {/* Using text emoji for now or icon */}
                        <span className="text-yellow-500 text-xl font-bold">💡</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-extrabold text-gray-100 leading-tight tracking-tight">
                            Factorio Lamp Editor
                        </h1>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest hidden sm:block">
                            Blueprint Generator
                        </p>
                    </div>
                </div>

                <button
                    onClick={onToggleHelp}
                    className="coffee-link bg-indigo-600 hover:bg-indigo-500 text-white border-transparent flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                >
                    <span className="font-bold">?</span>
                    <span className="hidden sm:inline font-bold">Help</span>
                </button>

                {/* Buy Me a Coffee */}
                <a
                    href="https://buymeacoffee.com/jojkos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="coffee-link flex items-center gap-2 bg-[#FFDD00] text-black px-4 py-2 rounded-lg font-bold hover:translate-y-[-2px] transition-all shadow-md"
                >
                    <span className="text-xl">☕</span>
                    <span className="hidden sm:inline">Buy Me a Coffee</span>
                </a>
            </div>
        </header>
    );
};

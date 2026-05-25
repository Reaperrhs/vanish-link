import React from 'react';

const LinkItem = ({
    link,
    isSelected,
    onSelectionChange,
    onSelectLink,
    onCopy,
    onDelete
}) => {
    return (
        <li className={`px-4 sm:px-6 py-5 transition-colors group ${!link.active ? 'opacity-60 bg-red-900/10' : 'hover:bg-white/5'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3 w-full min-w-0">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectionChange(link.$id, e.target.checked)}
                        className="mt-1 sm:mt-0 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                                className="text-base sm:text-lg font-bold text-indigo-400 truncate cursor-pointer hover:text-indigo-300"
                                onClick={() => onSelectLink(link)}
                            >
                                {link.slug}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${!link.active ? 'bg-slate-700 text-slate-300 border-slate-600' :
                                link.type === 'onetime' ? 'bg-red-900/30 text-red-300 border-red-500/30' :
                                    link.type === '24h' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-500/30' :
                                        'bg-emerald-900/30 text-emerald-300 border-emerald-500/30'
                                }`}>
                                {!link.active ? 'Archived' : link.type === 'onetime' ? 'One-time' : link.type === '24h' ? '24 Hours' : 'Standard'}
                            </span>
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-slate-500 truncate hover:text-slate-300 transition-colors block max-w-full">
                            {link.url}
                        </a>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5">
                            {link.generatedCount > 0 && (
                                <div className="text-[10px] sm:text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-white/5">
                                    Generated: <span className="text-emerald-400 font-bold">{link.generatedCount}</span>
                                </div>
                            )}
                            {link.burnedCount > 0 && (
                                <div className="text-[10px] sm:text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-white/5">
                                    Burned: <span className="text-red-400 font-bold">{link.burnedCount}</span>
                                </div>
                            )}
                            <div className="text-[10px] sm:text-xs text-slate-500 truncate max-w-[180px] sm:max-w-none">
                                ID: <span className="font-mono text-slate-400 select-all">{link.$id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start border-t border-white/5 sm:border-t-0 pt-3 sm:pt-0 mt-3 sm:mt-0 gap-3 shrink-0 w-full sm:w-auto">
                    <div className="flex items-center text-sm text-slate-400">
                        <svg className="h-4 w-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="sm:inline hidden">Clicks: </span><span className="font-bold text-white ml-1">{link.clicks} clicks</span>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => onCopy(link.$id)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            title="Copy Master ID"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onSelectLink(link)}
                            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDelete(link.$id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </li>
    );
};

export default LinkItem;

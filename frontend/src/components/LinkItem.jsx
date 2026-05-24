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
        <li className={`px-6 py-5 transition-colors group ${!link.active ? 'opacity-60 bg-red-900/10' : 'hover:bg-white/5'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectionChange(link.$id, e.target.checked)}
                        className="rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <div className="flex flex-col min-w-0 flex-1 mr-4">
                        <div className="flex items-center mb-1">
                            <span
                                className="text-lg font-bold text-indigo-400 truncate mr-3 cursor-pointer hover:text-indigo-300"
                                onClick={() => onSelectLink(link)}
                            >
                                {link.slug}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${!link.active ? 'bg-slate-700 text-slate-300 border-slate-600' :
                                link.type === 'onetime' ? 'bg-red-900/30 text-red-300 border-red-500/30' :
                                    link.type === '24h' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-500/30' :
                                        'bg-emerald-900/30 text-emerald-300 border-emerald-500/30'
                                }`}>
                                {!link.active ? 'Archived' : link.type === 'onetime' ? 'One-time' : link.type === '24h' ? '24 Hours' : 'Standard'}
                            </span>
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 truncate hover:text-slate-300 transition-colors">
                            {link.url}
                        </a>

                        <div className="flex items-center space-x-4 mt-2">
                            {link.generatedCount > 0 && (
                                <div className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-white/5">
                                    Generated: <span className="text-emerald-400 font-bold">{link.generatedCount}</span>
                                </div>
                            )}
                            {link.burnedCount > 0 && (
                                <div className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-white/5">
                                    Burned: <span className="text-red-400 font-bold">{link.burnedCount}</span>
                                </div>
                            )}
                            <div className="text-xs text-slate-500">
                                ID: <span className="font-mono text-slate-400 select-all">{link.$id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center text-sm text-slate-400">
                        <svg className="h-4 w-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Clicks: <span className="font-bold text-white ml-1">{link.clicks}</span>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => onCopy(link.$id)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Copy Master ID"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onSelectLink(link)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded transition-colors"
                            title="View Details"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDelete(link.$id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
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

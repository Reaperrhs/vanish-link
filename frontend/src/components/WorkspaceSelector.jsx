import React, { useState } from 'react';
import { useWorkspaces } from '../contexts/WorkspaceContext';

const WorkspaceSelector = ({ selectedWorkspaceId, onWorkspaceChange, defaultLabel = 'Personal', showAllOption = false }) => {
    const { workspaces, deleteWorkspace } = useWorkspaces();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Delete this workspace?')) return;

        const success = await deleteWorkspace(id);
        if (success && selectedWorkspaceId === id) {
            onWorkspaceChange(null);
        }
    };

    const selectedWorkspace = workspaces.find(w => w.$id === selectedWorkspaceId);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-1.5 hover:bg-slate-800 transition-colors text-sm w-full justify-between lg:w-auto lg:justify-start"
            >
                <div className="flex items-center">
                    <span className="text-slate-400 mr-2">Workspace:</span>
                    <span className="font-semibold text-white truncate max-w-[150px]">
                        {selectedWorkspaceId === 'all' ? 'All Workspaces' : selectedWorkspace ? selectedWorkspace.name : defaultLabel}
                    </span>
                </div>
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {showDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden backdrop-blur-xl p-2">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                        {showAllOption && (
                            <button
                                type="button"
                                onClick={() => { onWorkspaceChange('all'); setShowDropdown(false); }}
                                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${selectedWorkspaceId === 'all' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-white/5'}`}
                            >
                                <span>All Workspaces</span>
                                {selectedWorkspaceId === 'all' && <span className="text-xs">✓</span>}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => { onWorkspaceChange(null); setShowDropdown(false); }}
                            className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${selectedWorkspaceId === null ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                            <span>{defaultLabel}</span>
                            {selectedWorkspaceId === null && <span className="text-xs">✓</span>}
                        </button>

                        {workspaces.map(w => (
                            <button
                                key={w.$id}
                                type="button"
                                onClick={() => { onWorkspaceChange(w.$id); setShowDropdown(false); }}
                                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between group ${selectedWorkspaceId === w.$id ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-white/5'}`}
                            >
                                <span className="truncate">{w.name}</span>
                                <div className="flex items-center">
                                    {selectedWorkspaceId === w.$id && <span className="text-xs mr-2">✓</span>}
                                    <span
                                        onClick={(e) => handleDelete(e, w.$id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                                    >
                                        ×
                                    </span>
                                </div>
                            </button>
                        ))}

                        {workspaces.length === 0 && (
                            <div className="px-3 py-2 text-xs text-slate-500 text-center">
                                No workspaces found. Create one from the top bar!
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Click outside to close (simplified) */}
            {showDropdown && (
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
            )}
        </div>
    );
};

export default WorkspaceSelector;

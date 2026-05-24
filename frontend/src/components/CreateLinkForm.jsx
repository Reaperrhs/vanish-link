import React, { useState, useEffect, useRef } from 'react';
import WorkspaceSelector from './WorkspaceSelector';
import { API_BASE_URL } from '../lib/appwrite';

const CreateLinkForm = () => {
    const [url, setUrl] = useState('');
    const [type, setType] = useState('standard');
    const [slug, setSlug] = useState('');
    const [createdLink, setCreatedLink] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [workspaceId, setWorkspaceId] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setCreatedLink(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, type, slug: slug || undefined, workspaceId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create link');
            }

            const data = await response.json();
            setCreatedLink(data);

            // reset form (keep workspace selected)
            setUrl('');
            setSlug('');
            setType('standard');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-4">
                    Shorten Your Links
                </h2>

                <p className="text-lg text-slate-400">
                    Create secure, time-limited, or one-time use links with ease.
                </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex justify-end">
                            <WorkspaceSelector
                                selectedWorkspaceId={workspaceId}
                                onWorkspaceChange={setWorkspaceId}
                                defaultLabel="Personal"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Destination URL</label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="url"
                                    required
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="block w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="https://example.com/very-long-url"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Custom Slug (Optional)</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">/</span>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        className="block w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="alias"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Link Type</label>
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer hover:bg-slate-900/70 hover:border-white/20 flex items-center justify-between"
                                    >
                                        <span>{type === 'standard' ? 'Standard' : type === 'onetime' ? 'Burn After Reading (One-time)' : 'Expires in 24h'}</span>
                                        <svg className={`h-5 w-5 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showDropdown && (
                                        <div className="absolute z-50 mt-2 w-full bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                            <div className="py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setType('standard');
                                                        setShowDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-indigo-600/20 hover:text-white ${type === 'standard' ? 'bg-indigo-600/30 text-white' : 'text-slate-300'}`}
                                                >
                                                    Standard
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setType('onetime');
                                                        setShowDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-indigo-600/20 hover:text-white ${type === 'onetime' ? 'bg-indigo-600/30 text-white' : 'text-slate-300'}`}
                                                >
                                                    Burn After Reading (One-time)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setType('24h');
                                                        setShowDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-indigo-600/20 hover:text-white ${type === '24h' ? 'bg-indigo-600/30 text-white' : 'text-slate-300'}`}
                                                >
                                                    Expires in 24h
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </span>
                            ) : 'Shorten URL'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl flex items-center">
                            <div className="flex-shrink-0 text-red-400">
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        </div>
                    )}

                    {createdLink && (
                        <div className="mt-8 p-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl animate-fade-in relative">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-emerald-400">Link Created Successfully!</h3>
                                <div className="flex space-x-2">
                                    {createdLink.workspaceId && (
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-200 border border-indigo-500/30">
                                            Saved to Workspace
                                        </span>
                                    )}
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${createdLink.type === 'onetime' ? 'bg-red-900/50 text-red-200' :
                                        createdLink.type === '24h' ? 'bg-yellow-900/50 text-yellow-200' :
                                            'bg-emerald-900/50 text-emerald-200'
                                        }`}>
                                        {createdLink.type === 'onetime' ? 'Burn After Reading' : createdLink.type === '24h' ? 'Expires in 24h' : 'Standard'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-900/80 rounded-lg p-4 flex items-center justify-between group">
                                <a
                                    href={createdLink.shortUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-400 font-mono text-lg hover:text-indigo-300 transition-colors truncate mr-4"
                                >
                                    {createdLink.shortUrl}
                                </a>
                                <button
                                    onClick={() => navigator.clipboard.writeText(createdLink.shortUrl)}
                                    className="p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-white/10"
                                    title="Copy to clipboard"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                </button>
                            </div>

                            {createdLink.expiresAt && (
                                <p className="mt-3 text-xs text-slate-500 flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Expires: {new Date(createdLink.expiresAt).toLocaleString()}
                                </p>
                            )}

                            <div className="mt-4 flex justify-end">
                                <a href="/dashboard" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center hover:underline">
                                    View in Dashboard &rarr;
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateLinkForm;

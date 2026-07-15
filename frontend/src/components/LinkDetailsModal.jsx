import React, { useState, useEffect } from 'react';
import QRCodeGenerator from './QRCodeGenerator';
import { API_BASE_URL, SHORT_URL_BASE } from '../lib/appwrite';

const LinkDetailsModal = ({ link: initialLink, onClose, onLinkUpdate, showToast: parentShowToast }) => {
    const [link, setLink] = useState(initialLink);
    const [showQR, setShowQR] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generatedChild, setGeneratedChild] = useState(null);
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [editUrlValue, setEditUrlValue] = useState('');
    const [savingUrl, setSavingUrl] = useState(false);

    useEffect(() => {
        setLink(initialLink);
    }, [initialLink]);

    // ... (keep existing useEffect and fetchAnalytics) ...
    useEffect(() => {
        if (link) {
            fetchAnalytics();
        }
    }, [link]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/analytics/${link.$id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch analytics');
            }
            const data = await response.json();
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        if (parentShowToast) {
            parentShowToast(message, type);
        } else {
            // fallback inline toast
            const el = document.createElement('div');
            el.className = `fixed top-4 right-4 z-[60] p-4 rounded-lg shadow-lg ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`;
            el.textContent = message;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3000);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    };

    const getFullUrl = (slug) => {
        return `${SHORT_URL_BASE}/${slug}`;
    };

    const handleGenerateChildLink = async () => {
        setGenerating(true);
        setGeneratedChild(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/shorten`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: link.url,
                    type: 'onetime',
                    parentId: link.$id,
                    workspaceId: link.workspaceId
                }),
            });

            if (!response.ok) throw new Error('Failed to generate link');

            const data = await response.json();
            setGeneratedChild(data);
            if (onLinkUpdate) onLinkUpdate();
        } catch (error) {
            console.error('Error generating child link:', error);
            alert('Failed to generate child link');
        } finally {
            setGenerating(false);
        }
    };

    const handleEditUrl = () => {
        setEditUrlValue(link.url);
        setIsEditingUrl(true);
    };

    const handleSaveUrl = async () => {
        if (!editUrlValue.trim()) {
            showToast('URL cannot be empty', 'error');
            return;
        }
        try {
            new URL(editUrlValue);
        } catch {
            showToast('Please enter a valid URL (including https://)', 'error');
            return;
        }

        setSavingUrl(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/links/${link.$id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: editUrlValue.trim() }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to update URL');
            }
            const updated = await response.json();
            setLink(updated);
            setIsEditingUrl(false);
            showToast('Destination URL updated successfully');
            if (onLinkUpdate) onLinkUpdate();
        } catch (error) {
            showToast(error.message || 'Failed to update URL', 'error');
        } finally {
            setSavingUrl(false);
        }
    };

    const handleResetIndividualStats = async () => {
        if (!window.confirm('Are you sure you want to reset click and burn counts for this link? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/reset/${link.$id}`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to reset statistics');

            const updatedLink = await response.json();
            setLink(updatedLink);
            
            if (onLinkUpdate) onLinkUpdate();
            fetchAnalytics();
        } catch (error) {
            console.error('Error resetting individual stats:', error);
            alert('Failed to reset statistics');
        } finally {
            setLoading(false);
        }
    };

    if (!link) return null;

    return (
        <>
            {showQR && (
                <QRCodeGenerator link={link} onClose={() => setShowQR(false)} />
            )}

            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

                    <div className="relative bg-slate-800 border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto m-4">
                        <div className="p-4 sm:p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl sm:text-2xl font-bold text-white">Link Details</h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <div className="space-y-4">
                                    <div className="bg-slate-900/50 rounded-xl p-4">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Short URL</label>
                                        <div className="flex items-center justify-between mt-2 gap-2 min-w-0">
                                            <a
                                                href={getFullUrl(link.slug)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-base sm:text-lg font-bold text-indigo-400 hover:text-indigo-300 truncate min-w-0 flex-1"
                                            >
                                                {getFullUrl(link.slug)}
                                            </a>
                                            <div className="flex space-x-1.5 shrink-0">
                                                <button
                                                    onClick={() => copyToClipboard(getFullUrl(link.slug))}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                                    title="Copy URL"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setShowQR(true)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                                    title="Generate QR Code"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M8 20h2M4 8h2M4 16h2m-2-4h2m2 4h.01" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Destination URL</label>
                                            {!isEditingUrl && (
                                                <button
                                                    onClick={handleEditUrl}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                        {isEditingUrl ? (
                                            <div className="mt-2 space-y-2">
                                                <input
                                                    type="url"
                                                    value={editUrlValue}
                                                    onChange={(e) => setEditUrlValue(e.target.value)}
                                                    autoFocus
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUrl(); if (e.key === 'Escape') setIsEditingUrl(false); }}
                                                    className="block w-full bg-slate-900 border border-indigo-500/50 rounded-lg py-2 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                    placeholder="https://example.com/new-destination"
                                                />
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={handleSaveUrl}
                                                        disabled={savingUrl}
                                                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {savingUrl ? 'Saving...' : 'Save Changes'}
                                                    </button>
                                                    <button
                                                        onClick={() => setIsEditingUrl(false)}
                                                        className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between mt-2 gap-2 min-w-0">
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs sm:text-sm text-slate-300 hover:text-white truncate min-w-0 flex-1"
                                                >
                                                    {link.url}
                                                </a>
                                                <button
                                                    onClick={() => copyToClipboard(link.url)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                                                    title="Copy URL"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-slate-900/50 rounded-xl p-4">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Link ID</label>
                                        <div className="flex items-center justify-between mt-2 gap-2 min-w-0">
                                            <span className="text-xs sm:text-sm font-mono text-slate-400 truncate min-w-0 flex-1 select-all">{link.$id}</span>
                                            <button
                                                onClick={() => copyToClipboard(link.$id)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                                                title="Copy ID"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* MASTER LINK GENERATOR */}
                                    <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-4">
                                        <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center">
                                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Generator Zone
                                        </label>
                                        <p className="text-xs text-slate-400 mt-1 mb-3">Create specific one-time use links tracked under this master link.</p>

                                        <button
                                            onClick={handleGenerateChildLink}
                                            disabled={generating}
                                            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                                        >
                                            {generating ? 'Generating...' : 'Generate One-Time Link'}
                                        </button>

                                        {generatedChild && (
                                            <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-indigo-500/30 animate-fade-in">
                                                <p className="text-xs text-green-400 font-bold mb-1">New Link Created!</p>
                                                <div className="flex items-center justify-between gap-2 min-w-0">
                                                    <span className="text-sm font-mono text-white truncate min-w-0 flex-1">{generatedChild.shortUrl}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(generatedChild.shortUrl)}
                                                        className="text-indigo-400 hover:text-white p-1 shrink-0 cursor-pointer"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-slate-900/50 rounded-xl p-4">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Type & Status</label>
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300">Type:</span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${link.type === 'onetime' ? 'bg-red-900/30 text-red-300 border-red-500/30' :
                                                    link.type === '24h' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-500/30' :
                                                        'bg-emerald-900/30 text-emerald-300 border-emerald-500/30'
                                                    }`}>
                                                    {link.type === 'onetime' ? 'Burn After Reading' : link.type === '24h' ? '24 Hours' : 'Standard'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300">Status:</span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${link.active ? 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30' :
                                                    'bg-red-900/30 text-red-300 border-red-500/30'
                                                    }`}>
                                                    {link.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 rounded-xl p-4">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Statistics</label>
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300">Total Clicks:</span>
                                                <span className="text-sm font-bold text-white">{link.clicks || 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300">Generated Count:</span>
                                                <span className="text-sm font-bold text-white">{link.generatedCount || 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300">Burned Count:</span>
                                                <span className="text-sm font-bold text-white">{link.burnedCount || 0}</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                                            <button
                                                onClick={handleResetIndividualStats}
                                                disabled={loading}
                                                className="text-xs text-red-400 hover:text-red-300 flex items-center transition-colors font-medium bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 px-2.5 py-1 rounded cursor-pointer"
                                                title="Reset stats for this link"
                                            >
                                                <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Reset Stats
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 rounded-xl p-4">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dates</label>
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300">Created:</span>
                                                <span className="text-sm text-slate-400">
                                                    {link.$createdAt ? new Date(link.$createdAt).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                            {link.expiresAt && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-slate-300">Expires:</span>
                                                    <span className="text-sm text-slate-400">
                                                        {new Date(link.expiresAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Analytics Section */}
                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : analytics && (
                                <div className="space-y-6">
                                    <h4 className="text-lg font-semibold text-white">Analytics Overview</h4>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <div className="text-xl sm:text-2xl font-bold text-indigo-400">{analytics.totalClicks}</div>
                                            <div className="text-xs text-slate-400 mt-1">Total Clicks</div>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <div className="text-xl sm:text-2xl font-bold text-emerald-400">{analytics.uniqueVisitors}</div>
                                            <div className="text-xs text-slate-400 mt-1">Unique Visitors</div>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <div className="text-xl sm:text-2xl font-bold text-purple-400">{analytics.avgTimeOnPage}s</div>
                                            <div className="text-xs text-slate-400 mt-1">Avg. Time</div>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <div className="text-xl sm:text-2xl font-bold text-yellow-400">{analytics.bounceRate}%</div>
                                            <div className="text-xs text-slate-400 mt-1">Bounce Rate</div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 rounded-xl p-4 overflow-hidden">
                                        <h5 className="text-sm font-medium text-white mb-3">Clicks Over Time (Last 7 Days)</h5>
                                        <div className="flex items-end justify-between h-32 pb-8">
                                            {analytics.clicksOverTime.map((day, index) => (
                                                <div key={index} className="flex flex-col items-center flex-1 px-0.5 sm:px-1">
                                                    <div
                                                        className="w-full bg-indigo-600 rounded-t min-h-[2px]"
                                                        style={{ height: `${Math.max(2, (day.clicks / Math.max(...analytics.clicksOverTime.map(d => d.clicks), 1)) * 100)}%` }}
                                                    ></div>
                                                    <div className="text-[9px] sm:text-xs text-slate-400 mt-2 rotate-45 origin-top-left whitespace-nowrap">
                                                        {day.date}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <h5 className="text-sm font-medium text-white mb-3">Devices</h5>
                                            <div className="space-y-2">
                                                {Object.entries(analytics.devices).map(([device, percentage]) => (
                                                    <div key={device} className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-300 capitalize">{device}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-24 bg-slate-700 rounded-full h-2">
                                                                <div
                                                                    className="bg-indigo-500 h-2 rounded-full"
                                                                    style={{ width: `${percentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm text-slate-400">{percentage}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <h5 className="text-sm font-medium text-white mb-3">Browsers</h5>
                                            <div className="space-y-2">
                                                {Object.entries(analytics.browsers).map(([browser, percentage]) => (
                                                    <div key={browser} className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-300 capitalize">{browser}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-24 bg-slate-700 rounded-full h-2">
                                                                <div
                                                                    className="bg-purple-500 h-2 rounded-full"
                                                                    style={{ width: `${percentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm text-slate-400">{percentage}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LinkDetailsModal;

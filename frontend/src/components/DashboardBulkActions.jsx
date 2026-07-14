import React, { useState } from 'react';
import { databases, SHORT_URL_BASE } from '../lib/appwrite';

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_COLLECTION_ID;

const DashboardBulkActions = ({
    selectedLinks,
    onSelectionChange,
    links,
    onLinksUpdate,
    showToast
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSelectAll = () => {
        if (selectedLinks.length === links.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(links.map(link => link.$id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedLinks.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedLinks.length} link(s)? This action cannot be undone.`)) {
            return;
        }

        setIsProcessing(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            // Delete links one by one
            for (const linkId of selectedLinks) {
                try {
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, linkId);
                    successCount++;
                } catch (error) {
                    console.error(`Error deleting link ${linkId}:`, error);
                    errorCount++;
                }
            }

            // Clear selection and refresh
            onSelectionChange([]);
            onLinksUpdate();

            if (successCount > 0) {
                showToast(`Successfully deleted ${successCount} link(s)`, 'success');
            }
            if (errorCount > 0) {
                showToast(`Failed to delete ${errorCount} link(s)`, 'error');
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            showToast('Failed to delete links', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkArchive = async (archive = true) => {
        if (selectedLinks.length === 0) return;

        setIsProcessing(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            // Update links one by one
            for (const linkId of selectedLinks) {
                try {
                    await databases.updateDocument(DATABASE_ID, COLLECTION_ID, linkId, {
                        active: !archive
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Error updating link ${linkId}:`, error);
                    errorCount++;
                }
            }

            // Clear selection and refresh
            onSelectionChange([]);
            onLinksUpdate();

            const action = archive ? 'archived' : 'unarchived';
            if (successCount > 0) {
                showToast(`Successfully ${action} ${successCount} link(s)`, 'success');
            }
            if (errorCount > 0) {
                showToast(`Failed to ${action} ${errorCount} link(s)`, 'error');
            }
        } catch (error) {
            console.error('Bulk archive error:', error);
            showToast('Failed to update links', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkExport = () => {
        if (selectedLinks.length === 0) return;

        const selectedLinksData = links.filter(link => selectedLinks.includes(link.$id));

        const csvContent = [
            ['ID', 'Slug', 'URL', 'Type', 'Clicks', 'Generated Count', 'Burned Count', 'Active', 'Created At', 'Expires At'].join(','),
            ...selectedLinksData.map(link => [
                link.$id,
                link.slug,
                `"${link.url.replace(/"/g, '""')}"`, // Escape quotes in URL
                link.type,
                link.clicks || 0,
                link.generatedCount || 0,
                link.burnedCount || 0,
                link.active ? 'Yes' : 'No',
                link.$createdAt ? new Date(link.$createdAt).toLocaleString() : '',
                link.expiresAt ? new Date(link.expiresAt).toLocaleString() : ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vanishlinks_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast(`Exported ${selectedLinks.length} link(s) to CSV`, 'success');
        onSelectionChange([]);
    };

    const handleBulkCopy = () => {
        if (selectedLinks.length === 0) return;

        const selectedLinksData = links.filter(link => selectedLinks.includes(link.$id));
        const urls = selectedLinksData.map(link => `${SHORT_URL_BASE}/${link.slug}`).join('\n');

        navigator.clipboard.writeText(urls).then(() => {
            showToast(`Copied ${selectedLinks.length} link(s) to clipboard`, 'success');
        }).catch(() => {
            showToast('Failed to copy links to clipboard', 'error');
        });
    };

    const hasSelection = selectedLinks.length > 0;
    const allSelected = selectedLinks.length === links.length && links.length > 0;

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Selection Controls */}
                <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            className="rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-sm text-slate-300">
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </span>
                    </label>

                    {hasSelection && (
                        <span className="text-sm text-indigo-400 font-medium">
                            {selectedLinks.length} selected
                        </span>
                    )}
                </div>

                {/* Bulk Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    {hasSelection && (
                        <>
                            <button
                                onClick={handleBulkCopy}
                                disabled={isProcessing}
                                className="flex items-center space-x-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Copy URLs to clipboard"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                <span className="text-xs font-medium">Copy</span>
                            </button>

                            <button
                                onClick={handleBulkExport}
                                disabled={isProcessing}
                                className="flex items-center space-x-2 px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Export to CSV"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-xs font-medium">Export</span>
                            </button>

                            <button
                                onClick={() => handleBulkArchive(true)}
                                disabled={isProcessing}
                                className="flex items-center space-x-2 px-3 py-2 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 rounded-lg hover:bg-yellow-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Archive selected links"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                <span className="text-xs font-medium">Archive</span>
                            </button>

                            <button
                                onClick={() => handleBulkArchive(false)}
                                disabled={isProcessing}
                                className="flex items-center space-x-2 px-3 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-lg hover:bg-indigo-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Unarchive selected links"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                <span className="text-xs font-medium">Unarchive</span>
                            </button>

                            <button
                                onClick={handleBulkDelete}
                                disabled={isProcessing}
                                className="flex items-center space-x-2 px-3 py-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete selected links"
                            >
                                {isProcessing ? (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                )}
                                <span className="text-xs font-medium">Delete</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardBulkActions;

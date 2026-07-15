import React, { useState, useEffect, useMemo } from 'react';
import { databases, client, API_BASE_URL, SHORT_URL_BASE } from '../lib/appwrite';
import { Query } from 'appwrite';
import DashboardStats from './DashboardStats';
import DashboardSearch from './DashboardSearch';
import DashboardBulkActions from './DashboardBulkActions';
import LinkDetailsModal from './LinkDetailsModal';
import QRCodeGenerator from './QRCodeGenerator';
import WorkspaceSelector from './WorkspaceSelector';
import LinkItem from './LinkItem';
import DashboardVisuals from './DashboardVisuals';

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_COLLECTION_ID;

const DashboardSkeleton = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <div className="h-8 w-48 skeleton-shimmer rounded-lg"></div>
                <div className="h-4 w-64 skeleton-shimmer rounded-lg mt-2"></div>
            </div>
            <div className="flex gap-3">
                <div className="h-10 w-40 skeleton-shimmer rounded-lg"></div>
                <div className="h-10 w-24 skeleton-shimmer rounded-lg"></div>
                <div className="h-10 w-28 skeleton-shimmer rounded-lg"></div>
            </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                    <div className="h-10 w-10 skeleton-shimmer rounded-lg mb-3"></div>
                    <div className="h-6 w-16 skeleton-shimmer rounded mb-2"></div>
                    <div className="h-3 w-20 skeleton-shimmer rounded"></div>
                </div>
            ))}
        </div>
        {/* Chart skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800/40 border border-white/10 rounded-2xl p-6 h-48 skeleton-shimmer"></div>
            <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6 h-48 skeleton-shimmer"></div>
        </div>
        {/* Link list skeleton */}
        <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="px-6 py-5 border-b border-white/5 flex items-center gap-4">
                    <div className="h-5 w-5 skeleton-shimmer rounded"></div>
                    <div className="flex-1">
                        <div className="h-5 w-32 skeleton-shimmer rounded mb-2"></div>
                        <div className="h-3 w-48 skeleton-shimmer rounded"></div>
                    </div>
                    <div className="h-5 w-20 skeleton-shimmer rounded"></div>
                </div>
            ))}
        </div>
    </div>
);

const Dashboard = () => {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [selectedLinks, setSelectedLinks] = useState([]);
    const [filteredLinks, setFilteredLinks] = useState([]);
    const [selectedLink, setSelectedLink] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const [currentWorkspace, setCurrentWorkspace] = useState('all');
    const [qrLink, setQrLink] = useState(null);

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [Query.orderDesc('$createdAt'), Query.limit(100)]
            );
            // Sorting is already descending by index, but we ensure frontend state is clean
            setLinks(response.documents);
        } catch (error) {
            console.error('Error fetching links:', error);
            showToastNotification('Failed to fetch links', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();

        // Subscribe to realtime changes in the Links collection
        const unsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
            (response) => {
                const eventType = response.events[0];

                if (eventType.endsWith('.update')) {
                    // Update the link in local state
                    setLinks((prevLinks) =>
                        prevLinks.map((link) =>
                            link.$id === response.payload.$id ? response.payload : link
                        )
                    );
                } else if (eventType.endsWith('.create')) {
                    // Add new link to list if not a child link
                    if (!response.payload.parentId) {
                        setLinks((prevLinks) => {
                            if (prevLinks.some((l) => l.$id === response.payload.$id)) return prevLinks;
                            return [response.payload, ...prevLinks];
                        });
                    }
                } else if (eventType.endsWith('.delete')) {
                    // Remove from list
                    setLinks((prevLinks) =>
                        prevLinks.filter((link) => link.$id !== response.payload.$id)
                    );
                }
            }
        );

        return () => {
            unsubscribe();
        };
    }, []);

    const handleLinksUpdate = () => {
        fetchLinks();
        setSelectedLinks([]); // Clear selection on update
    };

    const showToastNotification = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this link?')) return;
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
            showToastNotification('Link deleted successfully');
            handleLinksUpdate();
        } catch (error) {
            console.error('Error deleting link:', error);
            showToastNotification('Failed to delete link', 'error');
        }
    };

    const handleResetAllStats = async () => {
        const workspaceName = currentWorkspace === 'all'
            ? 'all workspaces'
            : currentWorkspace === null
                ? 'Personal workspace'
                : 'this workspace';

        if (!window.confirm(`Are you sure you want to reset click statistics for ALL links in ${workspaceName}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/reset-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workspaceId: currentWorkspace === 'all' ? 'all' : currentWorkspace
                }),
            });

            if (!response.ok) throw new Error('Failed to reset statistics');

            showToastNotification('All statistics reset successfully');
            handleLinksUpdate();
        } catch (error) {
            console.error('Error resetting statistics:', error);
            showToastNotification('Failed to reset statistics', 'error');
        }
    };

    const copyToClipboard = async (slug) => {
        try {
            const shortUrl = `${SHORT_URL_BASE}/${slug}`;
            await navigator.clipboard.writeText(shortUrl);
            showToastNotification('Link copied to clipboard');
        } catch (err) {
            showToastNotification('Failed to copy', 'error');
        }
    };

    const handleSelectionChange = (id, isSelected) => {
        if (isSelected) {
            setSelectedLinks(prev => [...prev, id]);
        } else {
            setSelectedLinks(prev => prev.filter(linkId => linkId !== id));
        }
    };

    // Stats links should include EVERYTHING in the current workspace except children
    const statsLinks = useMemo(() => {
        return links.filter(link => {
            if (link.parentId) return false;

            if (currentWorkspace === 'all') {
                return true;
            }

            if (currentWorkspace) {
                if (link.workspaceId !== currentWorkspace) return false;
            } else {
                // If "Personal" (null), only show links with NO workspace
                if (link.workspaceId) return false;
            }
            return true;
        });
    }, [links, currentWorkspace]);

    if (loading) {
        return (
            <div className="space-y-6">
                <DashboardSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toast Notification */}
            {showToast && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 ${toastType === 'success' ? 'bg-emerald-600 text-white' :
                    toastType === 'error' ? 'bg-red-600 text-white' :
                        'bg-indigo-600 text-white'
                    }`}>
                    <div className="flex items-center space-x-2">
                        <span>{toastMessage}</span>
                    </div>
                </div>
            )}

            {/* Header & Stats */}
            <div className="flex flex-col space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-white">Links Management</h3>
                        <p className="mt-1 text-sm text-slate-400">Manage and monitor your shortened URLs.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <WorkspaceSelector
                            selectedWorkspaceId={currentWorkspace}
                            onWorkspaceChange={setCurrentWorkspace}
                            defaultLabel="Personal"
                            showAllOption={true}
                        />
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-400">Show History</span>
                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer ${showArchived ? 'bg-indigo-600' : 'bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showArchived ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <button
                            onClick={handleResetAllStats}
                            className="text-xs bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 rounded-xl px-3 py-1.5 transition-colors text-red-200 flex items-center font-medium cursor-pointer"
                        >
                            <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Reset Stats
                        </button>
                    </div>
                </div>

                <DashboardStats links={statsLinks} />
            </div>

            {/* Dashboard Visual Analytics — hidden on mobile to save space */}
            <div className="hidden lg:block">
                <DashboardVisuals links={statsLinks} />
            </div>

            {/* Search and Filter */}
            <DashboardSearch
                links={statsLinks}
                onFilteredLinksChange={setFilteredLinks}
                showArchived={showArchived}
                onShowArchivedChange={setShowArchived}
            />

            {/* Bulk Actions */}
            <DashboardBulkActions
                selectedLinks={selectedLinks}
                onSelectionChange={setSelectedLinks}
                links={filteredLinks}
                onLinksUpdate={handleLinksUpdate}
                showToast={showToastNotification}
            />

            {/* Links List */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden">
                <ul role="list" className="divide-y divide-white/5">
                    {filteredLinks.map((link) => (
                        <LinkItem
                            key={link.$id}
                            link={link}
                            isSelected={selectedLinks.includes(link.$id)}
                            onSelectionChange={handleSelectionChange}
                            onSelectLink={setSelectedLink}
                            onCopy={copyToClipboard}
                            onDelete={handleDelete}
                            onQR={setQrLink}
                        />
                    ))}
                    {filteredLinks.length === 0 && (
                        <li className="px-6 py-12 text-center">
                            <div className="mx-auto h-12 w-12 text-slate-600 mb-3">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-white">No links found</h3>
                            {statsLinks.length > 0 && !showArchived ? (
                                <div className="mt-2 space-y-3">
                                    <p className="text-sm text-slate-400">
                                        You have {statsLinks.length} inactive or burned link{statsLinks.length === 1 ? '' : 's'} hidden in your history.
                                    </p>
                                    <button
                                        onClick={() => setShowArchived(true)}
                                        className="inline-flex items-center px-3 py-1.5 border border-indigo-500/30 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                        Show History ({statsLinks.length})
                                    </button>
                                </div>
                            ) : (
                                <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or create a new link.</p>
                            )}
                        </li>
                    )}
                </ul>
            </div>

            {/* QR Code Modal (from link item) */}
            {qrLink && (
                <QRCodeGenerator link={qrLink} onClose={() => setQrLink(null)} />
            )}

            {/* Link Details Modal */}
            {selectedLink && (
                <LinkDetailsModal
                    link={selectedLink}
                    onClose={() => setSelectedLink(null)}
                    onLinkUpdate={handleLinksUpdate}
                    showToast={showToastNotification}
                />
            )}
        </div>
    );
};

export default Dashboard;

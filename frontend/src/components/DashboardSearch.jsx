import React, { useState, useEffect } from 'react';

const DashboardSearch = ({
    links,
    onFilteredLinksChange,
    showArchived,
    onShowArchivedChange
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('$createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        let filtered = links.filter(link => {
            // Hide child links
            if (link.parentId) return false;

            // Filter by archived status
            if (!showArchived && !link.active) return false;

            // Filter by search term
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                return (
                    link.slug?.toLowerCase().includes(searchLower) ||
                    link.url?.toLowerCase().includes(searchLower) ||
                    link.$id?.toLowerCase().includes(searchLower)
                );
            }

            // Filter by type
            if (typeFilter !== 'all') {
                if (typeFilter === 'archived' && link.active) return false;
                if (typeFilter !== 'archived' && link.type !== typeFilter) return false;
            }

            return true;
        });

        // Sort filtered links
        filtered.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            // Special handling for the date field
            if (sortBy === '$createdAt') {
                const timeA = aValue ? new Date(aValue).getTime() : 0;
                const timeB = bValue ? new Date(bValue).getTime() : 0;

                if (sortOrder === 'desc') {
                    return timeB - timeA; // Higher time (newer) first
                } else {
                    return timeA - timeB; // Lower time (older) first
                }
            }

            // Standard comparison for other fields
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();
            }

            if (sortOrder === 'desc') {
                return aValue < bValue ? 1 : -1;
            } else {
                return aValue > bValue ? 1 : -1;
            }
        });

        onFilteredLinksChange(filtered);
    }, [links, searchTerm, typeFilter, sortBy, sortOrder, showArchived, onFilteredLinksChange]);

    const clearFilters = () => {
        setSearchTerm('');
        setTypeFilter('all');
        setSortBy('$createdAt');
        setSortOrder('desc');
    };

    const hasActiveFilters = searchTerm || typeFilter !== 'all' || sortBy !== '$createdAt' || sortOrder !== 'desc';

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Search Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="Search links..."
                    />
                </div>

                {/* Type Filter */}
                <div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="block w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 px-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none"
                    >
                        <option value="all">All Types</option>
                        <option value="standard">Standard</option>
                        <option value="onetime">One-time</option>
                        <option value="24h">24 Hours</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                {/* Sort By */}
                <div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="block w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 px-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none"
                    >
                        <option value="$createdAt">Created Date</option>
                        <option value="clicks">Click Count</option>
                        <option value="slug">Slug</option>
                        <option value="url">URL</option>
                        <option value="generatedCount">Generated Count</option>
                        <option value="burnedCount">Burned Count</option>
                    </select>
                </div>

                {/* Sort Order */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex-1 flex items-center justify-center space-x-2 bg-slate-900/50 border border-white/10 rounded-xl py-2 px-3 text-white hover:bg-white/10 transition-all"
                    >
                        <span className="text-sm">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
                        <svg
                            className="h-4 w-4 transform transition-transform"
                            style={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="p-2 bg-red-900/50 border border-red-500/30 rounded-xl text-red-300 hover:bg-red-900/70 transition-all"
                            title="Clear all filters"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {searchTerm && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-900/30 text-indigo-300 border border-indigo-500/30">
                            Search: {searchTerm}
                        </span>
                    )}
                    {typeFilter !== 'all' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-500/30">
                            Type: {typeFilter}
                        </span>
                    )}
                    {sortBy !== 'createdAt' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-300 border border-emerald-500/30">
                            Sort: {sortBy}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardSearch;

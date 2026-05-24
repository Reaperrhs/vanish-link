import React, { useMemo } from 'react';

const DashboardVisuals = ({ links }) => {
    // 1. Calculate Top 5 Links by Clicks
    const topLinks = useMemo(() => {
        return [...links]
            .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 5)
            .filter(l => (l.clicks || 0) > 0); // Only show links with clicks
    }, [links]);

    const maxClicks = useMemo(() => {
        return Math.max(...topLinks.map(l => l.clicks || 0), 1);
    }, [topLinks]);

    // 2. Calculate Link Type Distribution
    const typeStats = useMemo(() => {
        const stats = { standard: 0, onetime: 0, '24h': 0 };
        links.forEach(link => {
            if (!link.parentId) { // Only count master links
                if (stats[link.type] !== undefined) {
                    stats[link.type]++;
                } else {
                    stats.standard++; // default
                }
            }
        });
        const total = stats.standard + stats.onetime + stats['24h'];
        return {
            standard: stats.standard,
            onetime: stats.onetime,
            '24h': stats['24h'],
            total
        };
    }, [links]);

    // Doughnut chart circle calculations
    const radius = 50;
    const circumference = 2 * Math.PI * radius; // ~314.16

    const segments = useMemo(() => {
        const { standard, onetime, '24h': hours24, total } = typeStats;
        if (total === 0) return [];

        const items = [
            { type: 'Standard', count: standard, color: '#10b981', hoverColor: 'shadow-emerald-500/20' },
            { type: 'Expires 24h', count: hours24, color: '#f59e0b', hoverColor: 'shadow-amber-500/20' },
            { type: 'One-time (Burn)', count: onetime, color: '#ef4444', hoverColor: 'shadow-red-500/20' }
        ];

        let accumulatedPercentage = 0;
        return items.map(item => {
            const percentage = (item.count / total) * 100;
            const strokeLength = (percentage / 100) * circumference;
            const strokeOffset = circumference - (accumulatedPercentage / 100) * circumference;
            accumulatedPercentage += percentage;

            return {
                ...item,
                percentage,
                strokeLength,
                strokeOffset
            };
        });
    }, [typeStats, circumference]);

    if (links.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Top Links Bar Chart */}
            <div className="lg:col-span-2 bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                    <h4 className="text-lg font-bold text-white mb-1 flex items-center">
                        <svg className="h-5 w-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Top Performing Links
                    </h4>
                    <p className="text-xs text-slate-400 mb-6">Most popular short URLs based on total click volume.</p>
                </div>

                <div className="space-y-5">
                    {topLinks.map((link) => {
                        const widthPercent = ((link.clicks || 0) / maxClicks) * 100;
                        return (
                            <div key={link.$id} className="group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center min-w-0 mr-4">
                                        <span className="text-sm font-bold text-indigo-400 font-mono group-hover:text-indigo-300 transition-colors truncate">
                                            /{link.slug}
                                        </span>
                                        <span className="text-xs text-slate-500 mx-2">|</span>
                                        <span className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-sm md:max-w-md">
                                            {link.url}
                                        </span>
                                    </div>
                                    <span className="text-sm font-semibold text-white ml-2 shrink-0">
                                        {link.clicks} {link.clicks === 1 ? 'click' : 'clicks'}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-900/50 rounded-full h-3 overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${widthPercent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {topLinks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <svg className="h-10 w-10 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-500">No click analytics recorded yet</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Link Type Doughnut Chart */}
            <div className="bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                    <h4 className="text-lg font-bold text-white mb-1 flex items-center">
                        <svg className="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                        Link Distribution
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">Proportion of link categories in this workspace.</p>
                </div>

                {typeStats.total > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                        {/* SVG Doughnut */}
                        <div className="relative w-36 h-36 flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                {/* Background circle */}
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    fill="transparent"
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth="12"
                                />
                                {/* Segment circles */}
                                {segments.map((seg, i) => (
                                    seg.percentage > 0 && (
                                        <circle
                                            key={i}
                                            cx="60"
                                            cy="60"
                                            r={radius}
                                            fill="transparent"
                                            stroke={seg.color}
                                            strokeWidth="12"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={seg.strokeOffset}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    )
                                ))}
                            </svg>
                            {/* Inner Info */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-white">{typeStats.total}</span>
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Links</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-2 shrink-0">
                            {segments.map((seg, i) => (
                                <div key={i} className="flex items-center space-x-2 text-xs">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: seg.color }} />
                                    <span className="text-slate-300 font-medium">{seg.type}:</span>
                                    <span className="text-white font-bold">{seg.count}</span>
                                    <span className="text-slate-500">({Math.round(seg.percentage)}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <span className="text-sm font-medium text-slate-500">No links registered</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardVisuals;

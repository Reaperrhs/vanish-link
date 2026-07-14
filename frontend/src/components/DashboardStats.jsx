import React, { useState, useEffect } from 'react';


const DashboardStats = ({ links }) => {
    const [stats, setStats] = useState({
        totalLinks: 0,
        activeLinks: 0,
        totalClicks: 0,
        totalGenerated: 0,
        totalBurned: 0,
        expiringSoon: 0
    });

    useEffect(() => {
        if (links.length > 0) {
            calculateStats();
        }
    }, [links]);

    const calculateStats = () => {
        const now = new Date();
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const newStats = links.reduce((acc, link) => {
            // Only count master links (no parentId)
            if (!link.parentId) {
                acc.totalLinks++;
                if (link.active) {
                    acc.activeLinks++;
                }
                acc.totalClicks += link.clicks || 0;
                acc.totalGenerated += link.generatedCount || 0;
                acc.totalBurned += link.burnedCount || 0;

                // Check if link expires in next 24 hours
                if (link.expiresAt && link.active) {
                    const expiryDate = new Date(link.expiresAt);
                    if (expiryDate <= twentyFourHoursFromNow && expiryDate > now) {
                        acc.expiringSoon++;
                    }
                }
            }
            return acc;
        }, {
            totalLinks: 0,
            activeLinks: 0,
            totalClicks: 0,
            totalGenerated: 0,
            totalBurned: 0,
            expiringSoon: 0
        });

        setStats(newStats);
    };

    const statCards = [
        {
            title: 'Total Links',
            value: stats.totalLinks,
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            ),
            color: 'from-blue-600 to-blue-400',
            bgColor: 'bg-blue-900/20',
            borderColor: 'border-blue-500/30'
        },
        {
            title: 'Active Links',
            value: stats.activeLinks,
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'from-emerald-600 to-emerald-400',
            bgColor: 'bg-emerald-900/20',
            borderColor: 'border-emerald-500/30'
        },
        {
            title: 'Total Clicks',
            value: stats.totalClicks,
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ),
            color: 'from-purple-600 to-purple-400',
            bgColor: 'bg-purple-900/20',
            borderColor: 'border-purple-500/30'
        },
        {
            title: 'Generated',
            value: stats.totalGenerated,
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            ),
            color: 'from-indigo-600 to-indigo-400',
            bgColor: 'bg-indigo-900/20',
            borderColor: 'border-indigo-500/30'
        },
        {
            title: 'Burned',
            value: stats.totalBurned,
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
            ),
            color: 'from-red-600 to-red-400',
            bgColor: 'bg-red-900/20',
            borderColor: 'border-red-500/30'
        },
        {
            title: 'Expiring Soon',
            value: stats.expiringSoon,
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'from-yellow-600 to-yellow-400',
            bgColor: 'bg-yellow-900/20',
            borderColor: 'border-yellow-500/30'
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {statCards.map((card, index) => (
                <div key={index} className={`${card.bgColor} backdrop-blur-xl border ${card.borderColor} rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-lg`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} bg-opacity-20`}>
                            <div className={`text-white bg-gradient-to-br ${card.color} bg-clip-text text-transparent`}>
                                {card.icon}
                            </div>
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-white">{card.value}</div>
                    <div className="text-xs text-slate-400 mt-1">{card.title}</div>
                </div>
            ))}
        </div>
    );
};

export default DashboardStats;

import React, { useState, useRef } from 'react';

const QRCodeGenerator = ({ link, onClose }) => {
    const [qrSize, setQrSize] = useState(256);
    const [includeLogo, setIncludeLogo] = useState(true);
    const [bgColor, setBgColor] = useState('#ffffff');
    const [fgColor, setFgColor] = useState('#000000');
    const canvasRef = useRef(null);

    // Simple QR code generation using a library-free approach
    // For production, you'd want to use a proper QR code library
    const generateQRCode = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = qrSize;

        canvas.width = size;
        canvas.height = size;

        // Clear canvas
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);

        // Simple placeholder QR code (this is a mock implementation)
        // In a real implementation, you'd use a QR code library
        ctx.fillStyle = fgColor;
        const moduleSize = size / 25; // 25x25 modules
        const modules = generateMockQRModules(link.slug);

        modules.forEach((row, y) => {
            row.forEach((module, x) => {
                if (module) {
                    ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
                }
            });
        });

        // Add logo if enabled
        if (includeLogo) {
            const logoSize = size * 0.2;
            const logoX = (size - logoSize) / 2;
            const logoY = (size - logoSize) / 2;

            // White background for logo
            ctx.fillStyle = bgColor;
            ctx.fillRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10);

            // Simple "V" logo for VanishLink
            ctx.fillStyle = fgColor;
            ctx.font = `bold ${logoSize * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('V', size / 2, size / 2);
        }
    };

    // Generate a mock QR code module pattern based on slug
    const generateMockQRModules = (slug) => {
        const modules = Array(25).fill(null).map(() => Array(25).fill(false));

        // Create a pattern based on the slug
        const hash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Position marker patterns (corners)
        const addPositionMarker = (startX, startY) => {
            for (let i = 0; i < 7; i++) {
                for (let j = 0; j < 7; j++) {
                    if (startX + i < 25 && startY + j < 25) {
                        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
                            modules[startX + i][startY + j] = true;
                        }
                    }
                }
            }
        };

        addPositionMarker(0, 0);
        addPositionMarker(18, 0);
        addPositionMarker(0, 18);

        // Add data pattern based on slug hash
        for (let i = 0; i < 25; i++) {
            for (let j = 0; j < 25; j++) {
                if (!modules[i][j] && (i % 2 === 0 || j % 2 === 0)) {
                    modules[i][j] = (hash + i * j) % 3 === 0;
                }
            }
        }

        return modules;
    };

    const downloadQRCode = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qrcode_${link.slug}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        });
    };

    const copyQRCode = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                alert('QR code copied to clipboard!');
            }).catch(() => {
                alert('Failed to copy QR code');
            });
        });
    };

    React.useEffect(() => {
        generateQRCode();
    }, [qrSize, includeLogo, bgColor, fgColor, link]);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

                <div className="relative bg-slate-800 border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">QR Code Generator</h3>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Link Info */}
                        <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-indigo-400">{link.slug}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${link.type === 'onetime' ? 'bg-red-900/30 text-red-300 border-red-500/30' :
                                        link.type === '24h' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-500/30' :
                                            'bg-emerald-900/30 text-emerald-300 border-emerald-500/30'
                                    }`}>
                                    {link.type === 'onetime' ? 'One-time' : link.type === '24h' ? '24 Hours' : 'Standard'}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 truncate">{link.url}</div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* QR Code Preview */}
                            <div className="flex flex-col items-center">
                                <div className="bg-white p-4 rounded-xl shadow-lg">
                                    <canvas
                                        ref={canvasRef}
                                        className="block"
                                        style={{ maxWidth: '100%', height: 'auto' }}
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-2 mt-4">
                                    <button
                                        onClick={downloadQRCode}
                                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-sm font-medium">Download</span>
                                    </button>

                                    <button
                                        onClick={copyQRCode}
                                        className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        <span className="text-sm font-medium">Copy</span>
                                    </button>
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Size: {qrSize}px
                                    </label>
                                    <input
                                        type="range"
                                        min="128"
                                        max="512"
                                        step="32"
                                        value={qrSize}
                                        onChange={(e) => setQrSize(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Background Color
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="color"
                                            value={bgColor}
                                            onChange={(e) => setBgColor(e.target.value)}
                                            className="h-10 w-20 rounded border border-white/10 bg-slate-900"
                                        />
                                        <input
                                            type="text"
                                            value={bgColor}
                                            onChange={(e) => setBgColor(e.target.value)}
                                            className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Foreground Color
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="color"
                                            value={fgColor}
                                            onChange={(e) => setFgColor(e.target.value)}
                                            className="h-10 w-20 rounded border border-white/10 bg-slate-900"
                                        />
                                        <input
                                            type="text"
                                            value={fgColor}
                                            onChange={(e) => setFgColor(e.target.value)}
                                            className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={includeLogo}
                                            onChange={(e) => setIncludeLogo(e.target.checked)}
                                            className="rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                        />
                                        <span className="text-sm text-slate-300">Include Logo</span>
                                    </label>
                                </div>

                                {/* Quick Presets */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Quick Presets</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                setBgColor('#ffffff');
                                                setFgColor('#000000');
                                            }}
                                            className="px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
                                        >
                                            Classic
                                        </button>
                                        <button
                                            onClick={() => {
                                                setBgColor('#1e293b');
                                                setFgColor('#ffffff');
                                            }}
                                            className="px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
                                        >
                                            Dark
                                        </button>
                                        <button
                                            onClick={() => {
                                                setBgColor('#fef3c7');
                                                setFgColor('#92400e');
                                            }}
                                            className="px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
                                        >
                                            Warm
                                        </button>
                                        <button
                                            onClick={() => {
                                                setBgColor('#dbeafe');
                                                setFgColor('#1e40af');
                                            }}
                                            className="px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
                                        >
                                            Cool
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRCodeGenerator;

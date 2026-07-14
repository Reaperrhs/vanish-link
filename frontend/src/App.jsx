import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CreateLinkForm from './components/CreateLinkForm';
import Dashboard from './components/Dashboard';
import { WorkspaceProvider, useWorkspaces } from './contexts/WorkspaceContext';

// Page transition wrapper — fades in content on route change
const PageTransition = ({ children }) => {
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(false);
        const timer = requestAnimationFrame(() => setIsVisible(true));
        return () => cancelAnimationFrame(timer);
    }, [location.pathname]);

    return (
        <div
            className={`transition-all duration-300 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
        >
            {children}
        </div>
    );
};

// Workspace Creation Modal
const CreateWorkspaceModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError(null);
        const success = await onCreate(name.trim());
        setLoading(false);
        if (success) {
            setName('');
            onClose();
        } else {
            setError('Failed to create workspace. Please try again.');
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
                <div className="relative bg-slate-800 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Create New Workspace</h3>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Workspace Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                    className="block w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="e.g. Marketing Team"
                                />
                            </div>
                            {error && (
                                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                                    <p className="text-sm text-red-200">{error}</p>
                                </div>
                            )}
                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !name.trim()}
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {loading ? 'Creating...' : 'Create Workspace'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Extracted Header Component to use Context
const AppHeader = () => {
  const { createWorkspace } = useWorkspaces();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleCreateWorkspace = async (name) => {
    return await createWorkspace(name);
  };

  return (
    <header className="relative z-20 border-b border-white/10 backdrop-blur-md bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-3 cursor-pointer group">
          <img src="/favicon.png" alt="VanishLink Logo" className="w-8 h-8 rounded-lg object-cover transition-transform group-hover:scale-110" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            VanishLink
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors py-2 border-b-2 ${
              location.pathname === '/'
                ? 'text-white border-indigo-500'
                : 'text-slate-300 hover:text-white border-transparent hover:border-indigo-500'
            }`}
          >
            Create Link
          </Link>
          <Link
            to="/dashboard"
            className={`text-sm font-medium transition-colors py-2 border-b-2 ${
              location.pathname === '/dashboard'
                ? 'text-white border-purple-500'
                : 'text-slate-300 hover:text-white border-transparent hover:border-purple-500'
            }`}
          >
            Dashboard
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-white/10 rounded px-3 py-1.5 transition-colors text-slate-300 flex items-center cursor-pointer"
          >
            <span className="mr-1 text-indigo-400">+</span> New Workspace
          </button>
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="md:hidden border-b border-white/10 bg-slate-900/95 backdrop-blur-xl absolute top-16 left-0 w-full z-20 px-4 py-4 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className={`text-sm font-medium transition-colors py-2 px-3 rounded-lg ${
                location.pathname === '/'
                  ? 'bg-indigo-600/20 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Create Link
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className={`text-sm font-medium transition-colors py-2 px-3 rounded-lg ${
                location.pathname === '/dashboard'
                  ? 'bg-purple-600/20 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Dashboard
            </Link>
            <button
              onClick={() => { setMenuOpen(false); setShowCreateModal(true); }}
              className="w-full text-left text-sm font-medium text-slate-300 hover:text-white transition-colors py-2.5 px-3 rounded-lg hover:bg-white/5 flex items-center cursor-pointer"
            >
              <span className="mr-2 text-indigo-400 font-bold">+</span> New Workspace
            </button>
          </nav>
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWorkspace}
      />
    </header>
  );
};


function App() {
  return (
    <WorkspaceProvider>
      <Router>
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500 selection:text-white">

          <AppHeader />

          <main className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <PageTransition>
              <Routes>
                <Route path="/" element={<CreateLinkForm />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </PageTransition>
          </main>
        </div>
      </Router>
    </WorkspaceProvider>
  );
}

export default App;

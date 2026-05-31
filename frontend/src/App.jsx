import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreateLinkForm from './components/CreateLinkForm';
import Dashboard from './components/Dashboard';
import { WorkspaceProvider, useWorkspaces } from './contexts/WorkspaceContext';

// Extracted Header Component to use Context
const AppHeader = () => {
  const { createWorkspace } = useWorkspaces();
  const [isCreating, setIsCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCreateWorkspace = async () => {
    const name = prompt("Enter a name for the new workspace:");
    if (!name) return;

    setIsCreating(true);
    await createWorkspace(name);
    setIsCreating(false);
    setMenuOpen(false);
  };

  return (
    <header className="relative z-20 border-b border-white/10 backdrop-blur-md bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src="/favicon.png" alt="VanishLink Logo" className="w-8 h-8 rounded-lg object-cover" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            VanishLink
          </h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <a href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 border-b-2 border-transparent hover:border-indigo-500">
            Create Link
          </a>
          <a href="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 border-b-2 border-transparent hover:border-purple-500">
            Dashboard
          </a>
          <button
            onClick={handleCreateWorkspace}
            disabled={isCreating}
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
            <a
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
            >
              Create Link
            </a>
            <a
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
            >
              Dashboard
            </a>
            <button
              onClick={handleCreateWorkspace}
              disabled={isCreating}
              className="w-full text-left text-sm font-medium text-slate-300 hover:text-white transition-colors py-2.5 px-3 rounded-lg hover:bg-white/5 flex items-center cursor-pointer"
            >
              <span className="mr-2 text-indigo-400 font-bold">+</span> New Workspace
            </button>
          </nav>
        </div>
      )}
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
            <Routes>
              <Route path="/" element={<CreateLinkForm />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WorkspaceProvider>
  );
}

export default App;

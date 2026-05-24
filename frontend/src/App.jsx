import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreateLinkForm from './components/CreateLinkForm';
import Dashboard from './components/Dashboard';
import { WorkspaceProvider, useWorkspaces } from './contexts/WorkspaceContext';

// Extracted Header Component to use Context
const AppHeader = () => {
  const { createWorkspace } = useWorkspaces();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateWorkspace = async () => {
    const name = prompt("Enter a name for the new workspace:");
    if (!name) return;

    setIsCreating(true);
    await createWorkspace(name);
    setIsCreating(false);
  };

  return (
    <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold">V</span>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            VanishLink
          </h1>
        </div>
        <nav className="flex items-center space-x-8">
          <a href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 border-b-2 border-transparent hover:border-indigo-500">
            Create Link
          </a>
          <a href="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 border-b-2 border-transparent hover:border-purple-500">
            Dashboard
          </a>
          <button
            onClick={handleCreateWorkspace}
            disabled={isCreating}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-white/10 rounded px-3 py-1.5 transition-colors text-slate-300 flex items-center"
          >
            <span className="mr-1 text-indigo-400">+</span> New Workspace
          </button>
        </nav>
      </div>
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

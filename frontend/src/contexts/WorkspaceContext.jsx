import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/appwrite';

const WorkspaceContext = createContext();

export const useWorkspaces = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspaces must be used within a WorkspaceProvider');
    }
    return context;
};

export const WorkspaceProvider = ({ children }) => {
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWorkspaces = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/workspaces`);
            if (response.ok) {
                const data = await response.json();
                setWorkspaces(data);
            } else {
                console.error('Failed to fetch workspaces');
            }
        } catch (error) {
            console.error('Error fetching workspaces:', error);
        } finally {
            setLoading(false);
        }
    };

    const createWorkspace = async (name) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (response.ok) {
                const newWorkspace = await response.json();
                setWorkspaces(prev => [...prev, newWorkspace]);
                return newWorkspace;
            }
        } catch (error) {
            console.error('Error creating workspace:', error);
        }
        return null;
    };

    const deleteWorkspace = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/workspaces/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setWorkspaces(prev => prev.filter(w => w.$id !== id));
                return true;
            }
        } catch (error) {
            console.error('Error deleting workspace:', error);
        }
        return false;
    };

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const value = {
        workspaces,
        loading,
        createWorkspace,
        deleteWorkspace,
        refreshWorkspaces: fetchWorkspaces
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

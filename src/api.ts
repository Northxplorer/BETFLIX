import type { DashboardData, ChatMessage, PingMessage, Project, ProjectAction, User } from './types';

const API_URL = '/api';
const isDev = import.meta.env.DEV;

export const fetchData = async (): Promise<DashboardData> => {
  if (isDev) {
    try {
        const res = await fetch(`${API_URL}/data`);
        if (!res.ok) throw new Error('API not available');
        return await res.json();
    } catch {
        return { users: [], projects: [] };
    }
  }
  const res = await fetch(`${API_URL}/data`);
  return res.json();
};

export const saveProject = async (project: any): Promise<void> => {
    await fetch(`${API_URL}/save-project`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(project)
    });
};

/**
 * Sends one small change (like, pin, comment) that the server merges into the
 * latest version on disk. Returns the up-to-date project, or null on failure.
 */
export const projectAction = async (projectId: string, user: User, change: ProjectAction): Promise<Project | null> => {
    try {
        const res = await fetch(`${API_URL}/project-action`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ projectId, userId: user.id, userName: user.name, ...change })
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};

export const saveUser = async (user: any): Promise<void> => {
    await fetch(`${API_URL}/save-user`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(user)
    });
};

export const saveData = async (data: DashboardData): Promise<void> => {
    await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
};

export const saveFavorite = async (userName: string, project: unknown, userId: string): Promise<void> => {
    if (isDev) return;
    try {
        await fetch(`${API_URL}/save-favorite`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userName, project, userId })
        });
    } catch {
        console.error("Failed to save favorite");
    }
};

export const deleteProject = async (id: string): Promise<void> => {
    await fetch(`${API_URL}/delete-project`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id })
    });
};

export const openFolder = async (path: string): Promise<void> => {
  if (!path) return;
  await fetch(`${API_URL}/open-folder`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ path })
  });
};

export const checkFolder = async (ref: string): Promise<{ exists: boolean, path: string, name?: string, contacts?: string[] }> => {
  if (!ref) return { exists: false, path: "" };
  const res = await fetch(`${API_URL}/check-folder`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ ref })
  });
  return res.json();
};

export const fetchChat = async (): Promise<ChatMessage[]> => {
    if (isDev) return [];
    try {
        const res = await fetch(`${API_URL}/chat`);
        return await res.json();
    } catch { return []; }
};


export const fetchPings = async (): Promise<PingMessage[]> => {
    if (isDev) return [];
    try {
        const res = await fetch(`${API_URL}/pings`);
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
};

export const sendPingMessage = async (ping: PingMessage): Promise<void> => {
    await fetch(`${API_URL}/send-ping`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(ping)
    });
};

export const sendChat = async (message: ChatMessage): Promise<void> => {
    await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(message)
    });
};

export const pingPresence = async (userId: string): Promise<void> => {
    if (isDev) return;
    try {
        await fetch(`${API_URL}/ping`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId })
        });
    } catch {
        console.error("Failed to ping presence");
    }
};

export const getOnlineUsers = async (): Promise<string[]> => {
    if (isDev) return [];
    try {
        const res = await fetch(`${API_URL}/online-users`);
        return await res.json();
    } catch {
        return [];
    }
};

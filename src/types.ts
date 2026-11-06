export interface User {
  id: string;
  name: string;
  workload: number;
  role?: string;
}


export interface PingMessage {
  id: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  date: string;
  likes: string[]; // Array of User IDs who liked the comment
}

export interface Like {
  userId: string;
  date: string;
}

export interface Project {
  id: string;
  ref?: string;
  title: string;
  reference?: string;
  summary: string;
  description: string;
  team: string[];
  deadline: string;
  status: 'En cours' | 'Terminé' | 'En pause' | 'À faire' | 'APS' | 'APD' | 'PDE' | 'PDD' | 'Soum' | 'Chantier' | 'EXE' | 'RECEP';
  progress: number;
  image: string;
  remarks?: string;
  address?: string;
    importantInfo?: string;
  likes: (string | Like)[]; // Backward compatibility: string ID or Like object
  comments: Comment[];
  folderPath?: string;
  lastUpdated?: string;
  pinned?: boolean; // Legacy global pin, replaced by pinnedBy
  pinnedBy?: string[]; // IDs of the users who have this project in "Ma Liste"
  contacts?: string[];
}

export type ProjectAction =
  | { action: 'toggle-like' }
  | { action: 'toggle-pin' }
  | { action: 'add-comment'; comment: Comment }
  | { action: 'edit-comment'; commentId: string; text: string }
  | { action: 'delete-comment'; commentId: string }
  | { action: 'toggle-comment-like'; commentId: string };

/** Works with both like formats (legacy user id string, or Like object). */
export const hasLiked = (likes: Project['likes'] | undefined, userId: string): boolean =>
  (likes || []).some(l => (typeof l === 'string' ? l : l.userId) === userId);

export interface DashboardData {
  users: User[];
  projects: Project[];
  chat?: ChatMessage[];
  pings?: PingMessage[];
}

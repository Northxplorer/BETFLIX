import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User, DashboardData } from '../types';
import { Search, Plus, Trophy, Bell, Settings, MessageSquare, FolderOpen, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import ReportModal from './ReportModal';
import ChatBox from './ChatBox';
import { saveUser, checkFolder, openFolder } from '../api';

interface SidebarProps {
  onOpenPing: () => void;
  user: User;
  data: DashboardData;
  onUpdateWorkload: (newWorkload: number) => void;
  onSearch: (query: string) => void;
  onAddProject: (prefill?: { ref: string, path: string }) => void;
  onDataUpdate: (newData: DashboardData) => void;
  viewMode: 'carousel' | 'grid';
  onToggleView: () => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onlineUsers?: string[];
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    user, data, onUpdateWorkload, onSearch, onAddProject, onDataUpdate, onOpenPing, 
    collapsed, onToggleCollapse, onlineUsers = [], theme = 'dark', onToggleTheme
}) => {
  const [workload, setWorkload] = useState(user.workload);
  const isManager = user.role === 'Manager';
  const [searchQuery, setSearchQuery] = useState('');
  const [folderPathInput, setFolderPathInput] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [isManagingUsers, setIsManagingUsers] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Développeur');
  const [folderCheckResult, setFolderCheckResult] = useState<{ exists: boolean, path: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string, text: string, time: string, projectTitle?: string }[]>([]);

  // Hover state for auto-expanding if preferred, but we'll stick to manual toggle or click
  // Actually, for a true Netflix feel, it's often a hover-to-expand or just icons.
  // We will respect the 'collapsed' prop passed from parent.

  useEffect(() => {
    // Generate notifications
    const allNotifications: { id: string, text: string, time: string, projectTitle?: string, rawDate: Date, type: 'comment' | 'project' | 'chat' | 'like' }[] = [];

    data.projects.forEach(p => {
        p.comments?.forEach(c => {
            allNotifications.push({
                id: c.id,
                text: `${c.user} a commenté sur ${p.title}`,
                time: new Date(c.date).toLocaleDateString(),
                projectTitle: p.title,
                rawDate: new Date(c.date),
                type: 'comment'
            });
        });

        const creationDate = new Date(parseInt(p.id));
        if (!isNaN(creationDate.getTime())) {
             allNotifications.push({
                id: `new-proj-${p.id}`,
                text: `Nouveau projet créé: ${p.title}`,
                time: creationDate.toLocaleDateString(),
                projectTitle: p.title,
                rawDate: creationDate,
                type: 'project'
            });
        }

        if (p.likes && p.likes.length > 0 && typeof p.likes[0] !== 'string') {
             p.likes.forEach((l: unknown, idx: number) => {
                 const like = l as { date: string };
                 allNotifications.push({
                    id: `like-${p.id}-${idx}`,
                    text: `Nouveau like sur ${p.title}`,
                    time: new Date(like.date).toLocaleDateString(),
                    projectTitle: p.title,
                    rawDate: new Date(like.date),
                    type: 'like'
                });
             });
        }
    });

    data.chat?.forEach(msg => {
         allNotifications.push({
                id: `chat-${msg.id}`,
                text: `Nouveau message de ${msg.user}`,
                time: new Date(msg.timestamp).toLocaleDateString(),
                rawDate: new Date(msg.timestamp),
                type: 'chat'
            });
    });

    allNotifications.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    setNotifications(allNotifications.slice(0, 20));

    const lastRead = localStorage.getItem('lastNotificationRead');
    if (allNotifications.length > 0) {
        if (lastRead) {
            const lastReadTime = parseInt(lastRead);
            const latestNotifTime = allNotifications[0].rawDate.getTime();
            setHasNewActivity(latestNotifTime > lastReadTime);
        } else {
            setHasNewActivity(true);
        }
    } else {
        setHasNewActivity(false);
    }
  }, [data]);

  useEffect(() => {
    setWorkload(user.workload);
  }, [user.workload]);

  const handleToggleNotifications = () => {
      if (!showNotifications) {
          localStorage.setItem('lastNotificationRead', Date.now().toString());
          setHasNewActivity(false);
      }
      setShowNotifications(!showNotifications);
  };

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.match(/^\d{2}\.\d{3}$/)) {
        const result = await checkFolder(searchQuery);
        const projectExists = data.projects.some(p => p.ref === searchQuery);
        if (result.exists && !projectExists) {
            setFolderCheckResult(result);
        } else {
            setFolderCheckResult(null);
        }
      } else {
        setFolderCheckResult(null);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery, data.projects]);

  const handleWorkloadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkload(parseInt(e.target.value));
  };

  const handleSaveWorkload = () => {
    onUpdateWorkload(workload);
  };

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    const newUser: User = {
      id: Date.now().toString(),
      name: newUserName,
      workload: 0
    };
    const newData = { ...data, users: [...data.users, newUser] };
    await saveUser(newUser);
    onDataUpdate(newData);
    setNewUserName(''); setNewUserRole('Développeur');
  };

  const handleDirectFolderOpen = async () => {
    if (!folderPathInput) return;
    if (folderPathInput.match(/^\d{2}\.\d{3}$/)) {
        const res = await checkFolder(folderPathInput);
        if (res.exists) {
            const projectExists = data.projects.some(p => p.ref === folderPathInput);
            if (!projectExists) {
                if (confirm(`Dossier trouvé : ${res.path}\n\nAucune fiche projet n'existe pour cette référence.\nVoulez-vous créer la fiche projet maintenant ?\n\n(OK = Créer Fiche + Ouvrir Dossier / Annuler = Ouvrir Dossier uniquement)`)) {
                    onAddProject({ ref: folderPathInput, path: res.path });
                    openFolder(res.path);
                    return;
                }
            }
            openFolder(res.path);
        } else {
            alert("Aucun dossier trouvé pour cette référence.");
        }
    } else {
        openFolder(folderPathInput);
    }
  };

  const handleQuickCheck = async (val: string) => {
      setFolderPathInput(val);
      if (val.match(/^\d{2}\.\d{3}$/)) {
          const res = await checkFolder(val);
          if (res.exists) {
              setFolderCheckResult({ exists: true, path: res.path });
          } else {
              if (folderCheckResult?.path) setFolderCheckResult(null);
          }
      }
  };

  return (
    <>
      <motion.div 
        animate={{ width: collapsed ? 80 : 320 }}
        className="h-screen bg-black/95 border-r border-gray-800 flex flex-col fixed left-0 top-0 z-40 shadow-2xl overflow-visible transition-all duration-300"
      >
        {/* Toggle Button */}
        <button 
            onClick={onToggleCollapse}
            className="absolute -right-4 top-10 bg-indigo-600 rounded-full p-1 text-white z-50 hover:bg-indigo-500 transition-colors border border-gray-800 shadow-md"
        >
            {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between min-h-[88px]">
          {!collapsed ? (
            <div>
                <h1 className="text-2xl font-bold text-red-600 tracking-tighter">BETICFLIX</h1>
                <p className="text-xs text-gray-400">Team T2 Dashboard</p>
            </div>
          ) : (
             <div className="w-full flex justify-center">
                 <span className="text-red-600 font-bold text-xl">B</span>
             </div>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar ${collapsed ? 'px-2 py-4 items-center' : 'p-6'}`}>
            
            {/* Quick Actions (Icons Only when collapsed) */}
            <div className="flex flex-col gap-4 w-full">
                <button
                    onClick={() => onAddProject()}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${collapsed ? 'justify-center bg-gray-800 text-white' : 'bg-white text-black font-bold hover:bg-gray-200'}`}
                    title="Nouveau Projet"
                >
                    <Plus size={24} />
                    {!collapsed && <span>Nouveau Projet</span>}
                </button>

                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
                    title="Messagerie"
                >
                    <MessageSquare size={24} />
                    {!collapsed && <span>Messagerie</span>}
                </button>

                <button
                    onClick={() => setShowReport(true)}
                    className={`flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
                    title="Rapports"
                >
                    <Trophy size={24} />
                    {!collapsed && <span>Rapports</span>}
                </button>

                {onToggleTheme && (
                    <button
                        onClick={onToggleTheme}
                        className={`flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
                        title="Changer le thème"
                    >
                        {theme === 'dark' ? <span className="text-yellow-400">☀️</span> : <span className="text-gray-400">🌙</span>}
                        {!collapsed && <span>Thème {theme === 'dark' ? 'Clair' : 'Sombre'}</span>}
                    </button>
                )}
            </div>

            <div className="w-full h-px bg-gray-800 my-2"></div>

            
            {/* Ping Button */}
            <div className="mb-2">
                <button 
                    onClick={onOpenPing}
                    className={`flex items-center gap-3 p-3 w-full rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-colors ${collapsed ? 'justify-center' : ''}`}
                    title="Envoyer un Ping"
                >
                    <Bell size={18} className="animate-pulse" />
                    {!collapsed && <span className="font-semibold text-sm">Pinger l'équipe</span>}
                </button>
            </div>

            {/* Update / Refresh Button */}
            <div className="mb-2">
                <button 
                    onClick={() => window.location.reload()}
                    className={`flex items-center gap-3 p-3 w-full rounded-lg text-yellow-400 bg-gray-900 hover:bg-gray-800 border border-yellow-700/50 transition-colors ${collapsed ? 'justify-center' : ''}`}
                    title="Mettre à jour l'application"
                >
                    <RefreshCw size={18} />
                    {!collapsed && <span className="font-semibold text-sm">Mettre à jour</span>}
                </button>
            </div>
            
            {/* User Profile */}
            
            <div className={`bg-gray-900 rounded-xl border border-gray-800 ${collapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 cursor-pointer" title={user.name}>
                        {user.name.charAt(0)}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="font-semibold text-white truncate leading-tight">{user.name}</p>
                            <p className="text-[10px] text-indigo-400 font-medium mb-1">{user.role || 'Développeur'}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Charge:</span>
                                <span className={`text-xs font-bold ${workload > 80 ? 'text-red-500' : 'text-green-500'}`}>{workload}%</span>
                            </div>
                        </div>
                    )}
                </div>
                {!collapsed && (
                     <input
                        type="range"
                        min="0"
                        max="100"
                        value={workload}
                        onChange={handleWorkloadChange}
                        onMouseUp={handleSaveWorkload}
                        className="w-full h-1 mt-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                )}
            </div>

            {/* Notifications */}
            <div className="relative">
                 <button 
                    onClick={handleToggleNotifications} 
                    className={`flex items-center gap-3 p-3 w-full rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
                    title="Notifications"
                >
                      <div className="relative">
                        <Bell size={24} />
                        {hasNewActivity && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-black"></span>}
                      </div>
                      {!collapsed && <span>Notifications</span>}
                 </button>
            </div>
            
            {/* Search & Filters (Only visible if NOT collapsed) */}
            {!collapsed && (
                <div className="space-y-4 animate-fadeIn">
                     {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-white outline-none text-white placeholder-gray-500"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                onSearch(e.target.value);
                            }}
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                    </div>

                    {/* Quick Access */}
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Accès Rapide</label>
                        <div className="flex gap-2">
                             <input
                                type="text"
                                placeholder="Ref..."
                                className="flex-1 min-w-0 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm outline-none text-white"
                                value={folderPathInput}
                                onChange={(e) => handleQuickCheck(e.target.value)}
                             />
                             <button onClick={handleDirectFolderOpen} className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded">
                                 <FolderOpen size={16} />
                             </button>
                        </div>
                    </div>

                    {/* Team List */}
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase">L'équipe</h3>
                             {isManager && (
                                <button
                                    onClick={() => setIsManagingUsers(!isManagingUsers)}
                                    className="text-gray-500 hover:text-white"
                                >
                                    <Settings size={14} />
                                </button>
                             )}
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                             {data.users.map(u => (
                                <div key={u.id} className="flex items-center justify-between text-sm text-gray-400">
                                    <div className="flex items-center gap-2">
                                         <div className="relative">
                                             <div className={`w-2 h-2 rounded-full ${u.workload > 80 ? 'bg-red-500' : u.workload > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                             {onlineUsers.includes(u.id) && (
                                                <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 border border-gray-900 rounded-full" title="En ligne"></span>
                                             )}
                                         </div>
                                         <span className={onlineUsers.includes(u.id) ? 'text-white font-medium' : ''}>{u.name}</span>
                                    </div>
                                    <span className="text-xs font-mono">{u.workload}%</span>
                                </div>
                             ))}
                        </div>
                         {isManagingUsers && (
                            <div className="flex flex-col gap-2 mt-2">
                                <input
                                type="text"
                                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                                placeholder="Nom..."
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white outline-none"
                                        value={newUserRole}
                                        onChange={(e) => setNewUserRole(e.target.value)}
                                    >
                                        <option value="Développeur">Développeur</option>
                                        <option value="Manager">Manager</option>
                                    </select>
                                    <button onClick={handleAddUser} className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded px-3 flex items-center justify-center"><Plus size={14}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        {/* Copyright */}
            <div className={`mt-auto pt-4 text-center text-[10px] text-gray-600 border-t border-gray-800 ${collapsed ? 'hidden' : 'block'}`}>
                &copy; Olivier Schwickert
            </div>
        </div>
      </motion.div>

      {/* Notifications Popover */}
      <AnimatePresence>
        {showNotifications && (
            <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`fixed top-20 z-50 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden ${collapsed ? 'left-24' : 'left-80'}`}
            >
                <div className="p-3 border-b border-gray-800 font-bold text-white">Notifications</div>
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <p className="p-4 text-gray-500 text-center text-sm">Rien à signaler.</p>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className="p-3 border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                <div className="flex justify-between mb-1">
                                    <span className="text-xs font-bold text-indigo-400 w-2/3 truncate">{n.projectTitle || 'Système'}</span>
                                    <span className="text-[10px] text-gray-500">{n.time}</span>
                                </div>
                                <p className="text-xs text-gray-300">{n.text}</p>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
            </>
        )}
      </AnimatePresence>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        projects={data.projects}
      />
      <ChatBox
        user={user}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />
    </>
  );
};

export default Sidebar;

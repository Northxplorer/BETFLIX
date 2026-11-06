import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User, Project, DashboardData, PingMessage, ProjectAction } from './types';
import { fetchData, fetchPings, saveProject, saveUser, deleteProject, pingPresence, getOnlineUsers, sendPingMessage, projectAction } from './api';
import LoginModal from './components/LoginModal';
import Sidebar from './components/Sidebar';
import ProjectModal from './components/ProjectModal';
import HeroSection from './components/HeroSection';
import ProjectRow from './components/ProjectRow';

// Brings older data to the current format (the server does the same when it
// next modifies a project):
// - `reference` → `ref` (canonical field for year grouping, search, hero)
// - likes stored as plain user ids → { userId, date }
// - global `pinned` flag → per-user `pinnedBy` (legacy pins stay for everyone)
const normalizeProject = (p: Project, users: User[]): Project => {
  const fallbackDate = p.lastUpdated || new Date().toISOString();
  return {
    ...p,
    ref: p.ref || p.reference,
    likes: (p.likes || []).map(l => (typeof l === 'string' ? { userId: l, date: fallbackDate } : l)),
    comments: p.comments || [],
    pinnedBy: p.pinnedBy ?? (p.pinned ? users.map(u => u.id) : []),
  };
};

const normalizeData = (d: DashboardData): DashboardData => ({
  ...d,
  users: d.users || [],
  projects: (d.projects || []).map(p => normalizeProject(p, d.users || [])),
});

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('All'); // APS, APD...
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [theme, setTheme] = useState<'dark'|'light'>('dark');

  const [activePing, setActivePing] = useState<PingMessage | null>(null);
  const [pingMessage, setPingMessage] = useState('');
  const [showPingModal, setShowPingModal] = useState(false);

  // Check for new pings every time data updates
  useEffect(() => {
      if (data?.pings && data.pings.length > 0) {
          const latestPing = data.pings[data.pings.length - 1];
          // Simple logic: if the timestamp is less than 30 seconds ago, and we haven't dismissed it
          // Or we can just use localStorage to remember the last seen ping ID
          const lastSeen = localStorage.getItem('last_seen_ping_id');
          // Pings stay "fresh" for 10 minutes; the id in localStorage prevents showing one twice.
          if (latestPing.id !== lastSeen && (Date.now() - new Date(latestPing.timestamp).getTime() < 10 * 60 * 1000)) {
              setActivePing(latestPing);
          }
      }
  }, [data?.pings]);

  // Poll pings often (the full data reload only happens every 5 minutes)
  useEffect(() => {
      if (!currentUser) return;
      const pollPings = async () => {
          const pings = await fetchPings();
          if (pings.length === 0) return;
          setData(prev => {
              if (!prev) return prev;
              const prevLast = prev.pings?.[prev.pings.length - 1]?.id;
              const newLast = pings[pings.length - 1]?.id;
              return prevLast === newLast ? prev : { ...prev, pings };
          });
      };
      pollPings();
      const pingInterval = setInterval(pollPings, 15000); // 15s
      return () => clearInterval(pingInterval);
  }, [currentUser]);

  const dismissPing = () => {
      if (activePing) {
          localStorage.setItem('last_seen_ping_id', activePing.id);
          setActivePing(null);
      }
  };

  const handleSendPing = async () => {
      if (!currentUser || !pingMessage.trim()) return;
      const newPing: PingMessage = {
          id: Date.now().toString(),
          senderName: currentUser.name,
          message: pingMessage,
          timestamp: new Date().toISOString()
      };
      await sendPingMessage(newPing);
      setShowPingModal(false);
      setPingMessage('');
      
      // Optimistic update
      const newData = { ...data!, pings: [...(data?.pings || []), newPing] };
      setData(newData);
  };


  // Toggle theme class on body
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const d = normalizeData(await fetchData());
        setData(d);

        const savedUserId = localStorage.getItem('dashboard_user_id');
        if (savedUserId) {
            const savedUser = d.users.find(u => u.id === savedUserId);
            if (savedUser) setCurrentUser(savedUser);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setLoading(false);
      }
    };
    load();

    const interval = setInterval(async () => {
        try {
            const d = normalizeData(await fetchData());
            setData(d);
            setSelectedProject(prev => {
                if (!prev) return null;
                const updated = d.projects.find(p => p.id === prev.id);
                return updated || prev;
            });
        } catch (e) { console.error(e); }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const updatePresence = async () => {
        await pingPresence(currentUser.id);
        const onlines = await getOnlineUsers();
        setOnlineUsers(onlines);
    };

    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000); // 30s
    return () => clearInterval(presenceInterval);
  }, [currentUser]);

  // Set up custom event listener for creating project from sidebar
  useEffect(() => {
    const handleOpenCreate = (e: any) => {
        if (!data) return;
        const { title, reference, path, contacts } = e.detail;
        
        const newProject: Project = {
            id: Date.now().toString(),
            title: title || `Projet ${reference}`,
            ref: reference,
            reference: reference,
            summary: "Nouveau projet détecté sur le réseau.",
            description: "",
            status: "En cours",
            progress: 0,
            deadline: new Date().toISOString().split('T')[0],
            team: [],
            folderPath: path,
            likes: [],
            comments: [],
            image: `https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80`,
            pinnedBy: [],
            contacts: contacts || []
        };
        
        const newData = { ...data, users: data!.users, projects: [...data!.projects, newProject] };
        setData(newData);
        saveProject(newProject);
        
        // Open the modal for the user to finish editing
        setSelectedProject(newProject);
    };

    window.addEventListener('openCreateProject', handleOpenCreate);
    return () => window.removeEventListener('openCreateProject', handleOpenCreate);
  }, [data]);

  // Smart create listener
  useEffect(() => {
    const handleSmartCreate = async (e: any) => {
        const { reference } = e.detail;
        
        // Let's check folder
        import('./api').then(async ({ checkFolder }) => {
            const result = await checkFolder(reference);
            if (result.exists && result.path) {
                // Check if project exists
                const existingProject = data?.projects.find(p => (p.ref || p.reference) === reference);
                if (existingProject) {
                    window.alert("Un projet avec cette référence existe déjà sur le tableau de bord.");
                    setSelectedProject(existingProject);
                    return;
                }
                
                // Create smart project
                window.dispatchEvent(new CustomEvent('openCreateProject', { 
                    detail: { title: result.name, reference: reference, path: result.path, contacts: result.contacts } 
                }));
            } else {
                // Let user create manually but we could prefill it
                
                // Let user create manually but we could prefill it
                const newProject: Project = {
                    id: Date.now().toString(),
                    title: `Projet ${reference}`,
                    ref: reference,
                    reference: reference,
                    summary: "Nouveau projet.",
                    description: "",
                    status: "En cours",
                    progress: 0,
                    deadline: new Date().toISOString().split('T')[0],
                    team: [],
                    folderPath: "",
                    likes: [],
                    comments: [],
                    image: `https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80`,
                    pinnedBy: [],
                    contacts: []
                };
                
                const newData = { ...data, users: data!.users, projects: [...data!.projects, newProject] };
                setData(newData);
                saveProject(newProject);
                setSelectedProject(newProject);

            }
        });
    };

    window.addEventListener('initiateSmartCreate', handleSmartCreate);
    return () => window.removeEventListener('initiateSmartCreate', handleSmartCreate);
  }, [data]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('dashboard_user_id', user.id);
  };

  const handleUpdateWorkload = async (newWorkload: number) => {
    if (!data || !currentUser) return;
    const updatedUser = { ...currentUser, workload: newWorkload };
    const updatedUsers = data.users.map(u =>
      u.id === currentUser.id ? updatedUser : u
    );
    const newData = { ...data, users: updatedUsers };
    setData(newData);
    await saveUser(updatedUser);
    setCurrentUser({ ...currentUser, workload: newWorkload });
  };

  const handleSaveProject = async (edited: Project) => {
    if (!data) return;
    // Keep the live likes / comments / pins: the edited copy may be older.
    const current = data.projects.find(p => p.id === edited.id);
    const updatedProject: Project = current
      ? { ...edited, likes: current.likes, comments: current.comments, pinnedBy: current.pinnedBy }
      : edited;
    const updatedProjects = data.projects.map(p =>
      p.id === updatedProject.id ? updatedProject : p
    );
    const newData = { ...data, projects: updatedProjects };
    setData(newData);
    // The server keeps its own likes / comments / pins (see /api/project-action),
    // so this only saves the edited fields (title, phase, progress...).
    await saveProject(updatedProject);
    setSelectedProject(updatedProject);
  };

  // Replaces one project in the state with the version returned by the server
  const applyProject = (serverProject: Project) => {
    const p = normalizeProject(serverProject, data?.users || []);
    setData(prev => prev ? { ...prev, projects: prev.projects.map(x => x.id === p.id ? p : x) } : prev);
    setSelectedProject(prev => (prev && prev.id === p.id ? p : prev));
  };

  // Likes, pins and comments: small changes merged server-side, so two people
  // acting at the same time never erase each other's work.
  const handleProjectAction = async (project: Project, change: ProjectAction) => {
    if (!currentUser) return;
    const updated = await projectAction(project.id, currentUser, change);
    if (updated) {
      applyProject(updated);
    } else {
      alert("Impossible d'enregistrer la modification (lecteur Q: inaccessible ou projet supprimé). Réessayez.");
    }
  };

  const handleLikeProject = (project: Project) => handleProjectAction(project, { action: 'toggle-like' });
  const handlePinProject = (project: Project) => handleProjectAction(project, { action: 'toggle-pin' });

  const handleDeleteProject = async (projectId: string) => {
    if (!data) return;
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement ce projet ?")) {
      await deleteProject(projectId);
      const updatedProjects = data.projects.filter(p => p.id !== projectId);
      const newData = { ...data, projects: updatedProjects };
      setData(newData);
      setSelectedProject(null);
    }
  };

  const handleAddProject = async (prefill?: { ref: string, path: string }) => {
    if (!data) return;
    let projectTitle = "Nouveau Projet";
    if (prefill?.path) {
        const parts = prefill.path.split(/[\\/]/);
        projectTitle = parts[parts.length - 1] || `Projet ${prefill.ref}`;
    } else if (prefill?.ref) {
        projectTitle = `Projet ${prefill.ref}`;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      ref: prefill?.ref || `${new Date().getFullYear().toString().substr(-2)}.${Math.floor(Math.random() * 1000)}`,
      title: projectTitle,
      summary: "",
      description: "",
      team: [],
      deadline: new Date().toISOString().split('T')[0],
      status: "À faire",
      progress: 0,
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070", // Default nice image
      remarks: "",
      likes: [],
      comments: [],
      folderPath: prefill?.path || ""
    };

    const newData = { ...data, users: data!.users, projects: [...data!.projects, newProject] };
    setData(newData);
    await saveProject(newProject);
    setSelectedProject(newProject);
  };

  if (loading) return <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">Chargement...</div>;
  if (!data) return <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">Erreur de chargement.</div>;
  if (!currentUser) return <LoginModal data={data} onLogin={handleLogin} />;

  // --- Filtering & Sorting Logic ---

  // 1. Filter by Search Query
  const filteredProjects = data.projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.team.some(member => member.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 2. Filter by Phase
    const matchesPhase = phaseFilter === 'All' || p.status === phaseFilter;

    return matchesSearch && matchesPhase;
  });

  // 3. Hero projects — tous les projets triés par ID desc (plus récent en premier)
  const heroProjects = [...data.projects].sort((a, b) => parseInt(b.id) - parseInt(a.id));

  // 4. Group by Year
  const projectsByYear: Record<string, Project[]> = {};
  filteredProjects.forEach(p => {
      let year = 'Autres';
      if ((p.ref || '').match(/^\d{2}\./)) {
          year = '20' + (p.ref || '').split('.')[0];
      }
      if (!projectsByYear[year]) projectsByYear[year] = [];
      projectsByYear[year].push(p);
  });

  // Sort years descending (2025, 2024...)
  const sortedYears = Object.keys(projectsByYear).sort((a, b) => b.localeCompare(a));

  // "My List" (Pinned)
  const pinnedProjects = filteredProjects.filter(p => (p.pinnedBy || []).includes(currentUser.id));

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#141414] text-white selection:bg-red-600 selection:text-white' : 'bg-gray-100 text-gray-900 selection:bg-indigo-200 selection:text-indigo-900'} font-sans overflow-x-hidden transition-colors duration-300`}>
      
      {/* Sidebar */}
      <Sidebar
        user={currentUser}
        data={data}
        onUpdateWorkload={handleUpdateWorkload}
        onSearch={setSearchQuery}
        onOpenPing={() => setShowPingModal(true)}
        onAddProject={handleAddProject}
        onDataUpdate={setData}
        viewMode="carousel" // Locked to carousel for Netflix style
        onToggleView={() => {}} 
        statusFilter={phaseFilter} // We use this for phase filter sync if needed, but sidebar has its own selector? 
        // Sidebar's selector was for status. We can reuse it or ignore it. 
        // Let's reuse it to control the 'phaseFilter' state.
        onStatusFilterChange={setPhaseFilter}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onlineUsers={onlineUsers}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Content */}
      <main 
        className={`transition-all duration-300 min-h-screen flex flex-col ${sidebarCollapsed ? 'ml-20' : 'ml-80'}`}
      >
        {/* Hero Section */}
        {heroProjects.length > 0 && !searchQuery && phaseFilter === 'All' && (
            <HeroSection projects={heroProjects} onMoreInfo={setSelectedProject} />
        )}

        {/* Phase Filter Bar (Sticky?) */}
        <div className={`sticky top-0 z-30 ${theme === 'dark' ? 'bg-[#141414]/90 border-gray-800' : 'bg-white/90 border-gray-200'} backdrop-blur-md px-8 md:px-16 py-4 flex items-center gap-4 overflow-x-auto border-b scrollbar-hide`}>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Phases:</span>
            {['All', 'APS', 'APD', 'PDE', 'PDD', 'EXE', 'RECEP', 'En cours'].map(phase => (
                <button
                    key={phase}
                    onClick={() => setPhaseFilter(phase)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                        phaseFilter === phase 
                        ? (theme === 'dark' ? 'bg-white text-black scale-105' : 'bg-indigo-600 text-white scale-105')
                        : (theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900')
                    }`}
                >
                    {phase === 'All' ? 'Tout' : phase}
                </button>
            ))}
        </div>

        {/* Content Rows */}
        <div className="pb-20 pt-8 space-y-8">
            
            {/* Search Results / Filter Active Message */}
            {(searchQuery || phaseFilter !== 'All') && (
                <div className="px-8 md:px-16">
                    <h2 className="text-2xl font-bold mb-4">
                        {searchQuery ? `Résultats pour "${searchQuery}"` : `Projets en phase: ${phaseFilter}`}
                    </h2>
                </div>
            )}

            {/* Pinned Projects Row (if any) */}
            {pinnedProjects.length > 0 && !searchQuery && phaseFilter === 'All' && (
                <ProjectRow 
                    title="Ma Liste" 
                    projects={pinnedProjects}
                    onProjectClick={setSelectedProject}
                    currentUser={currentUser}
                    onLike={handleLikeProject}
                    onPin={handlePinProject}
                />
            )}

            {/* Year Rows */}
            {sortedYears.map(year => (
                <ProjectRow 
                    key={year}
                    title={`Année ${year}`}
                    projects={projectsByYear[year]}
                    onProjectClick={setSelectedProject}
                    currentUser={currentUser}
                    onLike={handleLikeProject}
                    onPin={handlePinProject}
                />
            ))}

            {filteredProjects.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    <p>Aucun projet trouvé.</p>
                </div>
            )}
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectModal
            project={selectedProject}
            currentUser={currentUser}
            isOpen={!!selectedProject}
            onClose={() => setSelectedProject(null)}
            onSave={handleSaveProject}
            onDelete={handleDeleteProject}
            allUsers={data.users}
            onLike={handleLikeProject}
            onAction={(change) => handleProjectAction(selectedProject, change)}
          />
        )}
      </AnimatePresence>

      {/* Ping Input Modal */}
      <AnimatePresence>
          {showPingModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-900 border border-indigo-500/30 p-6 rounded-2xl shadow-2xl max-w-md w-full"
              >
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span>🔔</span> Pinger l'équipe
                  </h3>
                  <textarea
                      className="w-full h-32 p-3 bg-gray-800 rounded-lg border border-gray-700 text-white resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-4"
                      placeholder="Votre message important pour toute l'équipe..."
                      value={pingMessage}
                      onChange={(e) => setPingMessage(e.target.value)}
                  ></textarea>
                  <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowPingModal(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                          Annuler
                      </button>
                      <button onClick={handleSendPing} disabled={!pingMessage.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 transition-colors">
                          Envoyer le Ping
                      </button>
                  </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>

      {/* Active Ping Alert */}
      <AnimatePresence>
          {activePing && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 p-[2px] rounded-2xl shadow-2xl pointer-events-auto max-w-lg w-full"
              >
                  <div className="bg-gray-900 p-6 rounded-xl relative overflow-hidden">
                      {/* Flashing background effect */}
                      <motion.div 
                        className="absolute inset-0 bg-indigo-500/20"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      
                      <div className="relative z-10 flex flex-col items-center text-center">
                          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 text-3xl animate-bounce">
                              🔔
                          </div>
                          <h2 className="text-2xl font-bold text-white mb-2">Ping de {activePing.senderName}</h2>
                          <p className="text-gray-300 text-lg mb-6">{activePing.message}</p>
                          <button 
                            onClick={dismissPing}
                            className="bg-white text-indigo-900 font-bold px-8 py-3 rounded-full hover:scale-105 transition-transform"
                          >
                              J'ai compris
                          </button>
                      </div>
                  </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>

    </div>
  );
}

export default App;

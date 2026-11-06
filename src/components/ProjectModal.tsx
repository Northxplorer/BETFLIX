import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CheckCircle, Clock, AlertCircle, Edit2, Save, FolderOpen, Heart, MessageSquare, Send, Trash2, Users } from 'lucide-react';
import type { Project, User, Comment, ProjectAction } from "../types";
import { hasLiked } from "../types";
import { openFolder } from '../api';

interface ProjectModalProps {
  project: Project;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProject: Project) => void;
  onDelete: (projectId: string) => void;
  allUsers: User[];
  onLike: (project: Project) => void;
  onAction: (change: ProjectAction) => Promise<void>;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, currentUser, isOpen, onClose, onSave, onDelete, onLike, onAction }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'address' | 'contacts' | 'importantInfo'>('address');
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only update the edited project if we are NOT in editing mode
    // This prevents overwriting user input during auto-updates
    if (!isEditing) {
        setEditedProject(project);
        setEditingCommentId(null);
    }
  }, [project, isEditing]);

  const handleSave = () => {
    onSave(editedProject);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(project.id);
  };

  const handleJoinProject = () => {
    if (editedProject.team.includes(currentUser.name)) {
      setEditedProject({
        ...editedProject,
        team: editedProject.team.filter(name => name !== currentUser.name)
      });
    } else {
      setEditedProject({
        ...editedProject,
        team: [...editedProject.team, currentUser.name]
      });
    }
  };

  const handleOpenFolder = () => {
    if (project.folderPath) {
      openFolder(project.folderPath);
    } else {
      alert("Aucun dossier associé à ce projet.");
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: currentUser.name,
      text: newComment,
      date: new Date().toISOString(),
      likes: []
    };

    setNewComment('');
    onAction({ action: 'add-comment', comment });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce commentaire ?")) return;
    onAction({ action: 'delete-comment', commentId });
  };

  const handleStartEditComment = (comment: Comment) => {
      setEditingCommentId(comment.id);
      setEditingCommentText(comment.text);
  };

  const handleSaveEditComment = (commentId: string) => {
      setEditingCommentId(null);
      onAction({ action: 'edit-comment', commentId, text: editingCommentText });
  };

  // Likes and comments are always read from `project` (the latest server
  // version), not from `editedProject`, so they stay live even in edit mode.
  const handleLike = () => {
    onLike(project);
  };

  const handleLikeComment = (commentId: string) => {
    onAction({ action: 'toggle-comment-like', commentId });
  };

  const isInTeam = editedProject.team.includes(currentUser.name);
  const isLiked = hasLiked(project.likes, currentUser.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-5xl bg-[#181818] text-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-800"
          >
            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">

              {/* Header Image & Title */}
              <div className="relative h-64 sm:h-80">
                <img
                  src={editedProject.image}
                  alt={editedProject.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full text-white transition-colors z-10"
                >
                  <X size={24} />
                </button>

                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                          Ref: {editedProject.ref}
                        </span>
                        {project.folderPath && (
                           <button
                            onClick={handleOpenFolder}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 transition-colors"
                            title={project.folderPath}
                           >
                             <FolderOpen size={12} /> Ouvrir Dossier
                           </button>
                        )}
                      </div>

                      {isEditing ? (
                        <input
                          className="text-4xl sm:text-5xl font-bold text-white mb-2 bg-transparent border-b border-white/50 w-full outline-none"
                          value={editedProject.title}
                          onChange={(e) => setEditedProject({...editedProject, title: e.target.value})}
                        />
                      ) : (
                        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2 leading-tight drop-shadow-lg">
                          {editedProject.title}
                        </h2>
                      )}
                    </div>

                    <div className="flex gap-2">
                       {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2 transition-colors"
                        >
                          <Edit2 size={18} /> Modifier
                        </button>
                      )}
                      <button
                        onClick={handleLike}
                        className={`px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2 transition-colors ${
                          isLiked ? 'bg-pink-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                      >
                        <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                        {project.likes?.length || 0}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Body */}
              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Left Column: Details & Comments */}
                <div className="lg:col-span-2 space-y-8">

                  {/* Status Bar */}
                  <div className="flex flex-wrap gap-4 pb-6 border-b border-gray-800">
                     <div className="bg-indigo-900/30 px-4 py-2 rounded-xl flex items-center gap-2 text-indigo-300">
                        <Calendar size={18} />
                        {isEditing ? (
                          <input
                            type="date"
                            className="bg-transparent border-b border-indigo-300 outline-none"
                            value={editedProject.deadline}
                            onChange={(e) => setEditedProject({...editedProject, deadline: e.target.value})}
                          />
                        ) : (
                          <span className="font-medium">Deadline: {editedProject.deadline}</span>
                        )}
                      </div>

                      <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${
                        editedProject.status === 'Terminé' ? 'bg-green-900/30 text-green-300' :
                        editedProject.status === 'En cours' ? 'bg-blue-900/30 text-blue-300' :
                        'bg-yellow-900/30 text-yellow-300'
                      }`}>
                        {editedProject.status === 'Terminé' ? <CheckCircle size={18} /> :
                        editedProject.status === 'En cours' ? <Clock size={18} /> : <AlertCircle size={18} />}

                        {isEditing ? (
                          <select
                            className="bg-transparent border-none outline-none font-medium text-white [&>option]:bg-[#181818] [&>option]:text-white"
                            value={editedProject.status}
                            onChange={(e) => {
                                const newStatus = e.target.value as Project['status'];
                                let newProgress = editedProject.progress;
                                
                                switch (newStatus) {
                                    case 'À faire': newProgress = 0; break;
                                    case 'APS': newProgress = 10; break;
                                    case 'APD': newProgress = 30; break;
                                    case 'PDE': newProgress = 40; break;
                                    case 'PDD': newProgress = 50; break;
                                    case 'Soum': newProgress = 60; break;
                                    case 'Chantier': newProgress = 70; break;
                                    case 'EXE': newProgress = 80; break;
                                    case 'RECEP': newProgress = 90; break;
                                    case 'Terminé': newProgress = 100; break;
                                    default: break;
                                }

                                setEditedProject({
                                    ...editedProject, 
                                    status: newStatus,
                                    progress: newProgress
                                });
                            }}
                          >
                            <option value="En cours">En cours</option>
                            <option value="À faire">À faire</option>
                            <option value="En pause">En pause</option>
                            <option value="Terminé">Terminé</option>
                            <option value="---" disabled>---</option>
                            <option value="APS">APS</option>
                            <option value="APD">APD</option>
                            <option value="PDE">PDE</option>
                            <option value="PDD">PDD</option>
                            <option value="Soum">Soum</option>
                            <option value="Chantier">Chantier</option>
                            <option value="EXE">EXE</option>
                            <option value="RECEP">RECEP</option>
                          </select>
                        ) : (
                          <span className="font-medium">Status: {editedProject.status}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-[200px] bg-gray-800 px-4 py-2 rounded-xl flex items-center gap-3">
                         <span className="text-sm font-medium text-gray-400 whitespace-nowrap">Progression:</span>
                         {isEditing ? (
                            <div className="flex items-center gap-4 flex-1 justify-center">
                                <button
                                    className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xl hover:bg-gray-600 transition-colors"
                                    onClick={() => setEditedProject({...editedProject, progress: Math.max(0, editedProject.progress - 5)})}
                                >-</button>

                                <div className="text-2xl font-bold text-indigo-400 w-16 text-center">
                                    {editedProject.progress}%
                                </div>

                                <button
                                    className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xl hover:bg-gray-600 transition-colors"
                                    onClick={() => setEditedProject({...editedProject, progress: Math.min(100, editedProject.progress + 5)})}
                                >+</button>
                            </div>
                         ) : (
                            <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-600 rounded-full"
                                        style={{ width: `${editedProject.progress}%` }}
                                    />
                                </div>
                                <span className="font-bold text-indigo-600 text-sm">{editedProject.progress}%</span>
                            </div>
                         )}
                      </div>
                  </div>

                  {project.contacts && project.contacts.length > 0 && (
                                    <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                            <Users size={18} className="text-blue-400" />
                                            Contacts du Projet
                                        </h3>
                                        <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                                            {(Array.isArray(project.contacts) ? project.contacts : []).map((contact: string, idx: number) => (
                                                <li key={idx} className="cursor-pointer hover:text-white" onClick={() => window.alert(`Le contact se trouve dans le dossier du projet : ${contact}`)}>
                                                    {contact}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Description */}
                  <section>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      Description du Projet
                    </h3>
                    {isEditing ? (
                      <div className="space-y-4">
                        <textarea
                          className="w-full h-32 p-4 bg-gray-800 rounded-xl border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-300"
                          value={editedProject.description}
                          onChange={(e) => setEditedProject({...editedProject, description: e.target.value})}
                          placeholder="Description..."
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Image URL</label>
                          <input
                            type="text"
                            className="w-full p-3 bg-gray-800 rounded-xl border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                            value={editedProject.image}
                            onChange={(e) => setEditedProject({...editedProject, image: e.target.value})}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-300 leading-relaxed text-lg">
                        {editedProject.description}
                      </p>
                    )}
                  </section>

                  {/* Comments Section */}
                  <section className="bg-gray-800/50 p-6 rounded-2xl border border-gray-800">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <MessageSquare size={20} /> Commentaires ({project.comments?.length || 0})
                    </h3>

                    <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {project.comments?.length === 0 && (
                        <p className="text-gray-400 italic text-center py-4">Soyez le premier à commenter !</p>
                      )}
                      {project.comments?.map((comment) => {
                        const isCommentLiked = comment.likes?.includes(currentUser.id);
                        const isAuthor = comment.user === currentUser.name; // Or check ID if available in comment

                        return (
                            <div key={comment.id} className="bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-700 group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-indigo-400">{comment.user}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{new Date(comment.date).toLocaleDateString()}</span>
                                    {(isAuthor) && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleStartEditComment(comment)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {editingCommentId === comment.id ? (
                                <div className="mb-2">
                                    <input
                                        className="w-full p-2 border border-indigo-300 rounded text-sm bg-gray-700 text-white"
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEditComment(comment.id);
                                            if (e.key === 'Escape') setEditingCommentId(null);
                                        }}
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500">Annuler</button>
                                        <button onClick={() => handleSaveEditComment(comment.id)} className="text-xs text-indigo-400 font-bold">Sauvegarder</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-300 text-sm mb-2">{comment.text}</p>
                            )}

                            <button
                                onClick={() => handleLikeComment(comment.id)}
                                className={`text-xs flex items-center gap-1 ${isCommentLiked ? 'text-pink-600' : 'text-gray-400 hover:text-pink-500'} transition-colors`}
                            >
                                <Heart size={12} fill={isCommentLiked ? "currentColor" : "none"} /> {comment.likes?.length || 0}
                            </button>
                            </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <input
                        ref={commentInputRef}
                        type="text"
                        className="flex-1 p-3 bg-gray-800 rounded-xl border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white"
                        placeholder="Ajouter un commentaire..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      <button
                        onClick={handleAddComment}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </section>
                </div>

                {/* Right Column: Sidebar Actions */}
                <div className="space-y-8">

                  {/* Team */}
                  <section className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Équipe</h3>
                    <div className="space-y-4">
                      {editedProject.team.map((member, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-700 p-3 rounded-xl shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 font-bold">
                            {member.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-200">{member}</span>
                        </div>
                      ))}

                      {isEditing && (
                         <button
                          onClick={handleJoinProject}
                          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            isInTeam
                            ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                            : 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50'
                          }`}
                        >
                          {isInTeam ? (
                            <>Se retirer du projet</>
                          ) : (
                            <>Rejoindre le projet</>
                          )}
                        </button>
                      )}
                    </div>
                  </section>

                   {/* Project Info Tabs */}
                   <section className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Infos Projet</h3>
                    <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
                        <button 
                            onClick={() => setActiveTab('address')}
                            className={`px-3 py-1 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'address' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Adresse
                        </button>
                        <button 
                            onClick={() => setActiveTab('contacts')}
                            className={`px-3 py-1 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'contacts' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Contacts
                        </button>
                        <button 
                            onClick={() => setActiveTab('importantInfo')}
                            className={`px-3 py-1 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'importantInfo' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Infos Importantes
                        </button>
                    </div>

                    <div className="min-h-[100px]">
                        {activeTab === 'address' && (
                            isEditing ? (
                                <textarea
                                    className="w-full h-24 p-3 bg-gray-900 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-300 text-sm"
                                    value={editedProject.address || ''}
                                    onChange={(e) => setEditedProject({...editedProject, address: e.target.value})}
                                    placeholder="Adresse du projet..."
                                />
                            ) : (
                                <div className="text-gray-300 text-sm italic whitespace-pre-wrap">
                                    {editedProject.address || "Aucune adresse renseignée."}
                                </div>
                            )
                        )}
                        {activeTab === 'contacts' && (
                            isEditing ? (
                                <textarea
                                    className="w-full h-24 p-3 bg-gray-900 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-300 text-sm"
                                    value={Array.isArray(editedProject.contacts) ? editedProject.contacts.join(', ') : (editedProject.contacts || '')}
                                    onChange={(e) => setEditedProject({...editedProject, contacts: e.target.value.split(', ')})}
                                    placeholder="Contacts du projet (noms, emails, téléphones)..."
                                />
                            ) : (
                                <div className="text-gray-300 text-sm italic whitespace-pre-wrap">
                                    {editedProject.contacts || "Aucun contact renseigné."}
                                </div>
                            )
                        )}
                        {activeTab === 'importantInfo' && (
                            isEditing ? (
                                <textarea
                                    className="w-full h-24 p-3 bg-yellow-900/20 rounded-lg border border-yellow-800 focus:ring-2 focus:ring-yellow-500 outline-none resize-none text-gray-300 text-sm"
                                    value={editedProject.importantInfo || editedProject.remarks || ''}
                                    onChange={(e) => setEditedProject({...editedProject, importantInfo: e.target.value, remarks: e.target.value})}
                                    placeholder="Informations importantes / Remarques..."
                                />
                            ) : (
                                <div className="bg-yellow-900/10 p-4 rounded-lg border border-yellow-900/30 text-gray-300 text-sm italic whitespace-pre-wrap">
                                    {editedProject.importantInfo || editedProject.remarks || "Aucune information importante pour le moment."}
                                </div>
                            )
                        )}
                    </div>
                  </section>

                  {isEditing && (
                    <div className="flex flex-col gap-3 sticky bottom-4">
                      <button
                        onClick={handleSave}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-none transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={20} /> Enregistrer
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full py-3 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={20} /> Supprimer le projet
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedProject(project);
                        }}
                        className="w-full py-3 bg-gray-700 text-white rounded-xl font-bold transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProjectModal;

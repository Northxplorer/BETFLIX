import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, MessageSquare, Heart, ThumbsUp } from 'lucide-react';
import type { Project } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, projects }) => {
  const [activeTab, setActiveTab] = useState<'likes' | 'comments' | 'reviews'>('likes');

  // Sort projects by likes
  const topLikedProjects = [...projects]
    .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
    .slice(0, 5);

  // Sort projects by number of comments
  const topCommentedProjects = [...projects]
    .sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0))
    .slice(0, 5);

  // Get top liked comments across all projects
  // We need to properly access likes. Since likes on comments are string[], .length is fine.
  const topReviews = projects
    .flatMap(p => (p.comments || []).map(c => ({ 
        ...c, 
        projectTitle: p.title, 
        projectImage: p.image 
    })))
    .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
    .slice(0, 5);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#181818] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-800 text-white"
          >
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-yellow-500" /> Rapport d'Activité
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-xl overflow-x-auto border border-gray-800">
                <button
                  onClick={() => setActiveTab('likes')}
                  className={`flex-1 py-2 px-3 whitespace-nowrap rounded-lg font-medium transition-all flex justify-center items-center gap-2 ${
                    activeTab === 'likes'
                      ? 'bg-gray-700 shadow-sm text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Heart size={16} /> Top Projets
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 py-2 px-3 whitespace-nowrap rounded-lg font-medium transition-all flex justify-center items-center gap-2 ${
                    activeTab === 'comments'
                       ? 'bg-gray-700 shadow-sm text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <MessageSquare size={16} /> +Discutés
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 py-2 px-3 whitespace-nowrap rounded-lg font-medium transition-all flex justify-center items-center gap-2 ${
                    activeTab === 'reviews'
                       ? 'bg-gray-700 shadow-sm text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <ThumbsUp size={16} /> Top Avis
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'likes' && topLikedProjects.map((project, index) => (
                  <div key={project.id} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors border border-gray-800">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold shrink-0 ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      index === 1 ? 'bg-gray-500/20 text-gray-400' :
                      index === 2 ? 'bg-orange-500/20 text-orange-500' :
                      'bg-gray-700 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <img src={project.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-900" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{project.title}</h3>
                      <p className="text-xs text-gray-400">{project.team.length} membres</p>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-lg text-pink-500">
                      <Heart size={20} fill="currentColor" /> {project.likes?.length || 0}
                    </div>
                  </div>
                ))}

                {activeTab === 'comments' && topCommentedProjects.map((project, index) => (
                  <div key={project.id} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors border border-gray-800">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold shrink-0 ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      index === 1 ? 'bg-gray-500/20 text-gray-400' :
                      index === 2 ? 'bg-orange-500/20 text-orange-500' :
                      'bg-gray-700 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <img src={project.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-900" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{project.title}</h3>
                      <p className="text-xs text-gray-400">{project.comments?.length || 0} messages</p>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-lg text-blue-500">
                      <MessageSquare size={20} /> {project.comments?.length || 0}
                    </div>
                  </div>
                ))}

                {activeTab === 'reviews' && topReviews.map((comment, index) => (
                  <div key={`${comment.id}-${index}`} className="flex flex-col gap-2 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors border border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs shrink-0 ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        index === 1 ? 'bg-gray-500/20 text-gray-400' :
                        index === 2 ? 'bg-orange-500/20 text-orange-500' :
                        'bg-gray-700 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <img src={comment.projectImage} alt="" className="w-8 h-8 rounded bg-gray-900 object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-white truncate">{comment.user}</span>
                          <span className="text-xs text-gray-500">{comment.projectTitle}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 italic pl-9">"{comment.text}"</p>
                    <div className="flex justify-end items-center gap-1 text-sm font-bold text-indigo-400">
                      <ThumbsUp size={14} /> {comment.likes?.length || 0} likes
                    </div>
                  </div>
                ))}

                {((activeTab === 'likes' && topLikedProjects.length === 0) ||
                  (activeTab === 'comments' && topCommentedProjects.length === 0) ||
                  (activeTab === 'reviews' && topReviews.length === 0)) && (
                   <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                     <Trophy size={48} className="mb-4 opacity-20" />
                     <p>Aucune donnée disponible pour le moment.</p>
                   </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;

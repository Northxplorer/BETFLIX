import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, FolderOpen, Play, Plus, Check } from 'lucide-react';
import type { Project, User } from "../types";
import { hasLiked } from "../types";
import { openFolder } from '../api';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
  currentUser: User;
  onLike: (project: Project) => void;
  onPin: (project: Project) => void;
  onMove?: (project: Project, direction: 'left' | 'right') => void; // Optional now
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, currentUser, onLike, onPin }) => {
  const [isHovered, setIsHovered] = useState(false);

  const isLiked = hasLiked(project.likes, currentUser.id);
  const isPinned = (project.pinnedBy || []).includes(currentUser.id);
  
  // Calculate delay based on status/deadline? No, just visual.
  
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike(project);
    // Optimistic update logic is in parent or managed by data reload, 
    // but here we just trigger the prop.
  };

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.folderPath) {
      openFolder(project.folderPath);
    }
  };

  return (
    <motion.div
      className="relative flex-shrink-0 w-[300px] sm:w-[350px] aspect-video rounded-md cursor-pointer transition-all duration-300 z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ 
        scale: 1.15,
        zIndex: 50,
        transition: { duration: 0.3, delay: 0.2 } // Slight delay before popping out
      }}
      onClick={() => onClick(project)}
    >
        {/* Background Image */}
        <div className="absolute inset-0 rounded-md overflow-hidden shadow-lg bg-gray-800">
            <img 
                src={project.image} 
                alt={project.title} 
                className="w-full h-full object-cover"
                loading="lazy"
            />
            {/* Gradient Overlay (Always visible at bottom, stronger on hover) */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-80'}`} />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 p-4 flex flex-col justify-end">
             {/* Title - Always visible but moves up on hover */}
             <motion.h3 
                className="text-white font-bold text-lg drop-shadow-md line-clamp-1 mb-1"
                layout
             >
                 {project.title}
             </motion.h3>

             {/* Details - Only visible on Hover */}
             <AnimatePresence>
                 {isHovered && (
                     <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                     >
                         {/* Action Buttons */}
                         <div className="flex items-center gap-2 mb-2">
                             <button 
                                onClick={(e) => { e.stopPropagation(); onClick(project); }}
                                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors"
                                title="Ouvrir Fiche"
                             >
                                 <Play size={12} fill="currentColor" />
                             </button>
                             
                             {project.folderPath && (
                                <button 
                                    onClick={handleOpenFolder}
                                    className="w-8 h-8 rounded-full border-2 border-gray-400 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors"
                                    title="Ouvrir Dossier"
                                >
                                    <FolderOpen size={12} />
                                </button>
                             )}

                             <button 
                                onClick={(e) => { e.stopPropagation(); onPin(project); }}
                                className="w-8 h-8 rounded-full border-2 border-gray-400 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors"
                                title={isPinned ? "Retirer de ma liste" : "Ajouter à ma liste"}
                            >
                                {isPinned ? <Check size={14} /> : <Plus size={14} />}
                            </button>

                             <button 
                                onClick={(e) => { e.stopPropagation(); handleLike(e); }}
                                className="w-8 h-8 rounded-full border-2 border-gray-400 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors ml-auto"
                            >
                                {isLiked ? <Heart size={14} fill="currentColor" className="text-red-500 border-none" /> : <Heart size={14} />}
                             </button>
                         </div>

                         {/* Metadata */}
                         <div className="flex items-center gap-2 text-[10px] text-gray-300 font-semibold">
                             <span className="text-green-400">{project.progress}% Recommandé</span>
                             <span className="border border-gray-600 px-1 rounded text-[9px]">{project.status}</span>
                             <span>{project.deadline}</span>
                         </div>

                         {/* Tags / Team */}
                         <div className="flex items-center gap-1 text-[10px] text-gray-400 line-clamp-1">
                             {project.team.map((m, i) => (
                                 <span key={i} className="after:content-['•'] after:mx-1 last:after:content-['']">{m}</span>
                             ))}
                         </div>
                     </motion.div>
                 )}
             </AnimatePresence>
        </div>
    </motion.div>
  );
};

export default ProjectCard;

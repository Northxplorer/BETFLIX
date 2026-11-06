import React from 'react';
import type { Project, User } from '../types';
import ProjectCard from './ProjectCard';
import { motion } from 'framer-motion';

interface GridViewProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  currentUser: User;
  onLike: (project: Project) => void;
  onPin: (project: Project) => void;
  onMove: (project: Project, direction: 'left' | 'right') => void;
}

const GridView: React.FC<GridViewProps> = ({ projects, onProjectClick, currentUser, onLike, onPin, onMove }) => {
  return (
    <div className="w-full h-full overflow-y-auto p-8 custom-scrollbar">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={onProjectClick}
            currentUser={currentUser}
            onLike={onLike}
            onPin={onPin}
            onMove={onMove}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default GridView;

import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project, User } from '../types';
import ProjectCard from './ProjectCard';

interface ProjectRowProps {
  title: string;
  projects: Project[];
  onProjectClick: (project: Project) => void;
  currentUser: User;
  onLike: (project: Project) => void;
  onPin: (project: Project) => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ title, projects, onProjectClick, currentUser, onLike, onPin }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
      if (rowRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
          setShowLeftArrow(scrollLeft > 0);
          setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
      }
  };

  const scroll = (direction: 'left' | 'right') => {
      if (rowRef.current) {
          const { clientWidth } = rowRef.current;
          const scrollAmount = clientWidth * 0.8; // Scroll 80% of view
          rowRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      }
  };

  if (projects.length === 0) return null;

  return (
    <div className="mb-8 pl-8 md:pl-16 lg:pl-24 relative group">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4 hover:text-indigo-400 transition-colors cursor-pointer inline-block">
        {title}
        <span className="ml-2 text-sm font-normal text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">Explorer tout &gt;</span>
      </h2>
      
      <div className="relative group/row">
          {/* Left Arrow */}
          <div 
            className={`absolute left-0 top-0 bottom-0 w-12 bg-black/50 z-20 flex items-center justify-center cursor-pointer opacity-0 group-hover/row:opacity-100 transition-opacity ${!showLeftArrow && 'hidden'}`}
            onClick={() => scroll('left')}
          >
              <ChevronLeft size={40} className="text-white hover:scale-125 transition-transform" />
          </div>

          {/* Cards Container */}
          <div 
            ref={rowRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-8 px-4 -ml-4 scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {projects.map((project) => (
                <div key={project.id} className="snap-start">
                    <ProjectCard
                        project={project}
                        onClick={onProjectClick}
                        currentUser={currentUser}
                        onLike={onLike}
                        onPin={onPin}
                    />
                </div>
            ))}
          </div>

          {/* Right Arrow */}
          <div 
            className={`absolute right-0 top-0 bottom-0 w-12 bg-black/50 z-20 flex items-center justify-center cursor-pointer opacity-0 group-hover/row:opacity-100 transition-opacity ${!showRightArrow && 'hidden'}`}
            onClick={() => scroll('right')}
          >
              <ChevronRight size={40} className="text-white hover:scale-125 transition-transform" />
          </div>
      </div>
    </div>
  );
};

export default ProjectRow;

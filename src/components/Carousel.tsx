import React, { useEffect, useRef, useState } from 'react';
import type { Project, User } from '../types';
import ProjectCard from './ProjectCard';
import { motion } from 'framer-motion';

interface CarouselProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  currentUser: User;
  onLike: (project: Project) => void;
  onPin: (project: Project) => void;
  onMove: (project: Project, direction: 'left' | 'right') => void;
}

const Carousel: React.FC<CarouselProps> = ({ projects, onProjectClick, currentUser, onLike, onPin, onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll logic
  useEffect(() => {
    const scrollContainer = containerRef.current;
    if (!scrollContainer) return;

    const interval = setInterval(() => {
        if (!isPaused && scrollContainer) {
            // Check if we are at the end
            if (scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 10) {
                // Smooth scroll back to start
                scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                // Scroll one card width (approx 350px + margin)
                scrollContainer.scrollBy({ left: 350 + 32, behavior: 'smooth' });
            }
        }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isPaused, projects.length]);

  return (
    <div
        ref={containerRef}
        className="w-full h-full flex items-center overflow-x-auto py-12 px-4 snap-x snap-mandatory"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
    >
      <motion.div
        className="flex space-x-8 px-8 mx-auto"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
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

export default Carousel;

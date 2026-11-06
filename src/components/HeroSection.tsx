import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, FolderOpen, ChevronLeft, ChevronRight, Users, Calendar, BarChart2, Tag } from 'lucide-react';
import type { Project } from '../types';
import { openFolder } from '../api';

interface HeroSectionProps {
  projects: Project[];
  onMoreInfo: (project: Project) => void;
}

const INTERVAL_MS = 5000;

const statusColor: Record<string, string> = {
  'En cours': 'bg-green-600',
  'Terminé': 'bg-blue-600',
  'En pause': 'bg-yellow-600',
  'À faire': 'bg-gray-600',
  'APS': 'bg-purple-600',
  'APD': 'bg-purple-700',
  'PDE': 'bg-indigo-600',
  'PDD': 'bg-indigo-700',
  'EXE': 'bg-orange-600',
  'RECEP': 'bg-teal-600',
  'Soum': 'bg-pink-600',
  'Chantier': 'bg-red-600',
};

const HeroSection: React.FC<HeroSectionProps> = ({ projects, onMoreInfo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(((index % projects.length) + projects.length) % projects.length);
    setProgress(0);
  }, [projects.length]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Progress bar ticker
  useEffect(() => {
    if (paused || projects.length <= 1) return;
    const step = 100 / (INTERVAL_MS / 100);
    const ticker = setInterval(() => {
      setProgress(p => (p >= 100 ? 0 : p + step));
    }, 100);
    return () => clearInterval(ticker);
  }, [paused, projects.length, currentIndex]);

  // Auto-advance
  useEffect(() => {
    if (paused || projects.length <= 1) return;
    const timer = setInterval(goNext, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, projects.length, goNext]);

  if (!projects || projects.length === 0) return null;

  const project = projects[currentIndex];

  const handleOpenFolder = () => {
    if (project.folderPath) {
      openFolder(project.folderPath);
    } else {
      alert("Aucun dossier associé à ce projet.");
    }
  };

  const progressPercent = project.progress ?? 0;
  const teamDisplay = project.team?.slice(0, 4).join(', ') || '—';
  const deadline = project.deadline
    ? new Date(project.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div
      className="relative w-full h-[65vh] md:h-[75vh] lg:h-[82vh] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background crossfade */}
      <AnimatePresence mode="sync">
        <motion.div
          key={project.id + '-bg'}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={project.id}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-2xl space-y-4"
          >
            {/* Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-white text-xs font-bold px-3 py-1 rounded-full ${statusColor[project.status] ?? 'bg-gray-600'}`}>
                {project.status.toUpperCase()}
              </span>
              <span className="text-gray-400 font-mono text-sm tracking-widest">
                {project.ref}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white drop-shadow-lg leading-tight">
              {project.title}
            </h1>

            {/* Description */}
            <p className="text-base md:text-lg text-gray-300 line-clamp-2 max-w-xl drop-shadow-md">
              {project.description || project.summary || 'Aucune description disponible.'}
            </p>

            {/* Info pills */}
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <BarChart2 size={14} className="text-white/70" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Avancement</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-white text-xs font-bold">{progressPercent}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Users size={14} className="text-white/70" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Équipe</p>
                  <p className="text-white text-xs font-semibold mt-0.5 max-w-[140px] truncate">{teamDisplay}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Calendar size={14} className="text-white/70" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Échéance</p>
                  <p className="text-white text-xs font-semibold mt-0.5">{deadline}</p>
                </div>
              </div>

              {project.likes?.length > 0 && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                  <Tag size={14} className="text-white/70" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Appréciations</p>
                    <p className="text-white text-xs font-semibold mt-0.5">{project.likes.length}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handleOpenFolder}
                className="flex items-center gap-2 bg-white hover:bg-white/90 text-black px-6 py-3 rounded font-bold transition-colors text-base shadow-lg"
              >
                <FolderOpen size={20} fill="currentColor" />
                Ouvrir
              </button>
              <button
                onClick={() => onMoreInfo(project)}
                className="flex items-center gap-2 bg-gray-500/70 hover:bg-gray-500/50 text-white px-6 py-3 rounded font-bold backdrop-blur-sm transition-colors text-base"
              >
                <Info size={20} />
                Plus d'infos
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrows */}
      {projects.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-all z-10"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-all z-10"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Dots + progress */}
      {projects.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <div className="flex gap-2">
            {projects.map((p, i) => (
              <button
                key={p.id}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'bg-white w-6 h-2' : 'bg-white/40 hover:bg-white/60 w-2 h-2'
                }`}
              />
            ))}
          </div>
          <div className="w-32 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSection;

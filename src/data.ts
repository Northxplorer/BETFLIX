export interface Project {
  id: string;
  title: string;
  summary: string;
  description: string;
  team: string[];
  deadline: string;
  status: 'En cours' | 'Terminé' | 'En pause' | 'À faire';
  progress: number;
  technologies: string[];
  image: string;
}

export const projects: Project[] = [
  {
    id: '1',
    title: 'Refonte Site Web T2',
    summary: 'Modernisation de l\'interface utilisateur et amélioration de l\'expérience client.',
    description: 'Ce projet vise à refondre complètement le site web de l\'équipe T2. Nous allons utiliser les dernières technologies pour garantir une navigation fluide et un design attractif. L\'objectif est d\'augmenter le taux de conversion de 20%.',
    team: ['Alice', 'Bob', 'Charlie'],
    deadline: '2023-12-15',
    status: 'En cours',
    progress: 65,
    technologies: ['React', 'Tailwind', 'Node.js'],
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'App Mobile "T2 Connect"',
    summary: 'Application de communication interne pour l\'équipe.',
    description: 'Développement d\'une application mobile native pour faciliter la communication entre les membres de l\'équipe, partager des fichiers et gérer les plannings. Intégration avec Slack et Google Calendar.',
    team: ['David', 'Eve'],
    deadline: '2024-01-20',
    status: 'À faire',
    progress: 10,
    technologies: ['React Native', 'Firebase'],
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Dashboard Analytics',
    summary: 'Outil de visualisation des données de performance.',
    description: 'Création d\'un tableau de bord interactif pour suivre les KPIs de l\'équipe en temps réel. Graphiques dynamiques, exports PDF et alertes personnalisées.',
    team: ['Frank', 'Grace', 'Heidi'],
    deadline: '2023-11-30',
    status: 'Terminé',
    progress: 100,
    technologies: ['Vue.js', 'D3.js', 'Python'],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '4',
    title: 'Automatisation CI/CD',
    summary: 'Mise en place de pipelines de déploiement continu.',
    description: 'Optimisation du workflow de développement par l\'automatisation des tests et des déploiements. Réduction du temps de mise en production de 50%.',
    team: ['Ivan', 'Judy'],
    deadline: '2024-02-10',
    status: 'En cours',
    progress: 40,
    technologies: ['Docker', 'Kubernetes', 'Jenkins'],
    image: 'https://images.unsplash.com/photo-1618401471353-b74a58ad58b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '5',
    title: 'Migration Cloud',
    summary: 'Transfert de l\'infrastructure vers AWS.',
    description: 'Migration sécurisée de toutes les données et applications vers le cloud AWS. Amélioration de la scalabilité et de la sécurité.',
    team: ['Kevin', 'Liam', 'Mona'],
    deadline: '2024-03-01',
    status: 'En pause',
    progress: 25,
    technologies: ['AWS', 'Terraform'],
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
   {
    id: '6',
    title: 'IA Générative pour Support',
    summary: 'Chatbot intelligent pour le support client.',
    description: 'Implémentation d\'un chatbot basé sur un LLM pour répondre automatiquement aux questions fréquentes des clients. Apprentissage continu et escalade vers un humain si nécessaire.',
    team: ['Nina', 'Oscar'],
    deadline: '2024-04-15',
    status: 'À faire',
    progress: 0,
    technologies: ['OpenAI API', 'Python', 'LangChain'],
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
];

export interface Project {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  technologies: string[];
  githubUrl?: string;
  github?: string;
  liveUrl?: string;
  link?: string;
  imageUrl?: string;
  videoUrl?: string;
  featured?: boolean;
}

export interface SkillCategory {
  category: string;
  items: Array<{
    name: string;
    icon?: string;
  }>;
}

export interface PortfolioData {
  name: string;
  bio: string;
  skills: string[];
  skillCategories: SkillCategory[];
  projects: Project[];
  contact: {
    email: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    resume?: string;
  };
}

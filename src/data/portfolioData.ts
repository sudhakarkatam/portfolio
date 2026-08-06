export interface Project {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  github?: string;
  link?: string;
  imageUrl?: string;
  image?: string;
  images?: string[];
  videoUrl?: string;
  featured?: boolean;
  status?: string;
  category?: string;
  features?: string[];
  learnings?: string[];
}

export interface PortfolioData {
  name: string;
  title: string;
  bio: string;
  skills: Array<{ name: string; category: string; icon: string }>;
  projects: Project[];
  contact: {
    email: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    resume?: string;
  };
}

export const portfolioData: PortfolioData = {
  name: "Sudhakar Reddy Katam",
  title: "Aspiring Software Engineer | Building with AI & Web",
  bio: "I'm a developer who loves learning by building. I'm comfortable across the full stack and I like pushing myself to learn and build things . I am curious about tech and how it's going in this era, interested in both software and hardware  ",

  skills: [
    { name: "React", category: "Frontend", icon: "Code2" },
    { name: "JavaScript & TypeScript", category: "Frontend", icon: "FileCode" },
    { name: "Java", category: "Backend", icon: "Coffee" },
    { name: "HTML5/CSS3", category: "Frontend", icon: "Code2" },
    { name: "Node.js", category: "Backend", icon: "Server" },
    { name: "Python", category: "Backend", icon: "Code" },
    { name: "Spring Boot", category: "Backend", icon: "Coffee" },
    { name: "MySQL", category: "Database", icon: "Database" },
    { name: "Supabase", category: "Database", icon: "Database" },
    { name: "Firebase", category: "Database", icon: "Flame" },
    { name: "Git & GitHub", category: "Tools", icon: "GitBranch" },
    { name: "Docker", category: "Tools", icon: "Box" },
    { name: "AWS", category: "Tools", icon: "Cloud" },
    { name: "AI Tools", category: "Tools", icon: "Bot" },
  ],

  projects: [
    {
      id: "1",
      title: "Personal Tracker Application",
      description:
        "An android App designed to help users build habits, manage daily tasks, notes and journal, expense tracker, wellness trackers weekly and maintain streaks. Features include habit streak tracking, task management, progress visualization, and only offline app. Users can skip days without losing streaks",
      technologies: [
        "React",
        "TypeScript",
        "Capacitor",
        "IndexedDB",
        "Vite",
        "shadcn ui",
      ],
      github: "https://github.com/sudhakarkatam/tracker22",
      link: "https://github.com/sudhakarkatam/tracker22",
      status: "Live",
      category: "Productivity",
      features: [
        "To-do list with sub tasks",
        "Offline-first app",
        "Responsive mobile-friendly UI",
        "Progress visualization charts",
        "Task and habit management",
        "Streak and skip tracking system",
      ],
      images: ["/personal-tracker.jpeg", "/personal-tracker-1.jpeg"],
      image: "/personal-tracker.jpeg",
      learnings: [
        "Offline-first application development",
        "Mobile app performance optimization",
        "User habit formation psychology",
      ],
    },
    {
      id: "2",
      title: "Financial Calculators App",
      description:
        "A multi-calculator Progressive Web App providing various finance-related tools such as SIP, SWP, Compound Interest, and Loan EMI calculators. Built with a mobile-first design for Android live on playstore and iOS in future developments, integrated via Capacitor and optimized for performance.",
      technologies: [
        "React",
        "TypeScript",
        "Capacitor",
        "Vite",
        "Chart.js",
        "PWA",
      ],
      github: "https://github.com/sudhakarkatam/finance_cal",
      link: "https://play.google.com/store/apps/details?id=com.easecraft.financialcalculator",
      status: "Live",
      category: "FinTech",
      features: [
        "Multiple financial calculators (SIP, SWP, EMI, etc.)",
        "Interactive result charts and amortization tables",
        "Responsive layout for all screen sizes",
      ],
      images: ["/financial-calculator.jpeg", "/financial-calculator-1.jpeg"],
      image: "/financial-calculator.jpeg",
      learnings: [
        "Financial calculation algorithms",
        "Progressive Web App optimization",
        "Mobile-first responsive design",
      ],
    },
    {
      id: "3",
      title: "Ecommerce product recommendation",
      description:
        "An ecommerce platform that allows users to browse and purchase products. It features a product catalog and a blog section. It is divided in categories and subcategories also collections wise to make easier to choose products and also have a admin dashboard to manage the products and the blog section.",
      technologies: [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "Chart.js",
        "Supabase",
        "Vercel",
      ],
      github: "",
      link: "https://www.purevaluepicks.store",
      status: "Live",
      category: "E-Commerce",
      features: [
        "Curated and categorized product listings",
        "Admin dashboard for managing collections and content",
        "Supabase backend for scalable data management",
        "Responsive, modern UI with Tailwind CSS and Shadcn/UI",
        "Lazy loading and optimized images for performance",
      ],
      images: ["/placeholder.svg", "/placeholder.svg"],
      image: "/placeholder.svg",
      learnings: [
        "E-commerce platform architecture",
        "Database optimization for product catalogs",
        "Performance optimization techniques",
      ],
    },
    {
      id: "4",
      title: "Droply - Share Anything, Instantly",
      description:
        "A temporary file and content sharing platform with end-to-end encryption. Create password-protected rooms to share text, files, code snippets, and URLs with customizable expiry times. No registration required - just instant, secure sharing.",
      technologies: [
        "React",
        "TypeScript",
        "Supabase",
        "MySQL",
        "Vite",
        "shadcn/ui",
        "Tailwind CSS",
        "Web Crypto API",
      ],
      github: "https://github.com/sudhakarkatam/droply_app",
      link: "https://droply-app.netlify.app",
      status: "Live",
      category: "Productivity",
      features: [
        "Temporary rooms with customizable expiry times",
        "End-to-end encryption with password protection",
        "Share text, files, code snippets, and URLs",
        "No registration required",
      ],
      images: ["/placeholder.svg", "/placeholder.svg"],
      image: "/placeholder.svg",
      learnings: [
        "Web Crypto API implementation",
        "Client-side encryption strategies",
      ],
    },
  ],

  contact: {
    email: "sudhakarkatam777@gmail.com",
    github: "https://github.com/sudhakarkatam",
    linkedin: "https://www.linkedin.com/in/sudhakar-katam",
    twitter: "https://x.com/sudhakarkatam2",
    telegram: "https://t.me/Sudha7248",
    discord: "https://discord.com/users/sudhakar0379",
    resume: "https://drive.google.com/file/d/1qNzycHvflNO2lLynBD3ao9udHO0bJIYJ/view?usp=sharing",
  },
};

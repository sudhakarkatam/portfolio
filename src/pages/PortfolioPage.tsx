import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { portfolioData } from "@/data/portfolioData";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { SkillsSection } from "@/components/SkillsSection";
import { Contact } from "@/components/Contact";
import { motion, HTMLMotionProps } from "framer-motion";

export const PortfolioPage: React.FC = () => {
  const { name, bio, contact } = portfolioData;
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("about");
  
  // Manage theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("portfolio-theme");
    return (saved as "light" | "dark") || "dark";
  });

  // Handle initial route for /projects or #contact hash
  useEffect(() => {
    if (location.pathname === "/projects") {
      setActiveSection("projects");
      setTimeout(() => {
        const el = document.getElementById("projects");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
    } else if (location.hash === "#contact" || window.location.hash === "#contact" || window.location.href.includes("#contact")) {
      setActiveSection("contact");
      setTimeout(() => {
        const el = document.getElementById("contact");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
    }
  }, [location.pathname, location.hash]);

  // Dynamically crop browser tab title bar favicon into a perfect round circle
  useEffect(() => {
    const img = new Image();
    img.src = "/profile pic.png";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(img, 0, 0, size, size);

        let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.type = "image/png";
        link.href = canvas.toDataURL("image/png");
      }
    };
  }, []);

  // Sync dark class and save theme choice
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = "#0a0a0c";
      document.body.style.color = "#f4f4f5";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#fafafa";
      document.body.style.color = "#18181b";
    }
    localStorage.setItem("portfolio-theme", theme);
  }, [theme]);

  // Scroll spy listener
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["about", "skills", "contact"];
      const scrollPos = window.scrollY + 200;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigate = (id: string) => {
    if (id === "projects") {
      if (location.pathname !== "/projects") {
        navigate("/projects");
      }
    } else if (id === "contact") {
      setActiveSection("contact");
      if (location.pathname !== "/") {
        navigate("/#contact");
      } else {
        const el = document.getElementById("contact");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      setActiveSection(id);
      if (location.pathname !== "/") {
        navigate("/");
      } else {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }
  };

  const handleToggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const sectionAnimation: HTMLMotionProps<"div"> = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, ease: "easeOut" },
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0c] text-zinc-900 dark:text-[#f4f4f5] font-sans selection:bg-indigo-500/15 dark:selection:bg-indigo-500/20 selection:text-zinc-900 dark:selection:text-white relative transition-colors duration-300">
      
      {/* Subtle Background Grid overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-30"
        style={{
          backgroundImage: theme === "dark"
            ? `
              linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `
            : `
              linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
            `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)'
        }}
      />

      {/* Capsule Navigation Navbar */}
      <Navbar 
        activeSection={activeSection} 
        onNavigate={handleNavigate} 
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container aligned to 780px centered column */}
      <main className="relative z-10 mx-auto max-w-[780px] px-4 sm:px-6 pt-6 sm:pt-12 pb-24 sm:pb-12 space-y-14 sm:space-y-20">
        
        {/* Hero Section */}
        <Hero name={name} bio={bio} contact={contact} />

        {/* Section: About */}
        <motion.div {...sectionAnimation}>
          <AboutSection />
        </motion.div>

        {/* Section: Skills & Technologies */}
        <motion.div {...sectionAnimation}>
          <SkillsSection />
        </motion.div>

        {/* Section: Contact */}
        <motion.div {...sectionAnimation}>
          <Contact contact={contact} />
        </motion.div>

      </main>
    </div>
  );
};

export default PortfolioPage;

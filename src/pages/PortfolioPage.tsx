import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { portfolioData } from "@/data/portfolioData";
import { PageLayout } from "@/components/PageLayout";
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

  const sectionAnimation: HTMLMotionProps<"div"> = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, ease: "easeOut" },
  };

  return (
    <PageLayout activeSection={activeSection} onNavigate={handleNavigate}>

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
    </PageLayout>
  );
};

export default PortfolioPage;

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import PortfolioPage from "./pages/PortfolioPage";
import ProjectsPage from "./pages/ProjectsPage";
import NotFoundPage from "./pages/NotFoundPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Analytics />
      <SpeedInsights />
    </BrowserRouter>
  );
};

export default App;

import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import PortfolioPage from "./pages/PortfolioPage";

const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ResumePage = lazy(() => import("./pages/ResumePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

import { PortfolioChatbot } from "./components/chat/PortfolioChatbot";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Suspense fallback={
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0c] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <PortfolioChatbot />
      <Analytics />
      <SpeedInsights />
    </BrowserRouter>
  );
};

export default App;

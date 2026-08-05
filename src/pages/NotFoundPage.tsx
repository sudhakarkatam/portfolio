import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0c] text-zinc-900 dark:text-[#f4f4f5] font-sans flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* 404 Number */}
        <h1 className="text-8xl sm:text-9xl font-extrabold tracking-tighter text-zinc-200 dark:text-zinc-800">
          404
        </h1>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            Page not found
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Back Home Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-black font-bold text-sm rounded-full hover:scale-[1.03] transition-all shadow-lg"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

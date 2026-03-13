"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { useUI } from "@/components/UIProvider";

type ExpandingSearchDockProps = {
  onSearch?: (query: string) => void;
  placeholder?: string;
};

export function ExpandingSearchDock({
  onSearch,
  placeholder = "어떤 월드컵을 찾으시나요?",
}: ExpandingSearchDockProps) {
  const { 
    searchDockOpen: isExpanded, 
    openSearchDock, 
    closeSearchDock, 
    searchDockQuery: query, 
    setSearchDockQuery: setQuery,
    searchDockFilter,
    searchDockPlaceholder 
  } = useUI();

  const handleExpand = () => {
    openSearchDock();
  };

  const handleCollapse = () => {
    closeSearchDock();
    setQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim() !== '') {
      // 유저 검색어와 내부 숨김 필터를 결합하여 전송
      const finalQuery = searchDockFilter ? `${searchDockFilter}${query}` : query;
      onSearch(finalQuery);
      handleCollapse()
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.button
            key="icon"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => handleExpand()}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl transition-all hover:scale-110"
            style={{
              boxShadow: '0 10px 30px -10px color-mix(in srgb, var(--accent-1) 50%, transparent)',
            }}
          >
            <Search className="h-5 w-5" style={{ color: "var(--accent-1)" }} />
          </motion.button>
        ) : (
          <motion.form
            key="input"
            initial={{ width: 48, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 48, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            onSubmit={handleSubmit}
            className="relative"
          >
            <motion.div
              initial={{ backdropFilter: "blur(0px)" }}
              animate={{ backdropFilter: "blur(12px)" }}
              className="relative flex items-center gap-2 overflow-hidden rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-2xl"
              style={{
                boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-1) 20%, transparent), 0 20px 40px -10px color-mix(in srgb, var(--accent-1) 15%, transparent)',
              }}
            >
              <div className="ml-4">
                <Search className="h-4 w-4" style={{ color: "var(--accent-1)" }} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchDockPlaceholder || placeholder}
                autoFocus
                className="h-12 flex-1 bg-transparent pr-4 text-sm outline-none placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-50"
              />
              <motion.button
                type="button"
                onClick={handleCollapse}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </motion.button>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

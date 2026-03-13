"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useUI } from "@/components/UIProvider";

type ExpandingSearchDockProps = {
  onSearch?: (query: string) => void;
  placeholder?: string;
  // [추가] 외부 제어를 위한 props 추가
  value?: string;
  onChange?: (val: string) => void;
};

export function ExpandingSearchDock({
  onSearch,
  placeholder = "어떤 월드컵을 찾으시나요?",
  value: externalValue, // 외부에서 주는 값
  onChange: externalOnChange, // 외부에서 주는 변경 함수
}: ExpandingSearchDockProps) {
  const {
    searchDockOpen: isExpanded,
    openSearchDock,
    closeSearchDock,
    searchDockQuery: globalQuery,
    setSearchDockQuery: setGlobalQuery,
    searchDockFilter,
    searchDockPlaceholder
  } = useUI();

  // [핵심] 외부 값이 있으면 쓰고, 없으면 전역 상태를 씀 (하이브리드)
  const currentQuery = externalValue !== undefined ? externalValue : globalQuery;

  const handleExpand = () => {
    openSearchDock();
  };

  const handleCollapse = () => {
    closeSearchDock();
    // 외부/내부 상태 모두 초기화
    if (externalOnChange) externalOnChange("");
    setGlobalQuery("");
  };

  const handleChange = (val: string) => {
    if (externalOnChange) externalOnChange(val);
    setGlobalQuery(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && currentQuery.trim() !== '') {
      const finalQuery = searchDockFilter ? `${searchDockFilter}${currentQuery}` : currentQuery;
      onSearch(finalQuery);
      handleCollapse();
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
            onClick={handleExpand}
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
                value={currentQuery} // 하이브리드 값 적용
                onChange={(e) => handleChange(e.target.value)} // 하이브리드 변경 적용
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
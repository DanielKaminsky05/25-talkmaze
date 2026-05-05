"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type PageTitleContextValue = {
  title: string | null;
  setTitle: (t: string | null) => void;
};

// Define the shared Page Title value
const PageTitleContext = createContext<PageTitleContextValue>({
  title: null,
  setTitle: () => {},
});

/**
 * Channel component for Page Title
 */
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

// Use the shared Page Title state
export function usePageTitle() {
  return useContext(PageTitleContext);
}

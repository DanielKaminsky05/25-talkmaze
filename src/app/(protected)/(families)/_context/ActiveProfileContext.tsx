"use client";

import { createContext, ReactNode, useContext } from "react";

export type ActiveProfile = {
  id: string;
  type: "student" | "parent";
};

type ActiveProfileContextValue = {
  profile: ActiveProfile | null;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue>({
  profile: null,
});

export function ActiveProfileProvider({
  profile,
  children,
}: {
  profile: ActiveProfile | null;
  children: ReactNode;
}) {
  return (
    <ActiveProfileContext.Provider value={{ profile }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  return useContext(ActiveProfileContext).profile;
}

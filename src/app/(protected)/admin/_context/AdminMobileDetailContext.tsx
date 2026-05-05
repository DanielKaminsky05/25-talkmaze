"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type AdminMobileDetailContextType = {
  hasDetail: boolean;
  setHasDetail: (value: boolean) => void;
};

const AdminMobileDetailContext = createContext<AdminMobileDetailContextType>({
  hasDetail: false,
  setHasDetail: () => {},
});

/**
 * Context so each admin list/detail page can signal the layout
 * to show the mobile back button.
 */
export function AdminMobileDetailProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [hasDetail, setHasDetail] = useState(false);
  return (
    <AdminMobileDetailContext.Provider value={{ hasDetail, setHasDetail }}>
      {children}
    </AdminMobileDetailContext.Provider>
  );
}

export function useAdminMobileDetail() {
  return useContext(AdminMobileDetailContext);
}

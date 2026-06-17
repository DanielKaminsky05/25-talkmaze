"use client";

import LoginPage from "./(public)/login/page";
import { useDocumentTitle } from "@/src/hooks/useDocumentTitle";
export default function Page() {
  useDocumentTitle("Login");

  return (
    <div>
      <LoginPage />
    </div>
  );
}

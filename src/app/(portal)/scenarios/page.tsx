"use client";

import { ToastProvider } from "@/components/ui";
import { ScenariosLibrary } from "@/components/scenarios/scenarios-library";

export default function ScenariosPage() {
  return (
    <ToastProvider>
      <ScenariosLibrary />
    </ToastProvider>
  );
}

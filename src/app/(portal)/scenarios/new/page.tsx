"use client";

import { ToastProvider } from "@/components/ui";
import { NewScenario } from "@/components/scenarios/new-scenario";

export default function NewScenarioPage() {
  return (
    <ToastProvider>
      <NewScenario />
    </ToastProvider>
  );
}

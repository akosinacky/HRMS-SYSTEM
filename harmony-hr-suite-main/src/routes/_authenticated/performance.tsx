import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/page-header";
export const Route = createFileRoute("/_authenticated/performance")({ component: () => <ModulePlaceholder title="Performance" description="Evaluation criteria, reviews, and history." phase="Phase 4" /> });

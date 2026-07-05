import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/page-header";
export const Route = createFileRoute("/_authenticated/recruitment")({ component: () => <ModulePlaceholder title="Recruitment" description="Job postings, applicants, hiring." phase="Phase 4" /> });

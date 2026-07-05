import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/page-header";
export const Route = createFileRoute("/_authenticated/leave")({ component: () => <ModulePlaceholder title="Leave" description="Requests, approvals, and balances." phase="Phase 3" /> });

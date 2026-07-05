import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/page-header";
export const Route = createFileRoute("/_authenticated/attendance")({ component: () => <ModulePlaceholder title="Attendance" description="Clock in/out, hours worked, absences." phase="Phase 3" /> });

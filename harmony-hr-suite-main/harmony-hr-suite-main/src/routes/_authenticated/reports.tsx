import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/page-header";
export const Route = createFileRoute("/_authenticated/reports")({ component: () => <ModulePlaceholder title="Reports & Analytics" description="Attendance, payroll, leave, recruitment summaries." phase="Phase 4" /> });

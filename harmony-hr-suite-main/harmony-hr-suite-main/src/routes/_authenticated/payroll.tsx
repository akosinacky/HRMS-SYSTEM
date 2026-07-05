import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/page-header";
export const Route = createFileRoute("/_authenticated/payroll")({ component: () => <ModulePlaceholder title="Payroll" description="Periods, computations, payslips." phase="Phase 4" /> });

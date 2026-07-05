// Reusable page-header block used by every module page.
// - `title`       : bold H1 shown at the top.
// - `description` : optional muted subtitle.
// - `actions`     : right-side slot (e.g. "New" button, role badge).
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ModulePlaceholder({ title, description, phase }: { title: string; description: string; phase: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming in {phase}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This module is scaffolded and role-gated. Full CRUD and workflows land in {phase} of the build.
        </CardContent>
      </Card>
    </div>
  );
}

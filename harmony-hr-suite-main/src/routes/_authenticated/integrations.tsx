import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Link2, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/integrations")({
  component: Integrations,
});

function Integrations() {
  return (
    <div className="space-y-6">
      <PageHeader title="SariSync Integration" description="Share employee data with your point-of-sale system." />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>SariSync POS</CardTitle>
              <p className="text-sm text-muted-foreground">Employee & sales sync</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1"><Link2 className="h-3 w-3" /> Not connected</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Employees flagged with <code className="rounded bg-muted px-1">pos_enabled</code> will be exposed to SariSync
            via a shared employee ID once the sync channel is configured (webhook or edge function).
          </p>
          <p>Full integration ships in a follow-up phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}

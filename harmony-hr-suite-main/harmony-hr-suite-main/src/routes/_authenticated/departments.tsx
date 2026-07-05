// Departments module — list + create/edit/delete organizational units.
// Everyone signed-in can view the list; only Owner and HR Staff see the
// action buttons (guarded by `canManage` via useAuth).
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Department } from "@/lib/hrms-types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/departments")({ component: DepartmentsPage });

function DepartmentsPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["owner", "hr_staff"]);
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("departments").select("*").order("name");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Department[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Department deleted");
      void load();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Organizational units and structure."
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="h-4 w-4" /> New Department
                </Button>
              </DialogTrigger>
              <DepartmentForm
                initial={editing}
                onSaved={() => { setOpen(false); setEditing(null); void load(); }}
              />
            </Dialog>
          )
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No departments yet.</TableCell></TableRow>
            ) : rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.code}</TableCell>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.description}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void onDelete(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function DepartmentForm({ initial, onSaved }: { initial: Department | null; onSaved: () => void }) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCode(initial?.code ?? "");
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
  }, [initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { code: code.trim(), name: name.trim(), description: description.trim() || null };
    const { error } = initial
      ? await supabase.from("departments").update(payload).eq("id", initial.id)
      : await supabase.from("departments").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(initial ? "Department updated" : "Department created");
      onSaved();
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit" : "New"} Department</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="ENG" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Engineering" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

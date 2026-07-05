// Positions module — job titles, level, and salary grade, optionally linked
// to a department. Owner / HR Staff can manage; other roles see read-only.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Position, Department } from "@/lib/hrms-types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/positions")({ component: PositionsPage });

function PositionsPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["owner", "hr_staff"]);
  const [rows, setRows] = useState<Position[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Position | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, d] = await Promise.all([
      supabase.from("positions").select("*").order("title"),
      supabase.from("departments").select("*").order("name"),
    ]);
    if (p.error) toast.error(p.error.message);
    else setRows((p.data ?? []) as Position[]);
    if (!d.error) setDepts((d.data ?? []) as Department[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const deptName = (id: string | null) => depts.find((x) => x.id === id)?.name ?? "—";

  const onDelete = async (id: string) => {
    if (!confirm("Delete this position?")) return;
    const { error } = await supabase.from("positions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Position deleted"); void load(); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Positions"
        description="Job titles, levels, and salary grades."
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New Position</Button>
              </DialogTrigger>
              <PositionForm initial={editing} departments={depts} onSaved={() => { setOpen(false); setEditing(null); void load(); }} />
            </Dialog>
          )
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Salary Grade</TableHead>
              {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No positions yet.</TableCell></TableRow>
            ) : rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{deptName(p.department_id)}</TableCell>
                <TableCell>{p.level ?? "—"}</TableCell>
                <TableCell>{p.salary_grade ?? "—"}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => void onDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
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

function PositionForm({ initial, departments, onSaved }: { initial: Position | null; departments: Department[]; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [departmentId, setDepartmentId] = useState<string>(initial?.department_id ?? "");
  const [level, setLevel] = useState(initial?.level ?? "");
  const [salaryGrade, setSalaryGrade] = useState<string>(initial?.salary_grade?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setDepartmentId(initial?.department_id ?? "");
    setLevel(initial?.level ?? "");
    setSalaryGrade(initial?.salary_grade?.toString() ?? "");
  }, [initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: title.trim(),
      department_id: departmentId || null,
      level: level.trim() || null,
      salary_grade: salaryGrade ? Number(salaryGrade) : null,
    };
    const { error } = initial
      ? await supabase.from("positions").update(payload).eq("id", initial.id)
      : await supabase.from("positions").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(initial ? "Position updated" : "Position created"); onSaved(); }
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Edit" : "New"} Position</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Input id="level" value={level ?? ""} onChange={(e) => setLevel(e.target.value)} placeholder="Junior / Senior" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Salary Grade</Label>
            <Input id="grade" type="text" inputMode="numeric" pattern="[0-9]*" value={salaryGrade} onChange={(e) => setSalaryGrade(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

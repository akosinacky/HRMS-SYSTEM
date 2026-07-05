// Employees module — main HR record for each person.
// Features: search, create/edit/delete, department + position assignment,
// employment status, and a POS/SariSync toggle (`pos_enabled`) that flags
// which staff sync to the sari-sari point-of-sale system later.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Employee, Department, Position } from "@/lib/hrms-types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/employees")({ component: EmployeesPage });

function EmployeesPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["owner", "hr_staff"]);
  const [rows, setRows] = useState<Employee[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const [e, d, p] = await Promise.all([
      supabase.from("employees").select("*").order("last_name"),
      supabase.from("departments").select("*").order("name"),
      supabase.from("positions").select("*").order("title"),
    ]);
    if (e.error) toast.error(e.error.message);
    else setRows((e.data ?? []) as Employee[]);
    if (!d.error) setDepts((d.data ?? []) as Department[]);
    if (!p.error) setPositions((p.data ?? []) as Position[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const deptName = (id: string | null) => depts.find((x) => x.id === id)?.name ?? "—";
  const posTitle = (id: string | null) => positions.find((x) => x.id === id)?.title ?? "—";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((e) =>
      `${e.first_name} ${e.last_name} ${e.employee_code} ${e.email ?? ""}`.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this employee record?")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Employee deleted"); void load(); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage personal, employment, and role information."
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New Employee</Button>
              </DialogTrigger>
              <EmployeeForm initial={editing} departments={depts} positions={positions} onSaved={() => { setOpen(false); setEditing(null); void load(); }} />
            </Dialog>
          )
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, code, email…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>POS</TableHead>
              {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No employees found.</TableCell></TableRow>
            ) : filtered.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                <TableCell className="font-medium">{emp.first_name} {emp.last_name}</TableCell>
                <TableCell>{deptName(emp.department_id)}</TableCell>
                <TableCell>{posTitle(emp.position_id)}</TableCell>
                <TableCell>
                  <Badge variant={emp.status === "active" ? "default" : "secondary"}>{emp.status}</Badge>
                </TableCell>
                <TableCell>{emp.pos_enabled ? <Badge variant="outline">Enabled</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(emp); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => void onDelete(emp.id)}><Trash2 className="h-4 w-4" /></Button>
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

function EmployeeForm({ initial, departments, positions, onSaved }: { initial: Employee | null; departments: Department[]; positions: Position[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    employee_code: initial?.employee_code ?? "",
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    gender: initial?.gender ?? "",
    birth_date: initial?.birth_date ?? "",
    address: initial?.address ?? "",
    department_id: initial?.department_id ?? "",
    position_id: initial?.position_id ?? "",
    hire_date: initial?.hire_date ?? new Date().toISOString().slice(0, 10),
    status: initial?.status ?? "active",
    pos_enabled: initial?.pos_enabled ?? false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      employee_code: initial?.employee_code ?? "",
      first_name: initial?.first_name ?? "",
      last_name: initial?.last_name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      gender: initial?.gender ?? "",
      birth_date: initial?.birth_date ?? "",
      address: initial?.address ?? "",
      department_id: initial?.department_id ?? "",
      position_id: initial?.position_id ?? "",
      hire_date: initial?.hire_date ?? new Date().toISOString().slice(0, 10),
      status: initial?.status ?? "active",
      pos_enabled: initial?.pos_enabled ?? false,
    });
  }, [initial]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const filteredPositions = positions.filter((p) => !form.department_id || p.department_id === form.department_id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      employee_code: form.employee_code.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      address: form.address.trim() || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      hire_date: form.hire_date,
      status: form.status,
      pos_enabled: form.pos_enabled,
    };
    const { error } = initial
      ? await supabase.from("employees").update(payload).eq("id", initial.id)
      : await supabase.from("employees").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(initial ? "Employee updated" : "Employee created"); onSaved(); }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{initial ? "Edit" : "New"} Employee</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employee_code">Employee Code</Label>
            <Input id="employee_code" value={form.employee_code} onChange={(e) => set("employee_code", e.target.value)} required placeholder="EMP-0001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire_date">Hire Date</Label>
            <Input id="hire_date" type="date" value={form.hire_date} onChange={(e) => set("hire_date", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="text" inputMode="numeric" pattern="[0-9]*" minLength={11} maxLength={11} value={form.phone ?? ""} placeholder="09XXXXXXXXX" onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">Birth Date</Label>
            <Input id="birth_date" type="date" value={form.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={form.department_id ?? ""} onValueChange={(v) => { set("department_id", v); set("position_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={form.position_id ?? ""} onValueChange={(v) => set("position_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {filteredPositions.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch id="pos_enabled" checked={form.pos_enabled} onCheckedChange={(v) => set("pos_enabled", v)} />
            <Label htmlFor="pos_enabled">POS / SariSync enabled</Label>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

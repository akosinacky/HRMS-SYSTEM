import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    employee_code: "", first_name: "", last_name: "", email: "", phone: "",
    department_id: "", position_id: "", basic_salary: "", status: "active" as const,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await supabase.from("employees").select("*, departments(name), positions(title)").order("created_at",{ascending:false})).data ?? [],
  });
  const { data: depts } = useQuery({ queryKey:["depts"], queryFn: async () => (await supabase.from("departments").select("*")).data ?? [] });
  const { data: positions } = useQuery({ queryKey:["positions"], queryFn: async () => (await supabase.from("positions").select("*")).data ?? [] });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (!payload.department_id) delete payload.department_id;
      if (!payload.position_id) delete payload.position_id;
      payload.basic_salary = Number(payload.basic_salary || 0);
      if (!payload.employee_code) payload.employee_code = "EMP-" + Math.floor(Math.random()*90000+10000);
      const { error } = await supabase.from("employees").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Employee added"); qc.invalidateQueries({queryKey:["employees"]}); setOpen(false); setForm({employee_code:"",first_name:"",last_name:"",email:"",phone:"",department_id:"",position_id:"",basic_salary:"",status:"active"}); },
    onError: (e:any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("employees").delete().eq("id",id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({queryKey:["employees"]}); },
  });

  const filtered = (employees ?? []).filter((e:any) =>
    !q || `${e.first_name} ${e.last_name} ${e.email} ${e.employee_code}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employee records"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Add employee</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New employee</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Employee code</Label><Input value={form.employee_code} onChange={e=>setForm({...form,employee_code:e.target.value})} placeholder="Auto"/></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v:any)=>setForm({...form,status:v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{["active","probation","on_leave","resigned","terminated"].map(s=><SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>First name</Label><Input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></div>
                <div><Label>Last name</Label><Input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
                <div><Label>Department</Label>
                  <Select value={form.department_id} onValueChange={v=>setForm({...form,department_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                    <SelectContent>{depts?.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Position</Label>
                  <Select value={form.position_id} onValueChange={v=>setForm({...form,position_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                    <SelectContent>{positions?.map(p=><SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2"><Label>Basic salary</Label><Input type="number" value={form.basic_salary} onChange={e=>setForm({...form,basic_salary:e.target.value})}/></div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.first_name||!form.last_name}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input placeholder="Search employees..." className="pl-9" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>Position</TableHead><TableHead>Status</TableHead><TableHead/></TableRow></TableHeader>
            <TableBody>
              {filtered.map((e:any)=>(
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                  <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                  <TableCell>{e.email ?? "—"}</TableCell>
                  <TableCell>{e.departments?.name ?? "—"}</TableCell>
                  <TableCell>{e.positions?.title ?? "—"}</TableCell>
                  <TableCell><Badge variant={e.status==="active"?"default":"secondary"} className="capitalize">{e.status.replace("_"," ")}</Badge></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={()=>del.mutate(e.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                </TableRow>
              ))}
              {!filtered.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No employees yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

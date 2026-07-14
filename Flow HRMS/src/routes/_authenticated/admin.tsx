import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <div>
      <PageHeader title="Administration" description="Departments, positions, and system settings" />
      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="mt-4"><Departments /></TabsContent>
        <TabsContent value="positions" className="mt-4"><Positions /></TabsContent>
      </Tabs>
    </div>
  );
}

function Departments() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data } = useQuery({ queryKey:["depts-admin"], queryFn: async () => (await supabase.from("departments").select("*").order("name")).data ?? [] });

  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("departments").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Added"); qc.invalidateQueries({queryKey:["depts-admin"]}); setOpen(false); setForm({name:"",description:""}); },
    onError: (e:any)=>toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("departments").delete().eq("id",id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({queryKey:["depts-admin"]}); },
    onError: (e:any)=>toast.error(e.message),
  });

  return (
    <Card><CardContent className="p-4">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Add department</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add department</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            </div>
            <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.name}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead/></TableRow></TableHeader>
        <TableBody>
          {data?.map((d:any)=>(
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="text-muted-foreground">{d.description ?? "—"}</TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={()=>del.mutate(d.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
            </TableRow>
          ))}
          {!data?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No departments yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function Positions() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", department_id: "", salary_grade: "", base_salary: "" });

  const { data } = useQuery({ queryKey:["positions-admin"], queryFn: async () => (await supabase.from("positions").select("*, departments(name)").order("title")).data ?? [] });
  const { data: depts } = useQuery({ queryKey:["depts"], queryFn: async () => (await supabase.from("departments").select("*")).data ?? [] });

  const create = useMutation({
    mutationFn: async () => {
      const payload:any = {...form, base_salary: Number(form.base_salary||0)};
      if (!payload.department_id) delete payload.department_id;
      const { error } = await supabase.from("positions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Added"); qc.invalidateQueries({queryKey:["positions-admin"]}); setOpen(false); setForm({title:"",department_id:"",salary_grade:"",base_salary:""}); },
    onError: (e:any)=>toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("positions").delete().eq("id",id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({queryKey:["positions-admin"]}); },
  });

  return (
    <Card><CardContent className="p-4">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Add position</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add position</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
              <div><Label>Department</Label>
                <Select value={form.department_id} onValueChange={v=>setForm({...form,department_id:v})}>
                  <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{depts?.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Salary grade</Label><Input value={form.salary_grade} onChange={e=>setForm({...form,salary_grade:e.target.value})}/></div>
                <div><Label>Base salary</Label><Input type="number" value={form.base_salary} onChange={e=>setForm({...form,base_salary:e.target.value})}/></div>
              </div>
            </div>
            <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.title}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Department</TableHead><TableHead>Grade</TableHead><TableHead>Base</TableHead><TableHead/></TableRow></TableHeader>
        <TableBody>
          {data?.map((p:any)=>(
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.title}</TableCell>
              <TableCell>{p.departments?.name ?? "—"}</TableCell>
              <TableCell>{p.salary_grade ?? "—"}</TableCell>
              <TableCell>{Number(p.base_salary ?? 0).toLocaleString()}</TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={()=>del.mutate(p.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
            </TableRow>
          ))}
          {!data?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No positions yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

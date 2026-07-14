import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { Plus, Users, Briefcase, CalendarCheck, Trash2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/recruitment")({
  component: Recruitment,
});

function Recruitment() {
  return (
    <div>
      <PageHeader title="Recruitment" description="Job postings, applicants, and interviews" />
      <Tabs defaultValue="postings">
        <TabsList>
          <TabsTrigger value="postings"><Briefcase className="mr-2 h-4 w-4" /> Job Postings</TabsTrigger>
          <TabsTrigger value="applicants"><Users className="mr-2 h-4 w-4" /> Applicants</TabsTrigger>
          <TabsTrigger value="interviews"><CalendarCheck className="mr-2 h-4 w-4" /> Interviews</TabsTrigger>
        </TabsList>
        <TabsContent value="postings" className="mt-4"><JobPostings /></TabsContent>
        <TabsContent value="applicants" className="mt-4"><Applicants /></TabsContent>
        <TabsContent value="interviews" className="mt-4"><Interviews /></TabsContent>
      </Tabs>
    </div>
  );
}

function JobPostings() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", requirements: "", department_id: "", status: "draft" as "draft"|"published"|"closed" });

  const { data: postings } = useQuery({
    queryKey: ["postings"],
    queryFn: async () => (await supabase.from("job_postings").select("*, departments(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: depts } = useQuery({ queryKey: ["depts"], queryFn: async () => (await supabase.from("departments").select("*")).data ?? [] });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (!payload.department_id) delete payload.department_id;
      if (payload.status === "published") payload.posted_date = new Date().toISOString().slice(0,10);
      const { error } = await supabase.from("job_postings").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job posting created");
      qc.invalidateQueries({ queryKey: ["postings"] });
      setOpen(false);
      setForm({ title: "", description: "", requirements: "", department_id: "", status: "draft" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_postings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["postings"] }); },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>New posting</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create job posting</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
                <div><Label>Department</Label>
                  <Select value={form.department_id} onValueChange={v=>setForm({...form,department_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                    <SelectContent>{depts?.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
                <div><Label>Requirements</Label><Textarea value={form.requirements} onChange={e=>setForm({...form,requirements:e.target.value})}/></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v:any)=>setForm({...form,status:v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.title}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>Posted</TableHead><TableHead/></TableRow></TableHeader>
          <TableBody>
            {postings?.map((p:any)=>(
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{p.departments?.name ?? "—"}</TableCell>
                <TableCell><Badge variant={p.status==="published"?"default":"secondary"} className="capitalize">{p.status}</Badge></TableCell>
                <TableCell>{p.posted_date ?? "—"}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={()=>del.mutate(p.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
              </TableRow>
            ))}
            {!postings?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No job postings yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Applicants() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", job_posting_id: "", status: "applied" as any });

  const { data: applicants } = useQuery({
    queryKey: ["applicants"],
    queryFn: async () => (await supabase.from("applicants").select("*, job_postings(title)").order("applied_at",{ascending:false})).data ?? [],
  });
  const { data: postings } = useQuery({ queryKey:["postings-lite"], queryFn: async () => (await supabase.from("job_postings").select("id,title")).data ?? [] });

  const create = useMutation({
    mutationFn: async () => {
      const payload:any = {...form};
      if (!payload.job_posting_id) delete payload.job_posting_id;
      const { error } = await supabase.from("applicants").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Applicant added"); qc.invalidateQueries({queryKey:["applicants"]}); setOpen(false); setForm({first_name:"",last_name:"",email:"",phone:"",job_posting_id:"",status:"applied"}); },
    onError: (e:any)=>toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({id,status}:{id:string,status:string}) => {
      const { error } = await supabase.from("applicants").update({status: status as any}).eq("id",id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({queryKey:["applicants"]}); },
  });

  return (
    <Card><CardContent className="p-4">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Add applicant</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New applicant</DialogTitle></DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>First name</Label><Input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></div>
              <div><Label>Last name</Label><Input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div className="md:col-span-2"><Label>Job posting</Label>
                <Select value={form.job_posting_id} onValueChange={v=>setForm({...form,job_posting_id:v})}>
                  <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{postings?.map(p=><SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.first_name||!form.email}>Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Posting</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {applicants?.map((a:any)=>(
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.first_name} {a.last_name}</TableCell>
              <TableCell>{a.email}</TableCell>
              <TableCell>{a.job_postings?.title ?? "—"}</TableCell>
              <TableCell>
                <Select value={a.status} onValueChange={v=>setStatus.mutate({id:a.id,status:v})}>
                  <SelectTrigger className="w-36 h-8"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {["applied","screening","interview","offer","hired","rejected"].map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {!applicants?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No applicants yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function Interviews() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ applicant_id: "", scheduled_at: "", type: "initial" as any, interviewer: "", notes: "" });

  const { data: interviews } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => (await supabase.from("interviews").select("*, applicants(first_name,last_name,email)").order("scheduled_at",{ascending:false})).data ?? [],
  });
  const { data: applicants } = useQuery({ queryKey:["applicants-lite"], queryFn: async () => (await supabase.from("applicants").select("id,first_name,last_name")).data ?? [] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("interviews").insert({ ...form, scheduled_at: new Date(form.scheduled_at).toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Interview scheduled"); qc.invalidateQueries({queryKey:["interviews"]}); setOpen(false); setForm({applicant_id:"",scheduled_at:"",type:"initial",interviewer:"",notes:""}); },
    onError: (e:any)=>toast.error(e.message),
  });

  return (
    <Card><CardContent className="p-4">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Schedule interview</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule interview</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Applicant</Label>
                <Select value={form.applicant_id} onValueChange={v=>setForm({...form,applicant_id:v})}>
                  <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{applicants?.map(a=><SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>When</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value})}/></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v:any)=>setForm({...form,type:v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="initial">Initial</SelectItem><SelectItem value="technical">Technical</SelectItem><SelectItem value="final">Final</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Interviewer</Label><Input value={form.interviewer} onChange={e=>setForm({...form,interviewer:e.target.value})}/></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.applicant_id||!form.scheduled_at}>Schedule</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Applicant</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Interviewer</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {interviews?.map((i:any)=>(
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.applicants?.first_name} {i.applicants?.last_name}</TableCell>
              <TableCell>{new Date(i.scheduled_at).toLocaleString()}</TableCell>
              <TableCell className="capitalize">{i.type}</TableCell>
              <TableCell>{i.interviewer ?? "—"}</TableCell>
              <TableCell><Badge variant="secondary" className="capitalize">{i.status}</Badge></TableCell>
            </TableRow>
          ))}
          {!interviews?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No interviews yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
});

function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const last = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
  const [period, setPeriod] = useState({ start: first, end: last });

  const { data: runs } = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => (await supabase.from("payroll").select("*, employees(first_name,last_name,employee_code)").order("created_at",{ascending:false}).limit(200)).data ?? [],
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data: employees } = await supabase.from("employees").select("id,basic_salary").eq("status","active");
      if (!employees?.length) throw new Error("No active employees");
      const { data: att } = await supabase.from("attendance")
        .select("employee_id,late_minutes,undertime_minutes,overtime_hours")
        .gte("date", period.start).lte("date", period.end);
      const bucket: Record<string, {late:number, ot:number}> = {};
      (att ?? []).forEach((a:any) => {
        const b = bucket[a.employee_id] ??= {late:0, ot:0};
        b.late += (a.late_minutes ?? 0) + (a.undertime_minutes ?? 0);
        b.ot += Number(a.overtime_hours ?? 0);
      });

      const rows = employees.map((e:any) => {
        const basic = Number(e.basic_salary ?? 0);
        const daily = basic / 22;
        const hourly = daily / 8;
        const b = bucket[e.id] ?? {late:0, ot:0};
        const deductions = (b.late / 60) * hourly;
        const overtime_pay = b.ot * hourly * 1.25;
        const allowances = basic * 0.05;
        const gross = basic + allowances + overtime_pay;
        const tax = gross * 0.10;
        const totalDed = deductions + tax;
        const net = gross - totalDed;
        return {
          employee_id: e.id, period_start: period.start, period_end: period.end,
          basic_salary: basic, allowances: Number(allowances.toFixed(2)),
          overtime_pay: Number(overtime_pay.toFixed(2)), deductions: Number(totalDed.toFixed(2)),
          gross_salary: Number(gross.toFixed(2)), net_salary: Number(net.toFixed(2)),
          status: "draft" as const,
        };
      });
      const { error } = await supabase.from("payroll").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payroll generated"); qc.invalidateQueries({queryKey:["payroll"]}); },
    onError: (e:any)=>toast.error(e.message),
  });

  const release = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll").update({status:"released"}).eq("id",id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Released"); qc.invalidateQueries({queryKey:["payroll"]}); },
  });

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Generate and release payroll for the selected period"
      />
      <Card className="mb-4"><CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>Period start</Label><Input type="date" value={period.start} onChange={e=>setPeriod({...period,start:e.target.value})}/></div>
          <div><Label>Period end</Label><Input type="date" value={period.end} onChange={e=>setPeriod({...period,end:e.target.value})}/></div>
          <Button onClick={()=>generate.mutate()} disabled={generate.isPending}>
            <Play className="mr-2 h-4 w-4"/> Run payroll
          </Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Period</TableHead>
            <TableHead>Basic</TableHead><TableHead>Allowances</TableHead><TableHead>OT</TableHead>
            <TableHead>Deductions</TableHead><TableHead>Gross</TableHead><TableHead>Net</TableHead>
            <TableHead>Status</TableHead><TableHead/>
          </TableRow></TableHeader>
          <TableBody>
            {runs?.map((r:any)=>(
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.employees?.first_name} {r.employees?.last_name}</TableCell>
                <TableCell className="text-xs">{r.period_start} → {r.period_end}</TableCell>
                <TableCell>{Number(r.basic_salary).toLocaleString()}</TableCell>
                <TableCell>{Number(r.allowances).toLocaleString()}</TableCell>
                <TableCell>{Number(r.overtime_pay).toLocaleString()}</TableCell>
                <TableCell>{Number(r.deductions).toLocaleString()}</TableCell>
                <TableCell>{Number(r.gross_salary).toLocaleString()}</TableCell>
                <TableCell className="font-semibold">{Number(r.net_salary).toLocaleString()}</TableCell>
                <TableCell><Badge variant={r.status==="released"?"default":"secondary"} className="capitalize">{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {r.status!=="released" && <Button size="sm" variant="ghost" onClick={()=>release.mutate(r.id)}><CheckCircle2 className="h-4 w-4"/></Button>}
                </TableCell>
              </TableRow>
            ))}
            {!runs?.length && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No payroll runs yet. Click "Run payroll" to generate.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

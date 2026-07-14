import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

const COLORS = ["hsl(220 60% 25%)", "hsl(212 74% 30%)", "hsl(174 62% 40%)", "hsl(40 74% 55%)", "hsl(290 55% 55%)"];

function ReportsPage() {
  const { data: employees } = useQuery({
    queryKey: ["report-employees"],
    queryFn: async () => (await supabase.from("employees").select("status,departments(name)")).data ?? [],
  });
  const { data: leaves } = useQuery({
    queryKey: ["report-leaves"],
    queryFn: async () => (await supabase.from("leave_requests").select("leave_type,status")).data ?? [],
  });
  const { data: payroll } = useQuery({
    queryKey: ["report-payroll"],
    queryFn: async () => (await supabase.from("payroll").select("period_start,net_salary")).data ?? [],
  });

  const byDept: Record<string, number> = {};
  (employees ?? []).forEach((e:any) => {
    const n = e.departments?.name ?? "Unassigned";
    byDept[n] = (byDept[n] ?? 0) + 1;
  });
  const deptData = Object.entries(byDept).map(([name, value]) => ({ name, value }));

  const leaveByType: Record<string, number> = {};
  (leaves ?? []).forEach((l:any) => { leaveByType[l.leave_type] = (leaveByType[l.leave_type] ?? 0) + 1; });
  const leaveData = Object.entries(leaveByType).map(([name, count]) => ({ name, count }));

  const payrollByMonth: Record<string, number> = {};
  (payroll ?? []).forEach((p:any) => {
    const m = (p.period_start ?? "").slice(0,7);
    payrollByMonth[m] = (payrollByMonth[m] ?? 0) + Number(p.net_salary ?? 0);
  });
  const payrollData = Object.entries(payrollByMonth).sort().map(([month, total]) => ({ month, total }));

  return (
    <div>
      <PageHeader title="Reports" description="Analytics across the organization" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Employees by Department</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={deptData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {deptData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Leave Requests by Type</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={leaveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)"/>
                <XAxis dataKey="name" fontSize={12}/><YAxis fontSize={12} allowDecimals={false}/><Tooltip/>
                <Bar dataKey="count" fill="hsl(174 62% 40%)" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Payroll trend (net)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <LineChart data={payrollData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)"/>
                <XAxis dataKey="month" fontSize={12}/><YAxis fontSize={12}/><Tooltip/>
                <Line type="monotone" dataKey="total" stroke="hsl(212 74% 30%)" strokeWidth={2} dot={{r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

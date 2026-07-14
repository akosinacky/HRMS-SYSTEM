import { createFileRoute } from "@tanstack/react-router";

const DEMO_EMAIL = "admin@harmony.test";
const DEMO_PASSWORD = "Admin@1234";

export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find or create the user
        let userId: string | null = null;
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
        const match = existing?.users?.find((u) => u.email === DEMO_EMAIL);
        if (match) {
          userId = match.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: DEMO_PASSWORD,
            email_confirm: true,
          });
        } else {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: "Harmony Admin" },
          });
          if (error) {
            return Response.json({ error: error.message }, { status: 500 });
          }
          userId = data.user!.id;
        }

        if (userId) {
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: userId, role: "admin" },
            { onConflict: "user_id,role" },
          );
          await supabaseAdmin.from("profiles").upsert(
            { id: userId, email: DEMO_EMAIL, full_name: "Harmony Admin" },
            { onConflict: "id" },
          );

          // Seed a bit of sample org data (idempotent)
          const { data: deptCount } = await supabaseAdmin
            .from("departments").select("id", { count: "exact", head: true });
          if (!deptCount) {
            const { data: depts } = await supabaseAdmin.from("departments").insert([
              { name: "Engineering", description: "Software engineering team" },
              { name: "Human Resources", description: "People operations" },
              { name: "Sales", description: "Revenue team" },
              { name: "Marketing", description: "Brand and growth" },
            ]).select();
            if (depts && depts.length) {
              const eng = depts.find((d) => d.name === "Engineering")!;
              const hr = depts.find((d) => d.name === "Human Resources")!;
              await supabaseAdmin.from("positions").insert([
                { title: "Software Engineer", department_id: eng.id, salary_grade: "G3", base_salary: 60000 },
                { title: "HR Specialist", department_id: hr.id, salary_grade: "G2", base_salary: 45000 },
                { title: "Sales Executive", department_id: depts.find(d=>d.name==="Sales")!.id, salary_grade: "G2", base_salary: 42000 },
              ]);
            }
          }
        }

        return Response.json({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      },
    },
  },
});

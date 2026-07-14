import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
  }

  async function seedDemo() {
    setSeeding(true);
    try {
      const res = await fetch("/api/public/seed-admin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Seeding failed");
      setEmail(data.email);
      setPassword(data.password);
      toast.success(`Demo admin ready: ${data.email}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 hs-gradient-brand p-12 text-primary-foreground flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold" style={{ fontFamily: "Space Grotesk" }}>
          <div className="h-8 w-8 rounded-md bg-white/20 backdrop-blur" />
          Harmony Suite
        </Link>
        <div className="hs-fade-in">
          <h2 className="text-4xl font-bold" style={{ fontFamily: "Space Grotesk" }}>
            HR, harmonized.
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            Recruit, onboard, and manage your workforce from a single beautifully organized workspace.
          </p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} Harmony Suite HRMS</p>
      </div>

      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <Card className="w-full max-w-md hs-card-shadow hs-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ fontFamily: "Space Grotesk" }}>Sign in to Harmony</CardTitle>
            <CardDescription>Access your HR workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Full name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    New accounts default to HR role. Admins can promote members later.
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 rounded-lg border border-dashed border-border p-4">
              <p className="text-xs font-medium text-muted-foreground">Try the demo</p>
              <p className="mt-1 text-sm">Create/reset the demo admin account and auto-fill credentials.</p>
              <Button variant="outline" className="mt-3 w-full" onClick={seedDemo} disabled={seeding}>
                {seeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Seed demo admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

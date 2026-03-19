import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuthToken } from "@/hooks/use-auth";
import { ActivitySquare, Lock } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { setToken } = useAuthToken();

  const { mutateAsync: login, isPending } = useAdminLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await login({ data: { email, password } });
      setToken(res.token);
      setLocation("/admin/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative cinematic background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-red-800 flex items-center justify-center shadow-lg shadow-primary/25 mb-4">
            <ActivitySquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">Arena<span className="text-primary">OS</span></h1>
          <p className="text-muted-foreground text-sm mt-2">Sign in to manage displays</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@urbanarena.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background/50 border-border/50 focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <div className="relative">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50 border-border/50 focus:border-primary pl-10"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? "Authenticating..." : "Access Control Panel"}
          </Button>
        </form>
      </div>
    </div>
  );
}

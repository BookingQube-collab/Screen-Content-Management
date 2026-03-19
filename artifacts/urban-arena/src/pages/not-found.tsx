import { Link } from "wouter";
import { ActivitySquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
        <ActivitySquare className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-6xl font-display font-black mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center max-w-md">
        The page you are looking for has been disconnected from the arena.
      </p>
      <div className="flex gap-4">
        <Link href="/display">
          <Button variant="outline" size="lg">View Display</Button>
        </Link>
        <Link href="/admin/login">
          <Button size="lg">Admin Login</Button>
        </Link>
      </div>
    </div>
  );
}

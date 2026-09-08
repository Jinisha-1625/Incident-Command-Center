import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("maya@command.local");
  const [password, setPassword] = useState("command123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <div className="mb-6 flex items-center gap-2 text-white">
        <Radio className="h-6 w-6 text-red-500" />
        <span className="text-lg font-semibold">Incident Command</span>
      </div>
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-white">Log in</h1>
        <p className="mt-1 text-sm text-slate-400">
          Commanders assign and set severity. Engineers own the work and the timeline.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          New here?{" "}
          <Link to="/register" className="text-sky-400 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          Demo team is 5 commanders + 5 engineers.
          <br />
          Commanders: maya, kabir, ananya, rohan, sneha @command.local — password{" "}
          <span className="text-slate-400">command123</span>
          <br />
          Engineers: arjun, priya, vikram, neha, aditya @command.local — password{" "}
          <span className="text-slate-400">engineer123</span>
        </p>
      </Card>
    </div>
  );
}

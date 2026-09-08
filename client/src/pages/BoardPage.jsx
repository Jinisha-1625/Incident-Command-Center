import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listIncidents, createIncident } from "@/api/incidentApi";
import { IncidentCard } from "@/components/IncidentCard";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { workload } from "@/api/userApi";

export function BoardPage() {
  const { token, user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function load(next = {}) {
    const query = { q: next.q ?? q, status: next.status ?? status };
    setLoading(true);
    setError("");
    try {
      const data = await listIncidents(token, query);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status]);

  function onSearch(e) {
    e.preventDefault();
    load({ q });
  }

  return (
    <div className="min-h-svh">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Incident board</h1>
            <p className="mt-1 text-sm text-slate-400">
              Higher severity is listed first. Incidents with <strong>reassignment requested</strong>{" "}
              are marked so commanders can act without opening the full timeline.
            </p>
          </div>
          {user.role === "commander" && (
            <Button onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Close form" : "New incident"}
            </Button>
          )}
        </div>

        {banner && <p className="mt-4 text-sm text-amber-300">{banner}</p>}

        {showCreate && user.role === "commander" && (
          <CreateIncident
            token={token}
            onCreated={(msg) => {
              setShowCreate(false);
              setBanner(msg || "");
              load();
            }}
          />
        )}

        <form onSubmit={onSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or description…"
            className="sm:flex-1"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
          >
            <option value="open">Open (not resolved)</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <p className="mt-3 text-xs text-slate-500">{total} matching</p>

        {loading && <p className="mt-8 text-slate-400">Loading incidents…</p>}
        {error && <p className="mt-8 text-red-400">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <Card className="mt-8 p-8 text-center text-slate-400">
            No incidents match this search.{" "}
            {user.role === "commander" ? "Open one from New incident." : "Ask a commander to open one."}
          </Card>
        )}
        <ul className="mt-4 space-y-3">
          {items.map((incident) => (
            <li key={incident.id}>
              <IncidentCard incident={incident} />
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-sm text-slate-600">
          Need workload before assigning?{" "}
          <Link to="/team" className="text-sky-400 hover:underline">
            Team counts
          </Link>
        </p>
      </main>
    </div>
  );
}

function CreateIncident({ token, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("SEV-2");
  const [assigneeId, setAssigneeId] = useState("");
  const [people, setPeople] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    workload(token)
      .then((d) => setPeople(d.people))
      .catch(() => {});
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await createIncident(token, {
        title,
        description,
        severity,
        assigneeId: assigneeId || undefined,
        expectedOpenCount: assigneeId
          ? people.find((p) => p.id === assigneeId)?.openCount ?? 0
          : undefined,
      });
      const msg = data.assignError
        ? `${data.assignError} ${data.assignHint || ""}`
        : "";
      onCreated(msg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mt-6 p-5">
      <h2 className="font-semibold text-white">Open an incident</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="desc">What is broken</Label>
          <Textarea id="desc" required value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Severity (set by you, the assigner)</Label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
          >
            <option>SEV-1</option>
            <option>SEV-2</option>
            <option>SEV-3</option>
            <option>SEV-4</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Assign now (optional)</Label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
          >
            <option value="">Unassigned</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.role} · solving {p.openCount} · solved {p.resolvedCount}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Opening…" : "Open incident"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

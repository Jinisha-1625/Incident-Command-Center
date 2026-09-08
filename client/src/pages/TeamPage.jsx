import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { workload } from "@/api/userApi";

export function TeamPage() {
  const { token } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    workload(token)
      .then((d) => setPeople(d.people))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-svh">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold text-white">Team workload</h1>
        <p className="mt-1 text-sm text-slate-400">
          Use currently solving vs solved counts when you allot an incident. Solving = assigned and not resolved.
        </p>
        {loading && <p className="mt-8 text-slate-400">Loading people…</p>}
        {error && <p className="mt-8 text-red-400">{error}</p>}
        {!loading && !error && people.length === 0 && (
          <Card className="mt-8 p-8 text-center text-slate-400">No people yet.</Card>
        )}
        {people.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Currently solving</th>
                  <th className="px-4 py-3 font-medium">Solved</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 capitalize">{p.role}</td>
                    <td className="px-4 py-3">{p.openCount}</td>
                    <td className="px-4 py-3">{p.resolvedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

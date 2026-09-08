import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ResolveForm({ onSubmit }) {
  const [whatHappened, setWhat] = useState("");
  const [whatWeDid, setDid] = useState("");
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({ whatHappened, whatWeDid, outcome });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Resolve with a written summary</h3>
      <p className="text-xs text-slate-500">
        You cannot close this with a checkbox. Write what the incident was, what you did, and the outcome.
      </p>
      <div className="space-y-1">
        <Label htmlFor="what">What happened</Label>
        <Textarea id="what" required value={whatHappened} onChange={(e) => setWhat(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="did">What we did</Label>
        <Textarea id="did" required value={whatWeDid} onChange={(e) => setDid(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="outcome">Outcome</Label>
        <Textarea
          id="outcome"
          required
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="Resolved / still degraded — be explicit"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Closing…" : "Mark resolved"}
      </Button>
    </form>
  );
}

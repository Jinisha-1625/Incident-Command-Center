import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RequestReassignmentForm({ onSubmit }) {
  const [handoffSummary, setHandoff] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({ handoffSummary });
      setHandoff("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Request reassignment</h3>
      <p className="text-xs text-slate-500">
        Only you (the assignee) can submit this. A handoff is required so a commander can reassign.
      </p>
      <div className="space-y-1">
        <Label htmlFor="req-handoff">Handoff summary</Label>
        <Textarea
          id="req-handoff"
          required
          value={handoffSummary}
          onChange={(e) => setHandoff(e.target.value)}
          placeholder="What you tried, what is still broken, what the next person should know"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" variant="outline" disabled={loading || !handoffSummary.trim()}>
        {loading ? "Sending…" : "Request reassignment"}
      </Button>
    </form>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TYPE_LABEL = {
  created: "Opened",
  assigned: "Assigned",
  reassigned: "Reassigned",
  reassignment_requested: "Reassignment requested",
  comment: "Update",
  handoff: "Handoff",
  status: "Status",
  resolved: "Resolved",
};

export function Timeline({ events, currentUserId, onEdit, onHide }) {
  if (!events?.length) {
    return <p className="text-sm text-slate-500">No timeline yet.</p>;
  }

  return (
    <ol className="space-y-4 border-l border-slate-800 pl-4">
      {events.map((event) => (
        <TimelineItem
          key={event.id}
          event={event}
          isAuthor={event.author?.id === currentUserId}
          onEdit={onEdit}
          onHide={onHide}
        />
      ))}
    </ol>
  );
}

function TimelineItem({ event, isAuthor, onEdit, onHide }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(event.message);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onEdit(event.id, text);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="-ml-[21px]">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-slate-950 ${
            event.type === "reassignment_requested" ? "bg-amber-400" : "bg-sky-400"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wide text-sky-300">
              {TYPE_LABEL[event.type] || event.type}
            </span>
            <span>{event.author?.name}</span>
            <time>{new Date(event.createdAt).toLocaleString()}</time>
            {event.editedAt && <span>updated by {event.author?.name}</span>}
          </div>
          {editing ? (
            <form onSubmit={save} className="mt-2 space-y-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={busy || !text.trim()}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{event.message}</p>
          )}
          {isAuthor && !editing && (
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Update
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onHide(event.id)}
              >
                Hide
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

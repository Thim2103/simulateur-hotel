import GameBadge from "../components/GameBadge";
import { messageTypeMeta } from "./GmMessageTypes";

// One row in the inbox (see GmInbox.jsx) -- icon, title, a one-line
// preview of the description, severity badge (the AttentionPanel/
// GameBadge red/orange/yellow vocabulary). Clicking it opens
// GmMessageModal.jsx with the full message and its decisions.
export default function GmMessage({ message, onOpen }) {
  const meta = messageTypeMeta(message.type);
  return (
    <button
      type="button"
      onClick={() => onOpen(message)}
      className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
    >
      <span aria-hidden="true" className="text-lg leading-none">{meta.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{meta.title}</span>
          <GameBadge tone={message.severity}>{message.severity}</GameBadge>
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-slate-900">{message.title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{message.description}</span>
      </span>
    </button>
  );
}

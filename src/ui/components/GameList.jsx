// An interactive list -- each row is optionally a link (`to`) or a button
// (`onSelect`), with a leading icon and trailing badge/action slot. Used
// wherever the old plain `<ul><li>` markup (DecisionsPanel, AttentionPanel,
// hub panels...) needed a consistent hover/press treatment.
import { Link } from "react-router-dom";

function Row({ icon, label, description, to, onSelect, trailing }) {
  const content = (
    <>
      {icon && <span aria-hidden="true" className="text-lg leading-none">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      {trailing}
    </>
  );

  const rowClass = "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-slate-100";

  if (to) {
    return (
      <Link to={to} className={rowClass}>
        {content}
      </Link>
    );
  }
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={rowClass}>
        {content}
      </button>
    );
  }
  return <div className={rowClass}>{content}</div>;
}

export default function GameList({ items = [], emptyLabel = "Rien à afficher.", className = "" }) {
  if (items.length === 0) {
    return <p className={`text-sm text-slate-500 ${className}`}>{emptyLabel}</p>;
  }
  return (
    <ul className={`flex flex-col gap-1 ${className}`}>
      {items.map((item) => (
        <li key={item.id}>
          <Row {...item} />
        </li>
      ))}
    </ul>
  );
}

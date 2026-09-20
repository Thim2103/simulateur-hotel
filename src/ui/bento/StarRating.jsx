// A review's stars: golden filled ones, muted empty ones. Announced as one
// value ("Note 4 sur 5"); the glyphs themselves read "★★★★☆" as text.
export default function StarRating({ rating, max = 5, className = "" }) {
  const filled = Math.max(0, Math.min(max, Math.round(Number(rating) || 0)));
  return (
    <span aria-label={`Note ${filled} sur ${max}`} className={`inline-flex whitespace-nowrap font-semibold tracking-tight ${className}`}>
      <span className="text-[#f5b301]">{"★".repeat(filled)}</span>
      <span className="text-slate-300">{"☆".repeat(max - filled)}</span>
    </span>
  );
}

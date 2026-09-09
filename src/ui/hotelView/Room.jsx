// One room on the 2D floor plan -- filled gold when occupied, empty
// (outline) otherwise. Scales up slightly on hover (v2 "simple CSS
// transition" the spec asks for); a real room number never comes from
// anywhere upstream, so this stays purely a status glyph, not a booking
// chart.
export default function Room({ occupied, number }) {
  return (
    <span
      title={occupied ? `Chambre ${number ?? ""} — occupée`.trim() : `Chambre ${number ?? ""} — libre`.trim()}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-[4px] border text-[9px] font-semibold transition-transform duration-150 hover:scale-125 ${
        occupied ? "border-[#c98a0e] bg-[#e9ab1f] text-[#0b1730]" : "border-slate-300 bg-slate-50 text-slate-300"
      }`}
    >
      {occupied ? "●" : ""}
    </span>
  );
}

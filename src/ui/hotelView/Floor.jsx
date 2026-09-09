import Room from "./Room";

// One floor: a label ("Étage N") plus its row of Room glyphs.
export default function Floor({ level, rooms }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium text-slate-500">Étage {level}</span>
      <div className="flex flex-wrap gap-1">
        {rooms.map((occupied, index) => (
          <Room key={index} occupied={occupied} number={index + 1} />
        ))}
      </div>
    </div>
  );
}

// A staff member glyph -- static (staff don't need to "bounce"; incidents
// and guests are the two things meant to draw the eye).
export default function StaffIcon() {
  return (
    <span aria-hidden="true" className="inline-block text-lg">
      👔
    </span>
  );
}

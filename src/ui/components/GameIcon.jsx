import { getIcon } from "../designSystem/icons";

const SIZES = { sm: "text-sm", md: "text-lg", lg: "text-2xl", xl: "text-4xl" };

// Renders one icon from the design system's pack (ui/designSystem/icons.js)
// at a consistent size, always aria-hidden -- icons here are decorative,
// the accessible label always comes from the surrounding text.
export default function GameIcon({ name, size = "md", className = "" }) {
  return (
    <span aria-hidden="true" className={`inline-block leading-none ${SIZES[size] || SIZES.md} ${className}`}>
      {getIcon(name)}
    </span>
  );
}

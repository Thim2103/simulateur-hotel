// Shadow tokens -- "ombres douces" (soft shadows). `tw` is the ready
// Tailwind className for components that don't need the raw value.
export const shadows = {
  soft: { tw: "shadow-sm", value: "0 1px 2px 0 rgb(15 23 42 / 0.06)" },
  panel: { tw: "shadow-lg", value: "0 10px 30px -10px rgb(15 23 42 / 0.25)" },
  glow: { tw: "shadow-[0_0_24px_-4px_rgba(233,171,31,0.45)]", value: "0 0 24px -4px rgba(233,171,31,0.45)" },
};

export default shadows;

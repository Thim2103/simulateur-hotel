export default function Button({ children, variant = "primary", ...props }) {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";

  const variants = {
    primary: "bg-cyan-700 text-white shadow-sm hover:bg-cyan-800 hover:shadow",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  };

  return (
    <button type="button" className={`${base} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}

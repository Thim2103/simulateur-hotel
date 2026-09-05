export default function Card({ title, description, children, className = "", as: Component = "section" }) {
  return (
    <Component className={`rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-5 ${className}`}>
      {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {title && <div className="mb-4" />}
      {children}
    </Component>
  );
}

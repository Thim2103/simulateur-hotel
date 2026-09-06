export default function TableRow({ children }) {
  return (
    <tr className="transition-colors duration-150 hover:bg-cyan-50/40">
      {children}
    </tr>
  );
}

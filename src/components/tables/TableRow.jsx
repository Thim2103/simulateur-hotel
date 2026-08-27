export default function TableRow({ children }) {
  return (
    <tr className="hover:bg-gray-50 transition">
      {children}
    </tr>
  );
}

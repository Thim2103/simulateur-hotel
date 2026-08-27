export default function TableHeader({ children }) {
  return (
    <th className="text-left px-4 py-2 border-b font-semibold">
      {children}
    </th>
  );
}

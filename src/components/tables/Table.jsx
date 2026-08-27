export default function Table({ columns, children }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} className="text-left px-4 py-2 border-b font-medium">
              {col}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>{children}</tbody>
    </table>
  );
}

import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-400 bg-zinc-900/50 rounded-xl border border-zinc-800">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
      <table className="w-full text-left text-sm text-zinc-300">
        <thead className="bg-zinc-800/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="hover:bg-zinc-800/30 transition-colors">
              {columns.map((col, idx) => (
                <td key={idx} className="px-6 py-4 whitespace-nowrap">
                  {col.cell
                    ? col.cell(item)
                    : col.accessorKey
                    ? String(item[col.accessorKey] ?? '')
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

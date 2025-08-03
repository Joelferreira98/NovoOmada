import React from 'react';

interface Column {
  key: string;
  title: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  className?: string;
}

const DataTable: React.FC<DataTableProps> = ({ columns, data, loading = false, className = '' }) => {
  if (loading) {
    return (
      <div className={`bg-base-100 rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="flex justify-center items-center h-32">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-base-100 rounded-lg shadow overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="bg-base-200 text-base-content font-semibold">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-base-content/70">
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className="hover">
                  {columns.map((column) => (
                    <td key={column.key} className="text-base-content">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
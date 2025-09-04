const DataTable = <T extends object>({
  data,
  columns,
  onEdit,
  onDelete,
}: DataTableProps<T>) => {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index}>{column.label}</th>
          ))}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            {columns.map((column, columnIndex) => (
              <td key={columnIndex}>{item[column.accessor]}</td>
            ))}
            <td>
              <button onClick={() => onEdit(item)}>Edit</button>
              <button onClick={() => onDelete(item)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// DataForm Component
interface DataFormProps<T> {
  item: T | null;
  onSubmit: (item: T) => void;
  onCancel: () => void;
}
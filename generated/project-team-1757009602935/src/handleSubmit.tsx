const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formData as T);
  };

  return (
    <form onSubmit={handleSubmit}>
      {Object.keys(formData || {}).map((key) => (
        <div key={key}>
          <label htmlFor={key}>{key}</label>
          <input
            type="text"
            id={key}
            name={key}
            value={(formData as any)[key]}
            onChange={handleInputChange}
          />
        </div>
      ))}
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
};

// Usage Example
interface User {
  id: number;
  name: string;
  email: string;
}
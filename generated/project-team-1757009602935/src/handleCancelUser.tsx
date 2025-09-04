const handleCancelUser = () => {
    setSelectedUser(null);
  };

  return (
    <div>
      <DataTable<User>
        data={users}
        columns={[
          { label: 'ID', accessor: 'id' },
          { label: 'Name', accessor: 'name' },
          { label: 'Email', accessor: 'email' },
        ]}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
      />
      {selectedUser && (
        <DataForm<User>
          item={selectedUser}
          onSubmit={handleSaveUser}
          onCancel={handleCancelUser}
        />
      )}
    </div>
  );
};

export default App;
```

This code provides two main components: `DataTable` and `DataForm`.

1. **DataTable Component**:
   - This component displays a table of data with the specified columns.
   - It takes in an array of data, an array of column definitions, and two callback functions for handling edit and delete actions.
   - The table is rendered using HTML table elements, and each row displays the data for the corresponding item.
   - The "Actions" column includes buttons for editing and deleting the item.

2. **DataForm Component**:
   - This component renders a form for creating or editing a data item.
   - It takes in the current item (or `null` if creating a new item), and two callback functions for handling form submission and cancellation.
   - The form is dynamically generated based on the properties of the item object.
   - The `handleInputChange` function updates the form data as the user types.
   - The `handleSubmit` function calls the `onSubmit` callback with the updated form data when the form is submitted.

The example usage in the `App` component demonstrates how these components can be used together to manage user data. The `App` component maintains the list of users and the currently selected user, and passes the necessary callbacks to the `DataTable` and `DataForm` components.

When the user clicks the "Edit" button in the `DataTable`, the `handleEditUser` function is called, which sets the `selectedUser` state. This causes the `DataForm` component to be rendered with the selected user's data.

When the user submits the form, the `handleSaveUser` function is called, which updates the list of users and clears the `selectedUser` state.

When the user clicks the "Cancel" button in the `DataForm`, the `handleCancelUser` function is called, which clears the `selectedUser` state.

This example demonstrates how you can create reusable, type-safe, and customizable UI components for data management in a React-based web application using TypeScript.
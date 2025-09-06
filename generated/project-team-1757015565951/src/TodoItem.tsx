import React, { useState } from 'react';

interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ id, text, completed, onToggle, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);

  const handleToggle = () => {
    onToggle(id);
  };

  const handleDelete = () => {
    onDelete(id);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onToggle(id);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(text);
    setIsEditing(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedText(e.target.value);
  };

  return (
    <div className={`todo-item ${completed ? 'completed' : ''}`}>
      {isEditing ? (
        <div className="todo-item-edit">
          <input type="text" value={editedText} onChange={handleTextChange} />
          <button onClick={handleSave}>Save</button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      ) : (
        <>
          <input type="checkbox" checked={completed} onChange={handleToggle} />
          <span className="todo-text">{text}</span>
          <button onClick={handleEdit}>Edit</button>
          <button onClick={handleDelete}>Delete</button>
        </>
      )}
    </div>
  );
};

export default TodoItem;
```

```typescript
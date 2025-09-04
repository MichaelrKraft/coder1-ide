const handleDeleteUser = (user: User) => {
    setUsers(users.filter((u) => u.id !== user.id));
  };
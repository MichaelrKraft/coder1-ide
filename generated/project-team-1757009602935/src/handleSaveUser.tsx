const handleSaveUser = (user: User) => {
    if (selectedUser) {
      setUsers(
        users.map((u) => (u.id === selectedUser.id ? user : u))
      );
    } else {
      setUsers([...users, user]);
    }
    setSelectedUser(null);
  };
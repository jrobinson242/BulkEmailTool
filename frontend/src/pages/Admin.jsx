import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.jsx';



const Admin = () => {
  const { user, effectiveRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleUpdates, setRoleUpdates] = useState({});




  useEffect(() => {
    if (user && (effectiveRole === 'admin' || effectiveRole === 'superuser')) {
      fetchUsers();
    }
  }, [user, effectiveRole]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId, newRole) => {
    setRoleUpdates((prev) => ({ ...prev, [userId]: newRole }));
  };

  const saveRole = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: roleUpdates[userId] });
      await fetchUsers();
    } catch (err) {
      alert('Failed to update role: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!user || (effectiveRole !== 'admin' && effectiveRole !== 'superuser')) {
    return <div className="container"><h2>Access Denied</h2><p>You do not have permission to view this page.</p></div>;
  }

  return (
    <div className="container">
      <h1>Admin Panel</h1>
      <h2>User Role Management</h2>

      {/* Existing user management */}
      {loading ? (
        <div>Loading users...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Display Name</th>
              <th>Current Role</th>
              <th>Set Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.UserId}>
                <td>{u.Email}</td>
                <td>{u.DisplayName}</td>
                <td>{u.Role}</td>
                <td>
                  <select
                    value={roleUpdates[u.UserId] || u.Role}
                    onChange={(e) => handleRoleChange(u.UserId, e.target.value)}
                    disabled={u.Role === 'superuser' || u.Email?.toLowerCase() === 'john.robinson@rsc.com'}
                  >
                    <option value="user">user</option>
                    <option value="template_creator">template_creator</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => saveRole(u.UserId)}
                    disabled={u.Role === 'superuser' || u.Email?.toLowerCase() === 'john.robinson@rsc.com'}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Admin;

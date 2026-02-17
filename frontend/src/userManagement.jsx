import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { authAPI } from '../services/api';
import Logo from './components/Logo';
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); 
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Team Member'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.getAllUsers();
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateClick = () => {
    setModalMode('create');
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'Team Member'
    });
    setShowModal(true);
    setError('');
    setMessage('');
  };

  const handleEditClick = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowModal(true);
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (modalMode === 'create') {
        await authAPI.register(formData);
        setMessage('User created successfully!');
      } else {
        const updateData = {
          fullName: formData.fullName,
          email: formData.email,
          ...(formData.password && { password: formData.password })
        };
        await authAPI.updateUser(selectedUser.id, updateData);
        setMessage('User updated successfully!');
      }
      
      setTimeout(() => {
        setShowModal(false);
        setMessage('');
        fetchUsers();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    setLoading(true);
    setError('');
    try {
      await authAPI.deleteUser(userId);
      setMessage('User deleted successfully!');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-3xl shadow-xl p-6" style={{ borderTop: '4px solid #092A5E' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo size="medium" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#092A5E' }}>
                  User Management
                </h1>
                <p className="text-sm text-gray-600">Manage team member accounts</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 rounded-xl text-white font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#D40E14' }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Action Bar */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleCreateClick}
            className="px-6 py-3 rounded-xl text-white font-bold shadow-lg transition-all hover:shadow-xl"
            style={{ backgroundColor: '#70CBF4' }}
          >
            + Create New User
          </button>
          <button
            onClick={fetchUsers}
            className="px-6 py-3 rounded-xl border-2 font-semibold transition-all hover:bg-gray-50"
            style={{ borderColor: '#092A5E', color: '#092A5E' }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 rounded-xl border-l-4 bg-green-50 border-green-600 text-green-700 animate-fade-in">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl border-l-4 animate-shake" style={{ backgroundColor: '#fee2e2', borderLeftColor: '#D40E14', color: '#D40E14' }}>
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#092A5E' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">Full Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-6 py-4 text-sm text-gray-900">{user.id}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{user.fullName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: user.role === 'Manager' ? '#70CBF4' : '#e5e7eb',
                            color: user.role === 'Manager' ? 'white' : '#374151'
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                            style={{ backgroundColor: '#70CBF4', color: 'white' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                            style={{ backgroundColor: '#D40E14', color: 'white' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="px-8 pt-8 pb-6 text-center" style={{ backgroundColor: '#092A5E' }}>
              <h2 className="text-2xl font-bold text-white">
                {modalMode === 'create' ? 'Create New User' : 'Edit User'}
              </h2>
            </div>

            <div className="px-8 py-6">
              {message && (
                <div className="mb-4 p-3 rounded-xl border-l-4 bg-green-50 border-green-600 text-green-700 text-sm">
                  {message}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl border-l-4" style={{ backgroundColor: '#fee2e2', borderLeftColor: '#D40E14', color: '#D40E14' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#092A5E' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-[#70CBF4]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#092A5E' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@tui.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-[#70CBF4]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#092A5E' }}>
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-[#70CBF4] bg-white"
                    required
                  >
                    <option value="Team Member">Team Member</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#092A5E' }}>
                    Password {modalMode === 'edit' && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-[#70CBF4]"
                    required={modalMode === 'create'}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl border-2 font-semibold transition-all hover:bg-gray-50"
                    style={{ borderColor: '#092A5E', color: '#092A5E' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl text-white font-bold transition-all"
                    style={{ backgroundColor: loading ? '#a3d9f0' : '#70CBF4' }}
                  >
                    {loading ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;

import { useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";
import "../styles/UserManagement.css";

function UserManagement() {

  // ==========================================
  // CREATE USER FORM
  // ==========================================

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "engineer",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================
  // STAFF USERS
  // ==========================================

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // ==========================================
  // FILTER STATES
  // ==========================================

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ==========================================
  // USER MANAGEMENT STATES
  // ==========================================

  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState("engineer");

  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  // ==========================================
  // LOAD CURRENT USER
  // ==========================================

  const fetchCurrentUser = async () => {
    try {
      const user = await apiRequest("/auth/me");
      setCurrentUser(user);
    } catch (err) {
      setError(err.message || "Unable to load current user");
    }
  };

  // ==========================================
  // LOAD STAFF USERS
  // ==========================================

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError("");

    try {
      const data = await apiRequest("/users/");
      setUsers(data);
    } catch (err) {
      setUsersError(err.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  // ==========================================
  // FILTER STAFF USERS
  // ==========================================

  const filteredUsers = users.filter((user) => {

    // Search by full name or username
    const searchText = searchTerm.trim().toLowerCase();

    const matchesSearch =
      user.full_name.toLowerCase().includes(searchText) ||
      user.username.toLowerCase().includes(searchText);

    // Filter by role
    const matchesRole =
      roleFilter === "all" ||
      user.role === roleFilter;

    // Filter by account status
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // ==========================================
  // CLEAR FILTERS
  // ==========================================

  const handleClearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  // ==========================================
  // HANDLE CREATE USER FORM
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // CREATE STAFF ACCOUNT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const newUser = await apiRequest("/users/", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setMessage(
        `User "${newUser.username}" created successfully!`
      );

      setFormData({
        full_name: "",
        username: "",
        password: "",
        role: "engineer",
      });

      await fetchUsers();

    } catch (err) {
      setError(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EDIT USER ROLE
  // ==========================================

  const handleEditRole = (user) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role);

    setResetUserId(null);
    setNewPassword("");

    setMessage("");
    setError("");
  };

  const handleSaveRole = async (user) => {

    if (
      currentUser?.id === user.id &&
      selectedRole !== "admin"
    ) {
      setError("You cannot remove your own Admin role.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      setMessage(
        `Role updated successfully for "${user.username}".`
      );

      setEditingUserId(null);

      await fetchUsers();

    } catch (err) {
      setError(err.message || "Failed to update role");
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // ACTIVATE / DEACTIVATE USER
  // ==========================================

  const handleToggleStatus = async (user) => {

    const newStatus = !user.is_active;

    if (currentUser?.id === user.id && !newStatus) {
      setError("You cannot deactivate your own account.");
      return;
    }

    const action = newStatus ? "activate" : "deactivate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${user.username}"?`
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: newStatus,
        }),
      });

      setMessage(
        `User "${user.username}" ${
          newStatus ? "activated" : "deactivated"
        } successfully.`
      );

      await fetchUsers();

    } catch (err) {
      setError(
        err.message || "Failed to update account status"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // RESET USER PASSWORD
  // ==========================================

  const handleResetPassword = (user) => {
    setResetUserId(user.id);
    setNewPassword("");

    setEditingUserId(null);

    setMessage("");
    setError("");
  };

  const handleSavePassword = async (user) => {

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/users/${user.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({
          new_password: newPassword,
        }),
      });

      setMessage(
        `Password reset successfully for "${user.username}".`
      );

      setResetUserId(null);
      setNewPassword("");

      await fetchUsers();

    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // USER MANAGEMENT PAGE
  // ==========================================

  return (
    <div className="user-management-page">

      {/* PAGE HEADER */}

      <div className="page-header">
        <h1>User Management</h1>
        <p>
          Create staff accounts, assign roles,
          and manage existing users.
        </p>
      </div>

      {/* ======================================
          CREATE STAFF ACCOUNT
      ====================================== */}

      <div className="user-management-card">

        <h2>Create Staff Account</h2>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="full_name">
              Full Name
            </label>

            <input
              id="full_name"
              type="text"
              name="full_name"
              placeholder="Enter full name"
              value={formData.full_name}
              onChange={handleChange}
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              name="username"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
              minLength={3}
              maxLength={50}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">
              Assign Role
            </label>

            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="admin">Admin</option>
              <option value="engineer">Engineer</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {message && (
            <p className="success-message" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="create-user-btn"
            disabled={loading}
          >
            {loading ? "Creating User..." : "Create User"}
          </button>

        </form>
      </div>

      {/* ======================================
          STAFF USERS
      ====================================== */}

      <div className="user-management-card staff-users-card">

        <div className="staff-users-header">
          <h2>Staff Users</h2>

          <button
            type="button"
            className="refresh-users-btn"
            onClick={fetchUsers}
            disabled={usersLoading || actionLoading}
          >
            {usersLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* ======================================
            FILTERS
        ====================================== */}

        <div className="staff-users-filters">

          <div className="filter-group search-filter">
            <label htmlFor="userSearch">
              Search Users
            </label>

            <input
              id="userSearch"
              type="search"
              placeholder="Search name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="roleFilter">
              Role
            </label>

            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="engineer">Engineer</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="statusFilter">
              Status
            </label>

            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            type="button"
            className="clear-filters-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>

        </div>

        {/* USER COUNT */}

        <div className="staff-users-count">
          Showing {filteredUsers.length} of {users.length} users
        </div>

        {usersError && (
          <p className="error-message" role="alert">
            {usersError}
          </p>
        )}

        {/* ======================================
            STAFF USERS TABLE
        ====================================== */}

        {usersLoading ? (
          <p>Loading staff users...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="no-users-message">
            No matching users found.
          </p>
        ) : (
          <div className="staff-users-table-wrapper">

            <table className="staff-users-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredUsers.map((user) => {

                  const isSelf =
                    currentUser?.id === user.id;

                  return (
                    <tr key={user.id}>

                      <td>{user.id}</td>

                      <td>{user.full_name}</td>

                      <td>{user.username}</td>

                      {/* ROLE */}

                      <td>
                        {editingUserId === user.id ? (
                          <div className="inline-edit">

                            <select
                              value={selectedRole}
                              onChange={(e) =>
                                setSelectedRole(e.target.value)
                              }
                              disabled={actionLoading}
                            >
                              <option value="admin">Admin</option>
                              <option value="engineer">Engineer</option>
                              <option value="viewer">Viewer</option>
                            </select>

                            <button
                              type="button"
                              className="action-btn save-btn"
                              onClick={() => handleSaveRole(user)}
                              disabled={actionLoading}
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              className="action-btn cancel-btn"
                              onClick={() =>
                                setEditingUserId(null)
                              }
                              disabled={actionLoading}
                            >
                              Cancel
                            </button>

                          </div>
                        ) : (
                          <span
                            className={`role-badge role-${user.role}`}
                          >
                            {user.role}
                          </span>
                        )}
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={
                            user.is_active
                              ? "status-badge status-active"
                              : "status-badge status-inactive"
                          }
                        >
                          {user.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div className="user-action-buttons">

                          <button
                            type="button"
                            className="action-btn edit-btn"
                            onClick={() => handleEditRole(user)}
                            disabled={actionLoading}
                          >
                            Edit Role
                          </button>

                          <button
                            type="button"
                            className={
                              user.is_active
                                ? "action-btn deactivate-btn"
                                : "action-btn activate-btn"
                            }
                            onClick={() =>
                              handleToggleStatus(user)
                            }
                            disabled={
                              actionLoading ||
                              (isSelf && user.is_active)
                            }
                          >
                            {user.is_active
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          <button
                            type="button"
                            className="action-btn reset-btn"
                            onClick={() =>
                              handleResetPassword(user)
                            }
                            disabled={actionLoading}
                          >
                            Reset Password
                          </button>

                        </div>

                        {/* RESET PASSWORD FORM */}

                        {resetUserId === user.id && (
                          <div className="password-reset-form">

                            <input
                              type="password"
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) =>
                                setNewPassword(e.target.value)
                              }
                              minLength={8}
                              autoComplete="new-password"
                              aria-label={`New password for ${user.username}`}
                            />

                            <button
                              type="button"
                              className="action-btn save-btn"
                              onClick={() =>
                                handleSavePassword(user)
                              }
                              disabled={actionLoading}
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              className="action-btn cancel-btn"
                              onClick={() => {
                                setResetUserId(null);
                                setNewPassword("");
                              }}
                              disabled={actionLoading}
                            >
                              Cancel
                            </button>

                          </div>
                        )}

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>
          </div>
        )}

      </div>

    </div>
  );
}

export default UserManagement;

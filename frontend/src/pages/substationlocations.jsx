
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getSubstations,
  createSubstation,
  updateSubstation,
  deleteSubstation,
  getCurrentUser,
} from "../services/api";

import "../styles/SubstationLocations.css";

function SubstationLocations() {
  const navigate = useNavigate();

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");

  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [userRole, setUserRole] = useState(null);
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = userRole === "admin" || userRole === "engineer";

  // ==========================================
  // GET - LOAD SUBSTATIONS FROM POSTGRESQL
  // ==========================================

  useEffect(() => {
    let active = true;

    const loadSubstations = async () => {
      try {
        const data = await getSubstations();

        if (active) {
          setLocations(data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSubstations();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((user) => {
        if (active) {
          setUserRole(user.role?.toLowerCase() || null);
          setRoleError("");
        }
      })
      .catch((roleLoadError) => {
        if (active) {
          setUserRole(null);
          setRoleError(
            `Unable to verify your permissions: ${roleLoadError.message}`
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // ==========================================
  // SEARCH / FILTER
  // ==========================================

  const filteredLocations = locations.filter((location) =>
    `${location.name} ${location.description || ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  // ==========================================
  // POST - ADD NEW SUBSTATION
  // ==========================================

  const addLocation = async (e) => {
    e.preventDefault();

    if (!canManage || saving || loading) return;

    const name = newLocation.trim().toUpperCase();
    const description = newDescription.trim();

    if (!name) {
      setError("Please enter a substation name.");
      return;
    }

    const alreadyExists = locations.some(
      (location) =>
        location.id.toUpperCase() === name ||
        location.name.toUpperCase() === name
    );

    if (alreadyExists) {
      setError("This substation already exists.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Send name and description to FastAPI
      const createdLocation = await createSubstation({
        name,
        description,
      });

      // Update React UI after successful database insert
      setLocations((previous) => [
        ...previous,
        createdLocation,
      ]);

      // Clear both input fields
      setNewLocation("");
      setNewDescription("");

      setSuccess("Substation created successfully.");
      alert("Substation created successfully!");
    } catch (err) {
      setError(err.message || "Failed to create substation.");
    } finally {
      setSaving(false);
    }
  };

  const startEditingLocation = (location) => {
    setEditingLocation(location);
    setEditName(location.name);
    setEditDescription(location.description || "");
    setEditError("");
    setError("");
    setSuccess("");
  };

  const saveLocationEdit = async (event) => {
    event.preventDefault();
    if (!canManage || !editingLocation || savingEdit) return;

    const name = editName.trim().toUpperCase();
    if (!name) {
      setEditError("Please enter a substation name.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const updatedLocation = await updateSubstation(
        editingLocation.id,
        {
          name,
          description: editDescription.trim() || null,
        }
      );
      setLocations((previous) =>
        previous.map((location) =>
          location.id === updatedLocation.id
            ? updatedLocation
            : location
        )
      );
      setEditingLocation(null);
      setSuccess("Substation updated successfully.");
    } catch (editSaveError) {
      setEditError(editSaveError.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteLocation = async (location) => {
    if (!canManage || deletingLocationId) return;
    const confirmed = window.confirm(
      `Delete substation "${location.name}"? This is only allowed when it has no associated equipment, schedules, or test history.`
    );
    if (!confirmed) return;

    setDeletingLocationId(location.id);
    setError("");
    setSuccess("");

    try {
      await deleteSubstation(location.id);
      setLocations((previous) =>
        previous.filter((item) => item.id !== location.id)
      );
      setSuccess(`${location.name} deleted successfully.`);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingLocationId(null);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="substation-page">

      {/* PAGE HEADING */}
      <div className="page-heading">
        <div>
          <h1>Substation Locations</h1>
          <p>
            Select a substation to view its electrical equipment.
          </p>
        </div>

        <span className="location-count">
          Total Locations: {locations.length}
        </span>
      </div>

      {/* SEARCH FILTER */}
      <div className="substation-filter">
        <input
          type="text"
          placeholder="Search by substation name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* API ERROR */}
      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      {roleError && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {roleError}
        </p>
      )}
      {success && (
        <p role="status" style={{ color: "#15803d" }}>
          {success}
        </p>
      )}

      {/* LOADING */}
      {loading ? (
        <p>Loading substations...</p>
      ) : (
        <div className="substation-grid">

          {filteredLocations.map((location) => (
            <div
              className="substation-card"
              key={location.id}
            >
              <div className="substation-icon">
                ⚡
              </div>

              <div className="substation-info">
                <h2>{location.name}</h2>
                <p>{location.description}</p>
              </div>

              <div className="substation-actions">

                {/* VIEW EQUIPMENT */}
                <button
                  type="button"
                  className="view-equipment-btn"
                  onClick={() =>
                    navigate(
                      `/substations/${encodeURIComponent(
                        location.id
                      )}/equipment`
                    )
                  }
                >
                  View Equipment →
                </button>

                {canManage && (
                  <>
                    <button
                      type="button"
                      className="edit-substation-btn"
                      onClick={() => startEditingLocation(location)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="delete-substation-btn"
                      disabled={Boolean(deletingLocationId)}
                      onClick={() => deleteLocation(location)}
                    >
                      {deletingLocationId === location.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </>
                )}

              </div>
            </div>
          ))}

          {filteredLocations.length === 0 && (
            <p className="no-substations">
              No matching substations found.
            </p>
          )}

        </div>
      )}

      {/* ADD NEW SUBSTATION */}
      {canManage && (
        <div className="add-substation-section">

          <h2>Add New Substation</h2>

          <form onSubmit={addLocation}>

            <input
              type="text"
              placeholder="Enter Substation Name (Example: PDC-3)"
              value={newLocation}
              onChange={(e) =>
                setNewLocation(e.target.value)
              }
              maxLength={50}
              required
              disabled={saving}
            />

            <input
              type="text"
              placeholder="Enter Substation Description"
              value={newDescription}
              onChange={(e) =>
                setNewDescription(e.target.value)
              }
              maxLength={255}
              disabled={saving}
            />

            <button
              type="submit"
              disabled={saving || loading}
            >
              {saving
                ? "Adding..."
                : "+ Add Substation"}
            </button>

          </form>
        </div>
      )}

      {editingLocation && (
        <div className="substation-modal-backdrop">
          <section
            className="substation-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-substation-title"
          >
            <h2 id="edit-substation-title">Edit Substation</h2>
            <form onSubmit={saveLocationEdit}>
              <label>
                Substation name
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={100}
                  required
                  disabled={savingEdit}
                />
              </label>
              <label>
                Description
                <input
                  type="text"
                  value={editDescription}
                  onChange={(event) =>
                    setEditDescription(event.target.value)
                  }
                  maxLength={255}
                  disabled={savingEdit}
                />
              </label>
              {editError && (
                <p className="substation-edit-error" role="alert">
                  {editError}
                </p>
              )}
              <div className="substation-edit-actions">
                <button
                  type="button"
                  className="substation-cancel-btn"
                  onClick={() => setEditingLocation(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

    </div>
  );
}

export default SubstationLocations;

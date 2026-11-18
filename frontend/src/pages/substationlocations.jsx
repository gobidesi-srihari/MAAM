
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getSubstations,
  createSubstation,
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Temporary role for UI testing.
  // TODO: Get actual role from authenticated user.
  const userRole = "admin";

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

    if (saving || loading) return;

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

      alert("Substation created successfully!");
    } catch (err) {
      setError(err.message || "Failed to create substation.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE - NOT IMPLEMENTED YET
  // ==========================================

  const deleteLocation = (id) => {
    alert(
      `Deletion of ${id} is disabled until the backend ` +
      "can verify that the substation contains no equipment."
    );
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

                {/* ADMIN DELETE */}
                {userRole === "admin" && (
                  <button
                    type="button"
                    className="delete-substation-btn"
                    onClick={() =>
                      deleteLocation(location.id)
                    }
                  >
                    Delete
                  </button>
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
      <div className="add-substation-section">

        <h2>Add New Substation</h2>

        <form onSubmit={addLocation}>

          {/* SUBSTATION NAME */}
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

          {/* SUBSTATION DESCRIPTION */}
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

          {/* ADD BUTTON */}
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

    </div>
  );
}

export default SubstationLocations;

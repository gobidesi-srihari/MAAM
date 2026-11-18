
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getEquipmentTypes,
  createEquipmentType,
} from "../services/api";

import "../styles/LocationEquipment.css";

function LocationEquipment() {
  const { locationId } = useParams();
  const navigate = useNavigate();

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [newEquipmentType, setNewEquipmentType] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // FETCH EQUIPMENT TYPES FROM POSTGRESQL
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadEquipmentTypes() {
      setLoading(true);
      setError("");
      setSuccess("");
      setEquipmentTypes([]);

      try {
        const data = await getEquipmentTypes(locationId);

        if (active) {
          setEquipmentTypes(data);
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
    }

    loadEquipmentTypes();

    return () => {
      active = false;
    };
  }, [locationId]);

  // ==========================================
  // SEARCH EQUIPMENT TYPES
  // ==========================================

  const filteredEquipmentTypes = equipmentTypes.filter(
    (equipment) =>
      equipment.name
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );

  // ==========================================
  // CREATE EQUIPMENT TYPE
  // ==========================================

  const addEquipmentType = async (e) => {
    e.preventDefault();

    const name = newEquipmentType.trim();

    setError("");
    setSuccess("");

    if (!name) {
      setError("Please enter an Equipment Type.");
      return;
    }

    // Prevent duplicate equipment types
    const exists = equipmentTypes.some(
      (equipment) =>
        equipment.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      setError("This Equipment Type already exists.");
      return;
    }

    setSaving(true);

    try {
      // Save equipment type to PostgreSQL
      await createEquipmentType(locationId, { name });

      // Reload latest equipment types from database
      const updatedTypes = await getEquipmentTypes(locationId);

      setEquipmentTypes(updatedTypes);
      setNewEquipmentType("");
      setSuccess("Equipment Type created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // OPEN EQUIPMENT CATEGORY
  // ==========================================

  const openCategory = (equipment) => {
    navigate(
      `/substations/${encodeURIComponent(
        locationId
      )}/equipment/category/${encodeURIComponent(
        equipment.name
      )}`
    );
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="equipment-page">

      {/* PAGE HEADING */}
      <div className="page-heading">
        <div>
          <h1>{locationId} - Equipment Types</h1>

          <p>
            Manage equipment types for this substation.
          </p>
        </div>

        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/substations")}
        >
          ← Back to Locations
        </button>
      </div>

      {/* SUMMARY */}
      <div className="equipment-summary">
        <h3>Total Equipment Types</h3>
        <h2>{equipmentTypes.length}</h2>
      </div>

      {/* SEARCH */}
      <div className="equipment-filter">
        <input
          type="text"
          placeholder="Search equipment types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* EQUIPMENT TYPE LIST */}
      <div className="equipment-list-section">
        <h2>Equipment Types</h2>

        {loading ? (
          <p>Loading equipment types...</p>
        ) : (
          <div className="equipment-grid">

            {filteredEquipmentTypes.map((equipment) => (
              <div
                className="equipment-card"
                key={equipment.id}
              >
                <div className="equipment-icon">
                  ⚡
                </div>

                <div className="equipment-category-info">
                  <h3>{equipment.name}</h3>

                  <p>
                    Equipment category
                  </p>
                </div>

                <button
                  type="button"
                  className="view-equipment-btn"
                  onClick={() => openCategory(equipment)}
                >
                  View Equipment →
                </button>
              </div>
            ))}

            {filteredEquipmentTypes.length === 0 && (
              <p className="no-equipment">
                {equipmentTypes.length === 0
                  ? "No equipment types created for this substation."
                  : "No matching equipment types found."}
              </p>
            )}

          </div>
        )}
      </div>

      {/* CREATE NEW EQUIPMENT TYPE */}
      <div className="add-equipment-section">

        <h2>Create New Equipment Type</h2>

        <form onSubmit={addEquipmentType}>

          <input
            type="text"
            placeholder="Enter Equipment Type (Example: Transformer)"
            value={newEquipmentType}
            onChange={(e) => {
              setNewEquipmentType(e.target.value);
              setError("");
              setSuccess("");
            }}
            maxLength={100}
            required
          />

          <button
            type="submit"
            disabled={saving || loading}
          >
            {saving
              ? "Creating..."
              : "+ Create Equipment Type"}
          </button>

        </form>

        {error && (
          <p className="equipment-form-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            style={{
              color: "#15803d",
              marginTop: "12px",
              fontSize: "14px",
            }}
          >
            {success}
          </p>
        )}

      </div>

    </div>
  );
}

export default LocationEquipment;

import "../styles/EquipmentCategory.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getEquipmentTypes,
  getEquipment,
  createEquipment,
} from "../services/api";

import "../styles/LocationEquipment.css";

function EquipmentCategory() {
  const { locationId, categoryType } = useParams();
  const navigate = useNavigate();

  const [equipmentType, setEquipmentType] = useState(null);
  const [equipmentList, setEquipmentList] = useState([]);

  const [equipmentId, setEquipmentId] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // LOAD EQUIPMENT FROM POSTGRESQL
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadEquipment() {
      setLoading(true);
      setError("");
      setEquipmentType(null);
      setEquipmentList([]);

      try {
        const types = await getEquipmentTypes(locationId);

        const selectedType = types.find(
          (type) =>
            type.name.toLowerCase() ===
            categoryType.toLowerCase()
        );

        if (!selectedType) {
          throw new Error(
            "Equipment Type not found in this substation."
          );
        }

        const records = await getEquipment(
          locationId,
          selectedType.id
        );

        if (active) {
          setEquipmentType(selectedType);
          setEquipmentList(records);
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

    loadEquipment();

    return () => {
      active = false;
    };
  }, [locationId, categoryType]);

  // ==========================================
  // FILTER EQUIPMENT
  // ==========================================

  const filteredEquipment = equipmentList.filter(
    (equipment) =>
      equipment.id.toLowerCase().includes(
        search.toLowerCase()
      ) ||
      (equipment.name || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  // ==========================================
  // CREATE INDIVIDUAL EQUIPMENT
  // ==========================================

  const handleCreateEquipment = async (e) => {
    e.preventDefault();

    if (!equipmentType || saving) return;

    const id = equipmentId.trim().toUpperCase();
    const name = equipmentName.trim();
    const details = description.trim();

    setError("");
    setSuccess("");

    if (!id) {
      setError("Please enter an Equipment ID.");
      return;
    }

    const exists = equipmentList.some(
      (item) => item.id.toUpperCase() === id
    );

    if (exists) {
      setError("Equipment ID already exists in this category.");
      return;
    }

    setSaving(true);

    try {
      await createEquipment(
        locationId,
        equipmentType.id,
        {
          id,
          name: name || null,
          description: details || null,
        }
      );

      const updatedEquipment = await getEquipment(
        locationId,
        equipmentType.id
      );

      setEquipmentList(updatedEquipment);

      setEquipmentId("");
      setEquipmentName("");
      setDescription("");

      setSuccess("Equipment created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // OPEN EQUIPMENT DETAILS
  // ==========================================


    const openEquipmentDetails = (id) => {
    const substation = encodeURIComponent(locationId);
    const equipment = encodeURIComponent(id);

    const typeName = equipmentType?.name
        ?.trim()
        .toLowerCase();

    if (
        typeName === "transformer" ||
        typeName === "power transformer"
    ) {
        navigate(
        `/substations/${substation}/transformer/${equipment}`
        );
    } else {
        navigate(
        `/substations/${substation}/equipment/${equipment}`
        );
    }
    };


  return (
    <div className="equipment-page">

      {/* PAGE HEADING */}
      <div className="page-heading">
        <div>
          <h1>
            {locationId} - {categoryType}
          </h1>
          <p>
            View and manage individual equipment records.
          </p>
        </div>

        <button
          type="button"
          className="back-btn"
          onClick={() =>
            navigate(
              `/substations/${encodeURIComponent(locationId)}/equipment`
            )
          }
        >
          ← Back to Equipment Types
        </button>
      </div>

      {/* EQUIPMENT SUMMARY */}
      <div className="equipment-summary">
        <h3>Total Equipment</h3>
        <h2>{equipmentList.length}</h2>
      </div>

      {/* SEARCH */}
      <div className="equipment-filter">
        <input
          type="text"
          placeholder="Search Equipment ID or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* EQUIPMENT LIST */}
      <div className="equipment-list-section">
        <h2>Equipment List</h2>

        {loading ? (
          <p>Loading equipment...</p>
        ) : (
          <div className="equipment-grid">
            {filteredEquipment.map((equipment) => (
              <div
                className="equipment-card"
                key={equipment.id}
              >
                <div className="equipment-icon">
                  ⚡
                </div>

                <div className="equipment-category-info">
                  <h3>{equipment.id}</h3>
                  <p>
                    {equipment.name || "No equipment name"}
                  </p>
                  {equipment.description && (
                    <p>{equipment.description}</p>
                  )}
                </div>

                <button
                  type="button"
                  className="view-equipment-btn"
                  onClick={() =>
                    openEquipmentDetails(equipment.id)
                  }
                >
                  View Details →
                </button>
              </div>
            ))}

            {!error && filteredEquipment.length === 0 && (
              <p className="no-equipment">
                {equipmentList.length === 0
                  ? "No equipment registered in this category."
                  : "No matching equipment found."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CREATE NEW EQUIPMENT */}
      <div className="add-equipment-section">
        <h2>Create New Equipment</h2>

        <form onSubmit={handleCreateEquipment}>
          <input
            type="text"
            placeholder="Equipment ID (Example: TR-1)"
            value={equipmentId}
            onChange={(e) =>
              setEquipmentId(e.target.value)
            }
            maxLength={50}
            required
          />

          <input
            type="text"
            placeholder="Equipment Name (Optional)"
            value={equipmentName}
            onChange={(e) =>
              setEquipmentName(e.target.value)
            }
            maxLength={100}
          />

          <input
            type="text"
            placeholder="Description (Optional)"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            maxLength={255}
          />

          <button
            type="submit"
            disabled={saving || loading || !equipmentType}
          >
            {saving
              ? "Creating..."
              : "+ Create Equipment"}
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
            }}
          >
            {success}
          </p>
        )}
      </div>
    </div>
  );
}

export default EquipmentCategory;

import "../styles/EquipmentCategory.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getEquipmentTypes,
  getEquipment,
  createEquipment,
  updateEquipmentRecord,
  deleteEquipmentRecord,
  downloadEquipmentExport,
  getCurrentUser,
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
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingEquipmentId, setDeletingEquipmentId] = useState(null);
  const [downloadingEquipmentId, setDownloadingEquipmentId] = useState(null);
  const [exportTokens, setExportTokens] = useState({});
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [roleError, setRoleError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = userRole === "admin" || userRole === "engineer";
  const canDelete = userRole === "admin";

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

    if (!canManage || !equipmentType || saving) return;

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

  const startEditingEquipment = (equipment) => {
    setEditingEquipment(equipment);
    setEditName(equipment.name || "");
    setEditDescription(equipment.description || "");
    setEditError("");
    setError("");
    setSuccess("");
  };

  const saveEquipmentEdit = async (event) => {
    event.preventDefault();
    if (!canManage || !equipmentType || !editingEquipment || savingEdit) {
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const updatedEquipment = await updateEquipmentRecord(
        locationId,
        equipmentType.id,
        editingEquipment.id,
        {
          name: editName.trim() || null,
          description: editDescription.trim() || null,
        }
      );
      setEquipmentList((previous) =>
        previous.map((equipment) =>
          equipment.id === updatedEquipment.id
            ? updatedEquipment
            : equipment
        )
      );
      setExportTokens((previous) => {
        const remaining = { ...previous };
        delete remaining[editingEquipment.id];
        return remaining;
      });
      setEditingEquipment(null);
      setSuccess("Equipment updated successfully.");
    } catch (editSaveError) {
      setEditError(editSaveError.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEquipment = async (equipment) => {
    const exportToken = exportTokens[equipment.id];
    if (!canDelete || !equipmentType || !exportToken || deletingEquipmentId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete equipment "${equipment.id}" and its schedules, test history, and nameplate image? Its Excel export has already been downloaded.`
    );
    if (!confirmed) return;

    setDeletingEquipmentId(equipment.id);
    setError("");
    setSuccess("");

    try {
      const result = await deleteEquipmentRecord(
        locationId,
        equipmentType.id,
        equipment.id,
        exportToken
      );
      setEquipmentList((previous) =>
        previous.filter((item) => item.id !== equipment.id)
      );
      setExportTokens((previous) => {
        const remaining = { ...previous };
        delete remaining[equipment.id];
        return remaining;
      });
      setSuccess(
        result.warning ||
          `${equipment.id} and its related records were deleted.`
      );
    } catch (deleteError) {
      setExportTokens((previous) => {
        const remaining = { ...previous };
        delete remaining[equipment.id];
        return remaining;
      });
      setError(deleteError.message);
    } finally {
      setDeletingEquipmentId(null);
    }
  };

  const handleDownloadEquipment = async (equipment) => {
    if (!canDelete || !equipmentType || downloadingEquipmentId) return;

    setDownloadingEquipmentId(equipment.id);
    setError("");
    setSuccess("");

    try {
      const exported = await downloadEquipmentExport(
        locationId,
        equipmentType.id,
        equipment.id
      );
      const objectUrl = window.URL.createObjectURL(exported.blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = exported.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);

      setExportTokens((previous) => ({
        ...previous,
        [equipment.id]: exported.exportToken,
      }));
      setSuccess(
        `Excel export downloaded for ${equipment.id}. Delete is now enabled.`
      );
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloadingEquipmentId(null);
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

      {error && (
        <p className="equipment-form-error" role="alert">
          {error}
        </p>
      )}
      {roleError && (
        <p className="equipment-form-error" role="alert">
          {roleError}
        </p>
      )}
      {success && (
        <p className="equipment-form-success" role="status">
          {success}
        </p>
      )}

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

                <div className="equipment-card-actions">
                  <button
                    type="button"
                    className="view-equipment-btn"
                    onClick={() =>
                      openEquipmentDetails(equipment.id)
                    }
                  >
                    View Details →
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      className="edit-equipment-btn"
                      onClick={() =>
                        startEditingEquipment(equipment)
                      }
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <>
                      <button
                        type="button"
                        className="download-equipment-btn"
                        disabled={
                          downloadingEquipmentId === equipment.id
                        }
                        onClick={() =>
                          handleDownloadEquipment(equipment)
                        }
                      >
                        {downloadingEquipmentId === equipment.id
                          ? "Preparing Excel..."
                          : exportTokens[equipment.id]
                          ? "Download Again"
                          : "Download Excel"}
                      </button>
                      <button
                        type="button"
                        className="delete-equipment-btn"
                        disabled={
                          !exportTokens[equipment.id] ||
                          Boolean(deletingEquipmentId) ||
                          downloadingEquipmentId === equipment.id
                        }
                        title={
                          exportTokens[equipment.id]
                            ? "Delete equipment and related data"
                            : "Download the Excel file before deleting"
                        }
                        onClick={() =>
                          handleDeleteEquipment(equipment)
                        }
                      >
                        {deletingEquipmentId === equipment.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                      {!exportTokens[equipment.id] && (
                        <span className="equipment-export-required">
                          Download Excel before deleting
                        </span>
                      )}
                    </>
                  )}
                </div>
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
      {canManage && (
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
      </div>
      )}

      {editingEquipment && (
        <div className="equipment-modal-backdrop">
          <section
            className="equipment-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-equipment-title"
          >
            <h2 id="edit-equipment-title">Edit Equipment</h2>
            <form onSubmit={saveEquipmentEdit}>
              <label>
                Equipment ID
                <input value={editingEquipment.id} readOnly />
              </label>
              <label>
                Equipment name
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={100}
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
                <p className="equipment-form-error" role="alert">
                  {editError}
                </p>
              )}
              <div className="equipment-edit-actions">
                <button
                  type="button"
                  className="equipment-cancel-btn"
                  onClick={() => setEditingEquipment(null)}
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

export default EquipmentCategory;

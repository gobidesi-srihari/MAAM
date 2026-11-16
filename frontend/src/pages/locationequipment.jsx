
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const initialEquipment = {
  "PDC-1": [
    { id: "TR-1", type: "Transformer" },
    { id: "TR-2", type: "Transformer" },
    { id: "TR-3", type: "Transformer" },
    { id: "CB-1", type: "Circuit Breaker" },
    { id: "PANEL-1", type: "Panel" },
    { id: "33KV-SY-1", type: "33 kV Switchyard" },
    { id: "CTPT-F1", type: "CT/PT Feeder" }
  ],
  "PDC-2": []
};

function LocationEquipment() {
  const { locationId } = useParams();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState(
    () => initialEquipment[locationId] || []
  );

  const [equipmentId, setEquipmentId] = useState("");
  const [equipmentType, setEquipmentType] = useState("Transformer");

  const equipmentTypes = [
    "Transformer",
    "Circuit Breaker",
    "Panel",
    "33 kV Switchyard",
    "CT/PT Feeder"
  ];

  const addEquipment = (e) => {
    e.preventDefault();

    const id = equipmentId.trim().toUpperCase();

    if (!id) return;

    const exists = equipment.some(
      (item) => item.id.toLowerCase() === id.toLowerCase()
    );

    if (exists) {
      alert("This equipment ID already exists.");
      return;
    }

    setEquipment((previous) => [
      ...previous,
      {
        id,
        type: equipmentType
      }
    ]);

    setEquipmentId("");
  };

  return (
    <div className="equipment-page">

      <div className="page-heading">
        <div>
          <h1>{locationId} - Equipment</h1>
          <p>
            Electrical equipment registered under {locationId}.
          </p>
        </div>

        <button
          className="back-btn"
          onClick={() => navigate("/substations")}
        >
          ← Back to Locations
        </button>
      </div>

      <div className="equipment-summary">
        <h3>Total Equipment</h3>
        <h2>{equipment.length}</h2>
      </div>

      <div className="equipment-list-section">
        <h2>Equipment List</h2>

        {equipment.length === 0 ? (
          <div className="empty-state">
            <h3>No Equipment Added Yet</h3>
            <p>
              There is no equipment registered under {locationId}.
              Add equipment using the form below.
            </p>
          </div>
        ) : (
          <div className="equipment-grid">

            {equipment.map((item) => (
              <div className="equipment-card" key={item.id}>

                <div className="equipment-icon">⚡</div>

                <h3>{item.id}</h3>

                <p>{item.type}</p>

                <button
                  onClick={() =>
                    navigate(
                      `/substations/${locationId}/equipment/${encodeURIComponent(item.id)}`
                    )
                  }
                >
                  View Details →
                </button>

              </div>
            ))}

          </div>
        )}
      </div>

      <div className="add-equipment-section">

        <h2>Add Equipment</h2>

        <form onSubmit={addEquipment}>

          <div>
            <label>Equipment ID</label>

            <input
              type="text"
              placeholder="Example: TR-4"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Equipment Type</label>

            <select
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
            >
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button type="submit">
            + Add Equipment
          </button>

        </form>
      </div>

    </div>
  );
}

export default LocationEquipment;

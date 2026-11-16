
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function SubstationLocations() {
  const navigate = useNavigate();

  const [locations, setLocations] = useState([
    {
      id: "PDC-1",
      name: "PDC-1",
      description: "Power Distribution Centre 1"
    },
    {
      id: "PDC-2",
      name: "PDC-2",
      description: "Power Distribution Centre 2"
    }
  ]);

  const [newLocation, setNewLocation] = useState("");

  const addLocation = (e) => {
    e.preventDefault();

    const name = newLocation.trim().toUpperCase();

    if (!name) return;

    const alreadyExists = locations.some(
      (location) => location.id === name
    );

    if (alreadyExists) {
      alert("This substation already exists.");
      return;
    }

    setLocations([
      ...locations,
      {
        id: name,
        name: name,
        description: "New Substation"
      }
    ]);

    setNewLocation("");
  };

  return (
    <div className="substation-page">

      <div className="page-heading">
        <div>
          <h1>Substation Locations</h1>
          <p>Select a substation to view its electrical equipment.</p>
        </div>

        <span className="location-count">
          Total Locations: {locations.length}
        </span>
      </div>

      <div className="substation-grid">

        {locations.map((location) => (
          <div
            className="substation-card"
            key={location.id}
            onClick={() =>
              navigate(`/substations/${location.id}/equipment`)
            }
          >
            <div className="substation-icon">⚡</div>

            <h2>{location.name}</h2>

            <p>{location.description}</p>

            <button
              type="button"
              className="view-equipment-btn"
            >
              View Equipment →
            </button>
          </div>
        ))}

      </div>

      <div className="add-substation-section">
        <h2>Add New Substation</h2>

        <form onSubmit={addLocation}>
          <input
            type="text"
            placeholder="Enter Substation Name (Example: PDC-3)"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
          />

          <button type="submit">
            + Add Substation
          </button>
        </form>
      </div>

    </div>
  );
}

export default SubstationLocations;

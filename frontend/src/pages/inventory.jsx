
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const inventoryData = [
  { id: "TR-1", type: "Power Transformer", location: "PDC-1", status: "Registered" },
  { id: "TR-2", type: "Power Transformer", location: "PDC-1", status: "Registered" },
  { id: "TR-3", type: "Power Transformer", location: "PDC-1", status: "Registered" },
  { id: "CB-1", type: "Circuit Breaker", location: "PDC-1", status: "Registered" },
  { id: "PANEL-1", type: "Electrical Panel", location: "PDC-1", status: "Registered" },
  { id: "33KV-SY-1", type: "33 kV Switchyard", location: "PDC-1", status: "Registered" },
  { id: "CTPT-F1", type: "CT/PT Feeder", location: "PDC-1", status: "Registered" }
];

function Inventory() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const filteredEquipment = useMemo(() => {
    return inventoryData.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase());

      const matchesLocation =
        locationFilter === "All" || item.location === locationFilter;

      const matchesType =
        typeFilter === "All" || item.type === typeFilter;

      return matchesSearch && matchesLocation && matchesType;
    });
  }, [search, locationFilter, typeFilter]);

  return (
    <div className="inventory-page">

      <div className="page-heading">
        <div>
          <h1>Equipment Inventory</h1>
          <p>Complete electrical equipment register across substations.</p>
        </div>
      </div>

      <div className="inventory-summary">
        <div className="inventory-stat-card">
          <span>Total Equipment</span>
          <h2>{inventoryData.length}</h2>
        </div>

        <div className="inventory-stat-card">
          <span>Substations</span>
          <h2>2</h2>
        </div>

        <div className="inventory-stat-card">
          <span>Transformers</span>
          <h2>3</h2>
        </div>

        <div className="inventory-stat-card">
          <span>Other Equipment</span>
          <h2>4</h2>
        </div>
      </div>

      <div className="inventory-list-section">

        <div className="inventory-section-heading">
          <div>
            <h2>Equipment Register</h2>
            <p>Search and view registered equipment details.</p>
          </div>
        </div>

        <div className="inventory-filters">
          <input
            type="text"
            placeholder="Search equipment ID or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="All">All Substations</option>
            <option value="PDC-1">PDC-1</option>
            <option value="PDC-2">PDC-2</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Equipment Types</option>
            <option value="Power Transformer">Power Transformer</option>
            <option value="Circuit Breaker">Circuit Breaker</option>
            <option value="Electrical Panel">Electrical Panel</option>
            <option value="33 kV Switchyard">33 kV Switchyard</option>
            <option value="CT/PT Feeder">CT/PT Feeder</option>
          </select>
        </div>

        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Equipment ID</th>
                <th>Equipment Type</th>
                <th>Substation</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredEquipment.length > 0 ? (
                filteredEquipment.map((item, index) => (
                  <tr key={`${item.location}-${item.id}`}>
                    <td>{index + 1}</td>
                    <td><strong>{item.id}</strong></td>
                    <td>{item.type}</td>
                    <td>{item.location}</td>
                    <td>
                      <span className="inventory-status">
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="inventory-view-btn"
                        onClick={() =>
                          navigate(
                            `/substations/${item.location}/equipment/${encodeURIComponent(item.id)}`
                          )
                        }
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="inventory-no-results">
                    No matching equipment found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="inventory-result-count">
          Showing {filteredEquipment.length} of {inventoryData.length} equipment records
        </p>

      </div>
    </div>
  );
}

export default Inventory;

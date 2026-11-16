
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function EquipmentDetails() {
  const { locationId, equipmentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("nameplate");

  const equipmentType = equipmentId.startsWith("TR")
    ? "Power Transformer"
    : equipmentId.startsWith("CB")
    ? "Circuit Breaker"
    : equipmentId.startsWith("PANEL")
    ? "Electrical Panel"
    : equipmentId.startsWith("CTPT")
    ? "CT/PT Feeder"
    : "Electrical Equipment";

  const tabs = [
    { id: "nameplate", label: "Nameplate Details" },
    { id: "history", label: "Test History" },
    { id: "oil", label: "Oil Testing" },
    { id: "dga", label: "DGA Analysis" },
    { id: "winding", label: "Winding Parameters" },
    { id: "readings", label: "Electrical Readings" },
    { id: "assessment", label: "Assessment" }
  ];

  const renderField = (label, value) => (
    <div className="detail-field" key={label}>
      <span>{label}</span>
      <strong>{value || "Not entered"}</strong>
    </div>
  );

  return (
    <div className="equipment-details-page">
      <div className="details-topbar">
        <button
          className="details-back-btn"
          onClick={() => navigate(`/substations/${locationId}/equipment`)}
        >
          ← Back to Equipment
        </button>
        <span className="details-breadcrumb">
          {locationId} / {equipmentId}
        </span>
      </div>

      <section className="equipment-profile">
        <div className="profile-icon">⚡</div>

        <div className="profile-info">
          <span className="profile-label">EQUIPMENT DETAILS</span>
          <h1>{equipmentId}</h1>
          <p>{equipmentType} · {locationId}</p>
        </div>

        <div className="profile-status">
          <span className="status-dot"></span>
          Registered Equipment
        </div>
      </section>

      <section className="equipment-overview">
        <div className="overview-card">
          <span>Equipment ID</span>
          <strong>{equipmentId}</strong>
        </div>
        <div className="overview-card">
          <span>Equipment Type</span>
          <strong>{equipmentType}</strong>
        </div>
        <div className="overview-card">
          <span>Substation</span>
          <strong>{locationId}</strong>
        </div>
        <div className="overview-card">
          <span>Latest Test</span>
          <strong>Not Available</strong>
        </div>
      </section>

      <section className="details-content">
        <div className="details-section-heading">
          <div>
            <h2>Technical Information</h2>
            <p>Equipment specifications, testing records and condition details</p>
          </div>
        </div>

        <div className="details-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "details-tab active" : "details-tab"}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="details-panel">
          {activeTab === "nameplate" && (
            <>
              <h3>Nameplate Details</h3>
              <p className="panel-description">
                Basic identification and manufacturer specifications.
              </p>
              <div className="details-grid">
                {renderField("Equipment Number", equipmentId)}
                {renderField("Equipment Type", equipmentType)}
                {renderField("Substation Location", locationId)}
                {renderField("Manufacturer", "Not entered")}
                {renderField("Make / Model", "Not entered")}
                {renderField("Serial Number", "Not entered")}
                {renderField("Year of Manufacture", "Not entered")}
                {renderField("Rated Voltage", "Not entered")}
                {renderField("Rated Capacity", "Not entered")}
                {renderField("Installation Date", "Not entered")}
              </div>
            </>
          )}

          {activeTab === "history" && (
            <>
              <h3>Year-wise Test History</h3>
              <p className="panel-description">
                Record inspection and testing results for each year.
              </p>
              <div className="empty-details">
                <span>📋</span>
                <h4>No Test Records Available</h4>
                <p>Test history can be added here when records are available.</p>
              </div>
            </>
          )}

          {activeTab === "oil" && (
            <>
              <h3>Transformer Oil Testing</h3>
              <p className="panel-description">
                Oil test observations and laboratory results.
              </p>
              <div className="details-grid">
                {renderField("Test Date", "Not entered")}
                {renderField("BDV", "Not entered")}
                {renderField("Moisture Content", "Not entered")}
                {renderField("Acidity", "Not entered")}
                {renderField("Interfacial Tension", "Not entered")}
                {renderField("Resistivity", "Not entered")}
                {renderField("Test Standard / Reference", "Not entered")}
                {renderField("Laboratory / Report Reference", "Not entered")}
              </div>
            </>
          )}

          {activeTab === "dga" && (
            <>
              <h3>Dissolved Gas Analysis (DGA)</h3>
              <p className="panel-description">
                Record laboratory gas concentration results.
              </p>
              <div className="details-grid">
                {renderField("Test Date", "Not entered")}
                {renderField("Hydrogen (H₂)", "Not entered")}
                {renderField("Methane (CH₄)", "Not entered")}
                {renderField("Ethane (C₂H₆)", "Not entered")}
                {renderField("Ethylene (C₂H₄)", "Not entered")}
                {renderField("Acetylene (C₂H₂)", "Not entered")}
                {renderField("Carbon Monoxide (CO)", "Not entered")}
                {renderField("Carbon Dioxide (CO₂)", "Not entered")}
                {renderField("Total Dissolved Combustible Gas", "Not entered")}
                {renderField("Analysis Reference", "Not entered")}
              </div>
            </>
          )}

          {activeTab === "winding" && (
            <>
              <h3>Winding Parameters</h3>
              <p className="panel-description">
                Record winding resistance and insulation test observations.
              </p>
              <div className="details-grid">
                {renderField("Test Date", "Not entered")}
                {renderField("HV – LV", "Not entered")}
                {renderField("HV – Earth", "Not entered")}
                {renderField("LV – Earth", "Not entered")}
                {renderField("Winding Resistance", "Not entered")}
                {renderField("Test Temperature", "Not entered")}
                {renderField("Test Instrument", "Not entered")}
                {renderField("Test Remarks", "Not entered")}
              </div>
            </>
          )}

          {activeTab === "readings" && (
            <>
              <h3>Electrical Readings</h3>
              <p className="panel-description">
                Record operating voltage, current, load and temperature.
              </p>
              <div className="details-grid">
                {renderField("Reading Date", "Not entered")}
                {renderField("HV Voltage", "Not entered")}
                {renderField("LV Voltage", "Not entered")}
                {renderField("Phase Current", "Not entered")}
                {renderField("Load", "Not entered")}
                {renderField("Top Oil Temperature", "Not entered")}
                {renderField("Winding Temperature", "Not entered")}
                {renderField("CT / PT Readings", "Not entered")}
              </div>
            </>
          )}

          {activeTab === "assessment" && (
            <>
              <h3>Assessment & Conclusion</h3>
              <p className="panel-description">
                Record the engineer's review and recommended actions.
              </p>
              <div className="details-grid">
                {renderField("Overall Condition", "Not assessed")}
                {renderField("Assessment Date", "Not entered")}
                {renderField("Reviewed By", "Not entered")}
                {renderField("Recommended Action", "Not entered")}
              </div>
              <div className="remarks-field">
                <span>Observations / Conclusion</span>
                <p>No assessment has been recorded.</p>
              </div>
              <div className="remarks-field">
                <span>Recommendations</span>
                <p>No recommendations have been recorded.</p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default EquipmentDetails;

import "../styles/reports.css";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const reportData = [
  {
    id: "RPT-BDV-001",
    title: "Breakdown Voltage (BDV) Report",
    equipment: "TR-1",
    equipmentType: "Power Transformer",
    location: "PDC-1",
    type: "Oil Testing",
    section: "bdv",
  },
  {
    id: "RPT-WATER-001",
    title: "Water Content Report",
    equipment: "TR-1",
    equipmentType: "Power Transformer",
    location: "PDC-1",
    type: "Oil Testing",
    section: "water",
  },
];

function Reports() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [equipmentTypeFilter, setEquipmentTypeFilter] =
    useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  const reportTypes = [
    "All",
    ...new Set(reportData.map((r) => r.type)),
  ];

  const equipmentTypes = [
    "All",
    ...new Set(reportData.map((r) => r.equipmentType)),
  ];

  const locations = [
    "All",
    ...new Set(reportData.map((r) => r.location)),
  ];

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reportData.filter((report) => {
      const matchesSearch = [
        report.id,
        report.title,
        report.equipment,
        report.equipmentType,
        report.location,
      ].some((value) =>
        value.toLowerCase().includes(query)
      );

      const matchesType =
        typeFilter === "All" ||
        report.type === typeFilter;

      const matchesEquipmentType =
        equipmentTypeFilter === "All" ||
        report.equipmentType === equipmentTypeFilter;

      const matchesLocation =
        locationFilter === "All" ||
        report.location === locationFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesEquipmentType &&
        matchesLocation
      );
    });
  }, [
    search,
    typeFilter,
    equipmentTypeFilter,
    locationFilter,
  ]);

  const openReport = (report) => {
    const location = encodeURIComponent(report.location);
    const equipment = encodeURIComponent(report.equipment);

    navigate(
      `/substations/${location}/transformer/${equipment}?section=${report.section}`
    );
  };

  return (
    <div className="reports-page">
      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>
            View equipment testing reports and
            historical measurement graphs.
          </p>
        </div>
      </div>

      <div className="reports-list-section">
        <h2>Report Register</h2>
        <p>Search and filter equipment reports.</p>

        <div className="reports-filters">
          <input
            type="text"
            placeholder="Search report or equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={locationFilter}
            onChange={(e) =>
              setLocationFilter(e.target.value)
            }
          >
            {locations.map((location) => (
              <option key={location} value={location}>
                {location === "All"
                  ? "All Substations"
                  : location}
              </option>
            ))}
          </select>

          <select
            value={equipmentTypeFilter}
            onChange={(e) =>
              setEquipmentTypeFilter(e.target.value)
            }
          >
            {equipmentTypes.map((type) => (
              <option key={type} value={type}>
                {type === "All"
                  ? "All Equipment Types"
                  : type}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value)
            }
          >
            {reportTypes.map((type) => (
              <option key={type} value={type}>
                {type === "All"
                  ? "All Report Types"
                  : type}
              </option>
            ))}
          </select>
        </div>

        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Report Title</th>
                <th>Substation</th>
                <th>Equipment Type</th>
                <th>Equipment</th>
                <th>Report Type</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.id}</strong>
                    </td>
                    <td>{report.title}</td>
                    <td>{report.location}</td>
                    <td>{report.equipmentType}</td>
                    <td>{report.equipment}</td>
                    <td>{report.type}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => openReport(report)}
                        style={{
                          padding: "8px 14px",
                          backgroundColor: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                        }}
                      >
                        View Graph
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="reports-no-results"
                  >
                    No reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="reports-result-count">
          Showing {filteredReports.length} of{" "}
          {reportData.length} reports
        </p>
      </div>
    </div>
  );
}

export default Reports;
























// import { useMemo, useState } from "react";

// const reportData = [
//   {
//     id: "RPT-001",
//     title: "Transformer Inspection Report",
//     equipment: "TR-1",
//     location: "PDC-1",
//     type: "Inspection",
//     date: "2026-11-10",
//     status: "Completed"
//   },
//   {
//     id: "RPT-002",
//     title: "Transformer Oil Testing Report",
//     equipment: "TR-2",
//     location: "PDC-1",
//     type: "Oil Testing",
//     date: "2026-11-12",
//     status: "Pending"
//   },
//   {
//     id: "RPT-003",
//     title: "Circuit Breaker Condition Report",
//     equipment: "CB-1",
//     location: "PDC-1",
//     type: "Condition Assessment",
//     date: "2026-11-14",
//     status: "Completed"
//   }
// ];

// function Reports() {
//   const [search, setSearch] = useState("");
//   const [typeFilter, setTypeFilter] = useState("All");
//   const [statusFilter, setStatusFilter] = useState("All");

//   const filteredReports = useMemo(() => {
//     return reportData.filter((report) => {
//       const matchesSearch =
//         report.id.toLowerCase().includes(search.toLowerCase()) ||
//         report.title.toLowerCase().includes(search.toLowerCase()) ||
//         report.equipment.toLowerCase().includes(search.toLowerCase());

//       const matchesType =
//         typeFilter === "All" || report.type === typeFilter;

//       const matchesStatus =
//         statusFilter === "All" || report.status === statusFilter;

//       return matchesSearch && matchesType && matchesStatus;
//     });
//   }, [search, typeFilter, statusFilter]);

//   return (
//     <div className="reports-page">
//       <div className="page-heading">
//         <div>
//           <h1>Reports</h1>
//           <p>View and manage equipment inspection and testing reports.</p>
//         </div>
//       </div>

//       <div className="reports-summary">
//         <div className="report-stat-card">
//           <span>Total Reports</span>
//           <h2>{reportData.length}</h2>
//         </div>

//         <div className="report-stat-card">
//           <span>Completed</span>
//           <h2>
//             {reportData.filter((r) => r.status === "Completed").length}
//           </h2>
//         </div>

//         <div className="report-stat-card">
//           <span>Pending</span>
//           <h2>
//             {reportData.filter((r) => r.status === "Pending").length}
//           </h2>
//         </div>
//       </div>

//       <div className="reports-list-section">
//         <h2>Report Register</h2>
//         <p>Search and filter available reports.</p>

//         <div className="reports-filters">
//           <input
//             type="text"
//             placeholder="Search report or equipment..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//           />

//           <select
//             value={typeFilter}
//             onChange={(e) => setTypeFilter(e.target.value)}
//           >
//             <option value="All">All Report Types</option>
//             <option value="Inspection">Inspection</option>
//             <option value="Oil Testing">Oil Testing</option>
//             <option value="Condition Assessment">Condition Assessment</option>
//           </select>

//           <select
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//           >
//             <option value="All">All Statuses</option>
//             <option value="Completed">Completed</option>
//             <option value="Pending">Pending</option>
//           </select>
//         </div>

//         <div className="reports-table-wrapper">
//           <table className="reports-table">
//             <thead>
//               <tr>
//                 <th>Report ID</th>
//                 <th>Report Title</th>
//                 <th>Equipment</th>
//                 <th>Substation</th>
//                 <th>Report Type</th>
//                 <th>Date</th>
//                 <th>Status</th>
//               </tr>
//             </thead>

//             <tbody>
//               {filteredReports.length > 0 ? (
//                 filteredReports.map((report) => (
//                   <tr key={report.id}>
//                     <td><strong>{report.id}</strong></td>
//                     <td>{report.title}</td>
//                     <td>{report.equipment}</td>
//                     <td>{report.location}</td>
//                     <td>{report.type}</td>
//                     <td>{report.date}</td>
//                     <td>
//                       <span
//                         className={`report-status ${
//                           report.status === "Completed"
//                             ? "completed"
//                             : "pending"
//                         }`}
//                       >
//                         {report.status}
//                       </span>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="7" className="reports-no-results">
//                     No reports found.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>

//         <p className="reports-result-count">
//           Showing {filteredReports.length} of {reportData.length} reports
//         </p>
//       </div>
//     </div>
//   );
// }

// export default Reports;




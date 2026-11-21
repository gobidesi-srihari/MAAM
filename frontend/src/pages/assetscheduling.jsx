import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAssetSchedules } from "../services/api";
import "../styles/assetscheduling.css";

function getScheduleStatus(schedule) {
  if (schedule.completed_at) return "Completed";

  const [year, month, day] = schedule.scheduled_date.split("-").map(Number);
  const due = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const daysUntilDue = Math.floor(
    (due - today) / (24 * 60 * 60 * 1000)
  );

  if (daysUntilDue < 0) return "Overdue";
  if (daysUntilDue <= 7) return "Due Soon";
  return "Scheduled";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function AssetScheduling() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [search, setSearch] = useState("");
  const [substationFilter, setSubstationFilter] = useState("");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSchedules() {
      try {
        const data = await getAssetSchedules();
        if (active) setSchedules(data);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSchedules();
    const timer = window.setInterval(loadSchedules, 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const substations = useMemo(() => {
    const options = new Map();
    schedules.forEach((schedule) => {
      options.set(schedule.substation_id, schedule.substation_name);
    });
    return [...options.entries()].sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [schedules]);

  const equipmentTypes = useMemo(
    () =>
      [...new Set(schedules.map((schedule) => schedule.equipment_type))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [schedules]
  );

  const filteredSchedules = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return schedules.filter((schedule) => {
      const searchableValues = [
        schedule.substation_name,
        schedule.substation_id,
        schedule.equipment_type,
        schedule.equipment_name,
        schedule.equipment_id,
        schedule.activity,
        schedule.parameter_key,
        schedule.last_test_date,
        schedule.last_test_date
          ? formatDate(schedule.last_test_date)
          : "No test date",
        schedule.interval_months
          ? `${schedule.interval_months} months`
          : "Not configured",
        schedule.scheduled_date,
        formatDate(schedule.scheduled_date),
        getScheduleStatus(schedule),
        schedule.parameter_key ? "Enter Test" : "View Equipment",
      ];
      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value ?? "").toLocaleLowerCase().includes(query)
        );
      const matchesSubstation =
        !substationFilter ||
        schedule.substation_id === substationFilter;
      const matchesEquipmentType =
        !equipmentTypeFilter ||
        schedule.equipment_type === equipmentTypeFilter;

      return matchesSearch && matchesSubstation && matchesEquipmentType;
    });
  }, [schedules, search, substationFilter, equipmentTypeFilter]);

  const counts = useMemo(
    () =>
      schedules.reduce(
        (result, schedule) => {
          const status = getScheduleStatus(schedule);
          if (status === "Scheduled") result.scheduled += 1;
          if (status === "Due Soon") result.dueSoon += 1;
          if (status === "Overdue") result.overdue += 1;
          if (status === "Completed") result.completed += 1;
          return result;
        },
        { scheduled: 0, dueSoon: 0, overdue: 0, completed: 0 }
      ),
    [schedules]
  );

  const attentionItems = schedules
    .filter((schedule) =>
      ["Due Soon", "Overdue"].includes(getScheduleStatus(schedule))
    )
    .sort((a, b) =>
      a.scheduled_date.localeCompare(b.scheduled_date)
    );

  const openTest = (schedule) => {
    const location = encodeURIComponent(schedule.substation_id);
    const equipment = encodeURIComponent(schedule.equipment_id);
    const section = schedule.parameter_key
      ? `?section=${encodeURIComponent(schedule.parameter_key)}`
      : "";
    const isTransformer = schedule.equipment_type
      ?.toLowerCase()
      .includes("transformer");
    const path = isTransformer
      ? `/substations/${location}/transformer/${equipment}${section}`
      : `/substations/${location}/equipment/${equipment}`;

    navigate(path);
  };

  return (
    <div className="asset-scheduling-page">
      <div className="page-heading">
        <div>
          <h1>Asset Scheduling</h1>
          <p>
            Upcoming transformer tests are calculated from each
            parameter&apos;s latest saved test date and configured interval.
          </p>
        </div>
      </div>

      <div className="scheduling-summary">
        <div className="schedule-stat-card">
          <span>Scheduled</span>
          <h2>{counts.scheduled}</h2>
        </div>
        <div className="schedule-stat-card due-soon">
          <span>Due Within 7 Days</span>
          <h2>{counts.dueSoon}</h2>
        </div>
        <div className="schedule-stat-card overdue">
          <span>Overdue</span>
          <h2>{counts.overdue}</h2>
        </div>
        <div className="schedule-stat-card completed">
          <span>Completed Manual Items</span>
          <h2>{counts.completed}</h2>
        </div>
      </div>

      <section className="scheduling-form-section">
        <h2>How test schedules are calculated</h2>
        <p className="scheduling-help">
          Save a test result from the transformer&apos;s Test Parameters.
          This page uses that parameter&apos;s latest test date plus its
          interval in the single editable test-parameter configuration.
          Weekend and Tamil Nadu public-holiday due dates move to the next
          working day. Parameters without a configured interval do not
          create automatic reminders.
        </p>
        <p className="scheduling-help">
          Upcoming dashboard reminders appear only during the seven days
          before a test is due. Overdue items remain visible here.
        </p>
      </section>

      {attentionItems.length > 0 && (
        <div className="scheduling-alert">
          <strong>Tests requiring attention</strong>
          <ul>
            {attentionItems.map((schedule) => (
              <li key={schedule.id}>
                {getScheduleStatus(schedule)}: {schedule.substation_name} —{" "}
                {schedule.equipment_name} ({schedule.equipment_id}),{" "}
                {schedule.activity}, due {formatDate(schedule.scheduled_date)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="scheduling-list-section">
        <div className="scheduling-list-header">
          <div>
            <h2>Equipment Test Schedule</h2>
            <p className="scheduling-help">
              Search and filter scheduled tests by location, equipment,
              parameter, date, interval, status, or action.
            </p>
          </div>
        </div>

        <div className="scheduling-filters">
          <input
            type="search"
            aria-label="Search all schedule columns"
            placeholder="Search equipment, parameter, date, status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Filter by substation"
            value={substationFilter}
            onChange={(event) => setSubstationFilter(event.target.value)}
          >
            <option value="">All Substations</option>
            {substations.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by equipment type"
            value={equipmentTypeFilter}
            onChange={(event) =>
              setEquipmentTypeFilter(event.target.value)
            }
          >
            <option value="">All Equipment Types</option>
            {equipmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="scheduling-error" role="alert">{error}</p>}

        <div className="scheduling-table-wrapper">
          <table className="scheduling-table">
            <thead>
              <tr>
                <th>Substation</th>
                <th>Equipment Type</th>
                <th>Transformer / Equipment</th>
                <th>Test Parameter</th>
                <th>Latest Test Date</th>
                <th>Interval</th>
                <th>Next Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="scheduling-empty">
                    Loading test schedules...
                  </td>
                </tr>
              ) : filteredSchedules.length ? (
                filteredSchedules.map((schedule) => {
                  const status = getScheduleStatus(schedule);
                  return (
                    <tr key={schedule.id}>
                      <td>{schedule.substation_name}</td>
                      <td>{schedule.equipment_type}</td>
                      <td>
                        {schedule.equipment_name} ({schedule.equipment_id})
                      </td>
                      <td>{schedule.activity}</td>
                      <td>
                        {schedule.last_test_date
                          ? formatDate(schedule.last_test_date)
                          : "-"}
                      </td>
                      <td>
                        {schedule.interval_months
                          ? `${schedule.interval_months} months`
                          : "-"}
                      </td>
                      <td>{formatDate(schedule.scheduled_date)}</td>
                      <td>
                        <span
                          className={`schedule-status ${
                            status.toLowerCase().replace(/\s+/g, "-")
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="schedule-view-equipment-btn"
                          onClick={() => openTest(schedule)}
                        >
                          {schedule.parameter_key ? "Enter Test" : "View Equipment"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="scheduling-empty">
                    {error
                      ? "Schedules could not be loaded."
                      : "No test schedules match this filter. Save a transformer test result to create its next due date."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AssetScheduling;

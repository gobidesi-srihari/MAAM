
import { useState } from "react";
import "../styles/AssetScheduling.css";

function AssetScheduling() {
  const [schedules, setSchedules] = useState([]);

  const [form, setForm] = useState({
    location: "",
    equipmentType: "",
    asset: "",
    activity: "",
    scheduledDate: "",
    description: "",
  });

  const [filter, setFilter] = useState("All");

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "location"
        ? { equipmentType: "", asset: "" }
        : {}),
      ...(name === "equipmentType"
        ? { asset: "" }
        : {}),
    }));
  };

  const getStatus = (schedule) => {
    if (schedule.completed) return "Completed";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(
      `${schedule.scheduledDate}T00:00:00`
    );

    const daysRemaining = Math.ceil(
      (dueDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) return "Overdue";
    if (daysRemaining <= 7) return "Due Soon";

    return "Scheduled";
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const newSchedule = {
      ...form,
      id: Date.now(),
      completed: false,
    };

    setSchedules((previous) => [
      ...previous,
      newSchedule,
    ]);

    setForm({
      location: "",
      equipmentType: "",
      asset: "",
      activity: "",
      scheduledDate: "",
      description: "",
    });
  };

  const markCompleted = (id) => {
    setSchedules((previous) =>
      previous.map((schedule) =>
        schedule.id === id
          ? { ...schedule, completed: true }
          : schedule
      )
    );
  };

  const filteredSchedules = schedules.filter(
    (schedule) =>
      filter === "All" ||
      getStatus(schedule) === filter
  );

  const counts = {
    scheduled: schedules.filter(
      (s) => getStatus(s) === "Scheduled"
    ).length,
    dueSoon: schedules.filter(
      (s) => getStatus(s) === "Due Soon"
    ).length,
    overdue: schedules.filter(
      (s) => getStatus(s) === "Overdue"
    ).length,
    completed: schedules.filter(
      (s) => getStatus(s) === "Completed"
    ).length,
  };

  return (
    <div className="asset-scheduling-page">
      <div className="page-heading">
        <div>
          <h1>Asset Scheduling</h1>
          <p>
            Schedule equipment inspections, testing,
            and maintenance activities.
          </p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="scheduling-summary">
        <div className="schedule-stat-card">
          <span>Scheduled</span>
          <h2>{counts.scheduled}</h2>
        </div>

        <div className="schedule-stat-card due-soon">
          <span>Due Soon</span>
          <h2>{counts.dueSoon}</h2>
        </div>

        <div className="schedule-stat-card overdue">
          <span>Overdue</span>
          <h2>{counts.overdue}</h2>
        </div>

        <div className="schedule-stat-card completed">
          <span>Completed</span>
          <h2>{counts.completed}</h2>
        </div>
      </div>

      {/* CREATE SCHEDULE */}
      <div className="scheduling-form-section">
        <h2>Create Asset Schedule</h2>

        <form onSubmit={handleSubmit}>
          <div className="scheduling-form-grid">
            <label>
              Substation Location
              <input
                name="location"
                value={form.location}
                onChange={updateForm}
                placeholder="e.g. PDC-1"
                required
              />
            </label>

            <label>
              Equipment Type
              <input
                name="equipmentType"
                value={form.equipmentType}
                onChange={updateForm}
                placeholder="e.g. Power Transformer"
                required
              />
            </label>

            <label>
              Asset / Equipment
              <input
                name="asset"
                value={form.asset}
                onChange={updateForm}
                placeholder="e.g. TR-1"
                required
              />
            </label>

            <label>
              Activity Type
              <select
                name="activity"
                value={form.activity}
                onChange={updateForm}
                required
              >
                <option value="">Select Activity</option>
                <option value="Inspection">
                  Inspection
                </option>
                <option value="Oil Testing">
                  Oil Testing
                </option>
                <option value="Preventive Maintenance">
                  Preventive Maintenance
                </option>
                <option value="Condition Assessment">
                  Condition Assessment
                </option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Scheduled Date
              <input
                type="date"
                name="scheduledDate"
                value={form.scheduledDate}
                onChange={updateForm}
                required
              />
            </label>

            <label>
              Description
              <input
                name="description"
                value={form.description}
                onChange={updateForm}
                placeholder="Enter activity details"
              />
            </label>
          </div>

          <button
            type="submit"
            className="schedule-submit-btn"
          >
            Add Schedule
          </button>
        </form>
      </div>

      {/* ALERTS */}
      {(counts.dueSoon > 0 || counts.overdue > 0) && (
        <div className="scheduling-alert">
          <strong>Scheduling Alerts</strong>
          <p>
            {counts.overdue} overdue and{" "}
            {counts.dueSoon} upcoming activities
            require attention.
          </p>
        </div>
      )}

      {/* TO-DO LIST */}
      <div className="scheduling-list-section">
        <div className="scheduling-list-header">
          <h2>Scheduled Activities / To-Do List</h2>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value)
            }
          >
            <option value="All">All Activities</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Due Soon">Due Soon</option>
            <option value="Overdue">Overdue</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="scheduling-table-wrapper">
          <table className="scheduling-table">
            <thead>
              <tr>
                <th>Substation</th>
                <th>Equipment Type</th>
                <th>Asset</th>
                <th>Activity</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map((schedule) => {
                  const status = getStatus(schedule);

                  return (
                    <tr key={schedule.id}>
                      <td>{schedule.location}</td>
                      <td>{schedule.equipmentType}</td>
                      <td>{schedule.asset}</td>
                      <td>{schedule.activity}</td>
                      <td>{schedule.scheduledDate}</td>
                      <td>
                        <span
                          className={`schedule-status ${
                            status
                              .toLowerCase()
                              .replace(/\s+/g, "-")
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        {status !== "Completed" && (
                          <button
                            type="button"
                            onClick={() =>
                              markCompleted(schedule.id)
                            }
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="scheduling-empty"
                  >
                    No scheduled activities found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AssetScheduling;

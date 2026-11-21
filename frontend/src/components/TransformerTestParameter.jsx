import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  createTransformerTestReading,
  getTransformerTestReadings,
} from "../services/api";
import "../styles/transformertests.css";

function todayAsInputValue() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateMonthsAgo(monthsAgo) {
  const date = new Date();
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() - monthsAgo);
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
  date.setDate(Math.min(day, lastDay));

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatChartDate(value) {
  if (!value) return value;
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function getAssessment(parameter, value) {
  for (const rule of parameter.rules || []) {
    if (
      (rule.operator === "lt" && value < rule.value) ||
      (rule.operator === "lte" && value <= rule.value) ||
      (rule.operator === "gt" && value > rule.value) ||
      (rule.operator === "gte" && value >= rule.value) ||
      (
        rule.operator === "between" &&
        value >= rule.min &&
        value <= rule.max
      )
    ) {
      return rule.rating;
    }
  }

  return parameter.otherwise_rating || "Not assessed";
}

function TransformerTestParameter({
  locationId,
  equipmentId,
  parameter,
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testDate, setTestDate] = useState(todayAsInputValue);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReadings() {
      setLoading(true);
      setError("");
      setRecords([]);

      try {
        const data = await getTransformerTestReadings(
          locationId,
          equipmentId,
          parameter.key
        );
        if (active) {
          setRecords(
            [...data].sort((a, b) =>
              a.test_date.localeCompare(b.test_date)
            )
          );
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReadings();
    return () => {
      active = false;
    };
  }, [locationId, equipmentId, parameter.key]);

  const demoOnly = records.length === 0;
  const chartData = useMemo(() => {
    if (records.length) {
      return records.map((record) => ({
        label: record.test_date,
        value: Number(record.value),
      }));
    }

    const sampleMonthOffsets = [12, 8, 5, 2];
    return (parameter.demo_values || []).map((demoValue, index) => ({
      label: dateMonthsAgo(sampleMonthOffsets[index]),
      value: demoValue,
    }));
  }, [records, parameter.demo_values]);

  const latestRecord = records[records.length - 1];
  const assessment = latestRecord
    ? getAssessment(parameter, Number(latestRecord.value))
    : null;

  const chartDomain = useMemo(() => {
    const values = [
      ...chartData.map((item) => item.value),
      ...(parameter.bands || []).flatMap((band) => [
        band.min,
        band.max,
      ]),
    ].filter(Number.isFinite);

    if (!values.length) return ["auto", "auto"];

    const min = Math.min(0, ...values);
    const max = Math.max(...values);
    const padding = max === min ? 1 : (max - min) * 0.08;
    return [min, max + padding];
  }, [chartData, parameter.bands]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;

    const numericValue = Number(value);
    if (!testDate || !Number.isFinite(numericValue) || numericValue < 0) {
      setError("Enter a valid test date and non-negative numeric result.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const saved = await createTransformerTestReading(
        locationId,
        equipmentId,
        parameter.key,
        {
          test_date: testDate,
          value: numericValue,
          notes: notes.trim() || null,
        }
      );
      setRecords((previous) =>
        [...previous, saved].sort((a, b) =>
          a.test_date.localeCompare(b.test_date)
        )
      );
      setValue("");
      setNotes("");
      setSuccess("Test result saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="transformer-test-parameter">
      <div className="transformer-test-context">
        <div>
          <strong>Location</strong>
          <span>{locationId}</span>
        </div>
        <div>
          <strong>Transformer</strong>
          <span>{equipmentId}</span>
        </div>
        <div>
          <strong>Retest interval</strong>
          <span>
            {parameter.interval_months
              ? `Every ${parameter.interval_months} months`
              : "Not configured"}
          </span>
        </div>
        {latestRecord && (
          <div>
            <strong>Latest assessment</strong>
            <span>{assessment}</span>
          </div>
        )}
      </div>

      <div className="transformer-test-reference">
        <strong>Reference and interval guidance</strong>
        <p>{parameter.reference}</p>
        <small>
          {parameter.interval_months
            ? `The next reminder is calculated from the latest saved test date plus ${parameter.interval_months} months.`
            : "No automatic retest interval is configured for this parameter."}
        </small>
      </div>

      <h3>{parameter.name} Trend</h3>
      {demoOnly && chartData.length > 0 && (
        <p className="transformer-test-demo-notice" role="note">
          Illustrative demo values only — these are not measurements,
          are not saved, and must not be used for equipment decisions.
        </p>
      )}
      {loading ? (
        <p>Loading test results...</p>
      ) : chartData.length === 0 ? (
        <p>No test results have been recorded for this parameter.</p>
      ) : (
        <div className="transformer-test-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickFormatter={formatChartDate}
                angle={-25}
                textAnchor="end"
                height={55}
              />
              <YAxis
                domain={chartDomain}
                label={{
                  value: `${parameter.name} (${parameter.unit})`,
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                labelFormatter={formatChartDate}
                formatter={(itemValue) => [
                  `${itemValue} ${parameter.unit}`,
                  parameter.name,
                ]}
              />
              <Legend />
              {(parameter.bands || []).map((band) => (
                <ReferenceArea
                  key={band.label}
                  y1={band.min}
                  y2={band.max}
                  fill={band.color}
                  fillOpacity={0.55}
                  ifOverflow="hidden"
                  label={{
                    value: band.label,
                    position: "insideTopRight",
                    fill: "#475569",
                    fontSize: 11,
                  }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="value"
                name={`${parameter.name} (${parameter.unit})`}
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h3>Recorded Test Results</h3>
      <div className="transformer-test-table-wrap">
        <table className="transformer-test-table">
          <thead>
            <tr>
              <th>Test Date</th>
              <th>Result ({parameter.unit})</th>
              <th>Assessment</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {[...records].reverse().map((record) => (
              <tr key={record.id}>
                <td>{record.test_date}</td>
                <td>{record.value}</td>
                <td>{getAssessment(parameter, Number(record.value))}</td>
                <td>{record.notes || "-"}</td>
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td colSpan="4">No saved test results yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3>Enter {parameter.name} Result</h3>
      <form className="transformer-test-entry" onSubmit={handleSave}>
        <label>
          Test date
          <input
            type="date"
            value={testDate}
            onChange={(event) => setTestDate(event.target.value)}
            required
          />
        </label>
        <label>
          Result ({parameter.unit})
          <input
            type="number"
            min={parameter.key === "bdv" ? "0.01" : "0"}
            step="any"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter measured result"
            required
          />
        </label>
        <label>
          Notes
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            placeholder="Optional test notes"
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Test Result"}
        </button>
      </form>

      {error && <p className="transformer-test-error" role="alert">{error}</p>}
      {success && <p className="transformer-test-success" role="status">{success}</p>}
    </section>
  );
}

export default TransformerTestParameter;

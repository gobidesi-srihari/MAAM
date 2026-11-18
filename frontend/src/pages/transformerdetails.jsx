
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  getTransformerNameplate,
  getTransformerNameplateImage,
  uploadTransformerNameplate,
  getTransformerBDV,
  createTransformerBDV,
} from "../services/api";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import "../styles/TransformerDetails.css";

// ==========================================
// TRANSFORMER PARAMETER TREE
// ==========================================

const transformerTree = [
  {
    id: "nameplate",
    label: "Nameplate Details",
    type: "image",
  },
  {
    id: "test-parameters",
    label: "Test Parameters",
    children: [
      {
        id: "oil",
        label: "Oil Parameters",
        children: [
          {
            id: "basic",
            label: "Basic",
            children: [
              { id: "bdv", label: "Breakdown Voltage" },
              { id: "water", label: "Water Content" },
              { id: "aci", label: "Acididty" },
              {
                id: "ddf",
                label: "Dielectric dissipation Factor",
              },
              { id: "res", label: "Resistivity" },
              { id: "s&s", label: "Sediment & Sludge" },
              { id: "ift", label: "Inter Facial Tension" },
              { id: "fp", label: "Flash Point" },
            ],
          },
          {
            id: "dga",
            label: "DGA",
            children: [
              { id: "hydrogen", label: "Hydrogen" },
              { id: "oxygen", label: "Oxygen" },
              { id: "nitrogen", label: "Nitrogen" },
              { id: "methane", label: "Methane" },
              { id: "ethylene", label: "Ethylene" },
              { id: "ethane", label: "Ethane" },
              { id: "acetylene", label: "Acetylene" },
              { id: "propylenet", label: "Propylenet propane" },
              { id: "carbondioxide", label: "Carbondioxide" },
            ],
          },
          {
            id: "furan",
            label: "Furan Analysis",
          },
        ],
      },
      {
        id: "winding",
        label: "Winding Parameters",
        children: [
          { id: "hv-lv", label: "HV-LV" },
          { id: "hv-e", label: "HV-E" },
          { id: "lv-e", label: "LV-E" },
        ],
      },
      {
        id: "load-temp",
        label: "Load vs Temp",
        children: [
          { id: "voltage", label: "Voltage" },
          { id: "current", label: "Current" },
        ],
      },
    ],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTestDate(value) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}-${month}-${year}`;
}

// ==========================================
// TREE NODE COMPONENT
// ==========================================

function TreeNode({
  node,
  level = 0,
  selectedId,
  expanded,
  onSelect,
  onToggle,
}) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expanded.includes(node.id);

  return (
    <div className="transformer-tree-node">
      <button
        type="button"
        className={`transformer-tree-item ${
          selectedId === node.id ? "selected" : ""
        }`}
        style={{
          paddingLeft: `${16 + level * 22}px`,
        }}
        onClick={() => {
          onSelect(node);

          if (hasChildren) {
            onToggle(node.id);
          }
        }}
        aria-expanded={
          hasChildren ? isExpanded : undefined
        }
      >
        <span className="transformer-tree-icon">
          {hasChildren
            ? isExpanded
              ? "▼"
              : "▶"
            : node.type === "image"
            ? "▣"
            : "•"}
        </span>

        <span>{node.label}</span>
      </button>

      {hasChildren && isExpanded && (
        <div className="transformer-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// BDV GRAPH AND DATA ENTRY COMPONENT
// ==========================================

function BreakdownVoltage({ locationId, equipmentId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [testDate, setTestDate] = useState(getTodayDate());
  const [bdvValue, setBdvValue] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBDV = async () => {
    const data = await getTransformerBDV(
      locationId,
      equipmentId
    );

    const sortedRecords = [...data].sort((a, b) =>
      a.test_date.localeCompare(b.test_date)
    );

    setRecords(sortedRecords);
  };

  // Load records when transformer changes
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setRecords([]);

      try {
        const data = await getTransformerBDV(
          locationId,
          equipmentId
        );

        if (active) {
          setRecords(
            [...data].sort((a, b) =>
              a.test_date.localeCompare(b.test_date)
            )
          );
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

    load();

    return () => {
      active = false;
    };
  }, [locationId, equipmentId]);

  // Convert PostgreSQL decimal values to numbers
  const graphData = records.map((record) => ({
    date: record.test_date,
    bdv: Number(record.bdv_kv),
  }));

  const latestRecord =
    records.length > 0
      ? records[records.length - 1]
      : null;

  // ==========================================
  // SAVE NEW BDV RECORD
  // ==========================================

  const handleSaveBDV = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    const value = Number(bdvValue);

    if (!testDate || !Number.isFinite(value) || value <= 0) {
      setError("Enter a valid date and positive BDV value.");
      return;
    }

    if (value > 999999.99) {
      setError("BDV value is too large.");
      return;
    }

    if (
      records.some(
        (record) => record.test_date === testDate
      )
    ) {
      setError(
        "A BDV reading already exists for this test date."
      );
      return;
    }

    setSaving(true);

    try {
      await createTransformerBDV(
        locationId,
        equipmentId,
        {
          test_date: testDate,
          bdv_kv: value,
        }
      );

      setBdvValue("");
      setSuccess("BDV reading saved successfully.");

      await loadBDV();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="transformer-bdv-section">

      {/* SUMMARY */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            minWidth: "150px",
          }}
        >
          <strong>Latest BDV</strong>
          <h3>
            {latestRecord
              ? `${latestRecord.bdv_kv} kV`
              : "-"}
          </h3>
        </div>

        <div
          style={{
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            minWidth: "150px",
          }}
        >
          <strong>Total Tests</strong>
          <h3>{records.length}</h3>
        </div>

        <div
          style={{
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            minWidth: "150px",
          }}
        >
          <strong>Latest Test Date</strong>
          <h3>
            {latestRecord
              ? formatTestDate(latestRecord.test_date)
              : "-"}
          </h3>
        </div>
      </div>

      {/* GRAPH */}
      <h3>Breakdown Voltage Trend</h3>

      {loading ? (
        <p>Loading BDV records...</p>
      ) : records.length === 0 ? (
        <p>No BDV test records available.</p>
      ) : (
        <div
          style={{
            width: "100%",
            height: "350px",
            marginBottom: "30px",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={graphData}
              margin={{
                top: 20,
                right: 25,
                left: 10,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="date"
                tickFormatter={formatTestDate}
                angle={-25}
                textAnchor="end"
                height={65}
              />

              <YAxis
                label={{
                  value: "BDV (kV)",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[0, "auto"]}
              />

              <Tooltip
                labelFormatter={formatTestDate}
                formatter={(value) => [
                  `${value} kV`,
                  "Breakdown Voltage",
                ]}
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="bdv"
                name="Breakdown Voltage"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HISTORICAL RECORDS */}
      <h3>Historical BDV Records</h3>

      <div
        style={{
          overflowX: "auto",
          marginBottom: "30px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Test Date
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Breakdown Voltage (kV)
              </th>
            </tr>
          </thead>

          <tbody>
            {[...records].reverse().map((record) => (
              <tr key={record.id}>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "10px",
                  }}
                >
                  {formatTestDate(record.test_date)}
                </td>

                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "10px",
                  }}
                >
                  {Number(record.bdv_kv).toFixed(2)}
                </td>
              </tr>
            ))}

            {records.length === 0 && (
              <tr>
                <td colSpan="2" style={{ padding: "12px" }}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD NEW READING */}
      <h3>Add Breakdown Voltage Reading</h3>

      <form
        onSubmit={handleSaveBDV}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          maxWidth: "400px",
          marginBottom: "20px",
        }}
      >
        <label>
          Test Date
          <input
            type="date"
            value={testDate}
            onChange={(event) =>
              setTestDate(event.target.value)
            }
            required
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              marginTop: "5px",
            }}
          />
        </label>

        <label>
          Breakdown Voltage (kV)
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="999999.99"
            value={bdvValue}
            onChange={(event) =>
              setBdvValue(event.target.value)
            }
            placeholder="Enter BDV value"
            required
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              marginTop: "5px",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "12px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save BDV Reading"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {success && (
        <p role="status" style={{ color: "#15803d" }}>
          {success}
        </p>
      )}
    </div>
  );
}

// ==========================================
// MAIN TRANSFORMER DETAILS PAGE
// ==========================================

function TransformerDetails() {
  const { locationId, equipmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Select the requested report section when arriving from Reports.
  const getRequestedNode = () => {
    const section = new URLSearchParams(location.search).get("section");
    if (section === "bdv") {
      return transformerTree[1].children[0].children[0].children.find(
        (node) => node.id === "bdv"
      );
    }
    return transformerTree[0];
  };

  const [selectedNode, setSelectedNode] = useState(getRequestedNode);

  const [expanded, setExpanded] = useState([
    "test-parameters",
    "oil",
    "basic",
    "dga",
    "winding",
    "load-temp",
  ]);

  // React Router may reuse this component when the URL changes.
  // Keep the selected section synchronized with the report link.
  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (section === "bdv") {
      setSelectedNode(
        transformerTree[1].children[0].children[0].children.find(
          (node) => node.id === "bdv"
        )
      );
      setExpanded((previous) => [
        ...new Set([...previous, "test-parameters", "oil", "basic"]),
      ]);
    }
  }, [location.search, locationId, equipmentId]);

  // ==========================================
  // NAMEPLATE STATE
  // ==========================================

  const [nameplateImage, setNameplateImage] =
    useState(null);

  const [nameplateInfo, setNameplateInfo] =
    useState(null);

  const [loadingImage, setLoadingImage] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const imageUrlRef = useRef(null);
  const uploadInputRef = useRef(null);
  const [isImageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);

  useEffect(() => {
    if (!isImageViewerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setImageViewerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageViewerOpen]);

  // ==========================================
  // LOAD NAMEPLATE FROM FASTAPI
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadNameplate() {
      setLoadingImage(true);
      setError("");
      setNameplateImage(null);
      setNameplateInfo(null);

      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }

      let metadataFound = false;

      try {
        const metadata = await getTransformerNameplate(
          locationId,
          equipmentId
        );
        metadataFound = true;

        if (active) {
          setNameplateInfo(metadata);
        }

        const imageUrl =
          await getTransformerNameplateImage(
            locationId,
            equipmentId
          );

        if (active) {
          imageUrlRef.current = imageUrl;
          setNameplateImage(imageUrl);
        } else {
          URL.revokeObjectURL(imageUrl);
        }
      } catch (err) {
        const notFound =
          err.message.includes("404") ||
          err.message.toLowerCase().includes("not found");

        if (active && (metadataFound || !notFound)) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoadingImage(false);
        }
      }
    }

    loadNameplate();

    return () => {
      active = false;

      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, [locationId, equipmentId]);

  // ==========================================
  // EXPAND / COLLAPSE TREE
  // ==========================================

  const toggleNode = (id) => {
    setExpanded((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  // ==========================================
  // UPLOAD OR REPLACE NAMEPLATE
  // ==========================================

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file || uploading) return;

    setError("");
    setSuccess("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      await uploadTransformerNameplate(
        locationId,
        equipmentId,
        file
      );

      const metadata = await getTransformerNameplate(
        locationId,
        equipmentId
      );

      const imageUrl =
        await getTransformerNameplateImage(
          locationId,
          equipmentId
        );

      const oldUrl = imageUrlRef.current;

      imageUrlRef.current = imageUrl;
      setNameplateImage(imageUrl);
      setNameplateInfo(metadata);

      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }

      setSuccess("Nameplate image saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  // ==========================================
  // RENDER PAGE
  // ==========================================

  return (
    <div className="transformer-details-page">

      {/* PAGE HEADER */}
      <div className="transformer-details-header">
        <div>
          <h1>Power Transformer Details</h1>
          <p>
            Substation: {locationId} |
            {" "}Equipment: {equipmentId}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <div className="transformer-details-layout">

        {/* LEFT PANEL */}
        <aside className="transformer-tree-panel">
          <h2>Transformer Parameters</h2>

          {transformerTree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              selectedId={selectedNode.id}
              expanded={expanded}
              onSelect={setSelectedNode}
              onToggle={toggleNode}
            />
          ))}
        </aside>

        {/* RIGHT PANEL */}
        <main className="transformer-content-panel">
          <h2>{selectedNode.label}</h2>

          {selectedNode.id === "nameplate" ? (
            <div className="transformer-nameplate">

              {loadingImage ? (
                <p>Loading nameplate image...</p>
              ) : nameplateImage ? (
                <button
                  type="button"
                  className="transformer-nameplate-preview"
                  onClick={() => {
                    setImageZoom(1);
                    setImageViewerOpen(true);
                  }}
                  aria-label="Open nameplate image"
                >
                  <img
                    src={nameplateImage}
                    alt={`${equipmentId} transformer nameplate. Click to enlarge.`}
                  />
                </button>
              ) : (
                <p>No nameplate image uploaded.</p>
              )}

              {nameplateInfo && (
                <p>
                  File: {nameplateInfo.original_filename}
                </p>
              )}

              <button
                type="button"
                className="transformer-upload-button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? "Uploading..."
                  : nameplateImage
                  ? "Replace Nameplate Image"
                  : "Upload Nameplate Image"}
              </button>
              <input
                ref={uploadInputRef}
                className="transformer-upload-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={uploading}
                aria-label="Select a replacement nameplate image"
              />

              <p className="transformer-hint">
                Supported formats: JPG, PNG, WebP.
                Maximum file size: 5 MB.
              </p>

              {error && (
                <p
                  role="alert"
                  style={{ color: "#dc2626" }}
                >
                  {error}
                </p>
              )}

              {success && (
                <p
                  role="status"
                  style={{ color: "#15803d" }}
                >
                  {success}
                </p>
              )}
            </div>

          ) : selectedNode.id === "bdv" ? (

            <BreakdownVoltage
              locationId={locationId}
              equipmentId={equipmentId}
            />

          ) : selectedNode.children?.length ? (

            <div className="transformer-parameter-grid">
              {selectedNode.children.map((child) => (
                <button
                  type="button"
                  key={child.id}
                  className="transformer-parameter-card"
                  onClick={() => {
                    setSelectedNode(child);

                    if (child.children?.length) {
                      setExpanded((previous) =>
                        previous.includes(child.id)
                          ? previous
                          : [...previous, child.id]
                      );
                    }
                  }}
                >
                  <strong>{child.label}</strong>
                  <span>View Parameters →</span>
                </button>
              ))}
            </div>

          ) : (

            <div className="transformer-parameter-placeholder">
              <h3>{selectedNode.label}</h3>

              <p>
                Measurement records, test results,
                and graphs will be displayed here
                after database integration.
              </p>
            </div>
          )}
        </main>
      </div>

      {isImageViewerOpen && nameplateImage && (
        <div
          className="transformer-image-viewer-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setImageViewerOpen(false);
            }
          }}
        >
          <section
            className="transformer-image-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Nameplate image viewer"
          >
            <header className="transformer-image-viewer-toolbar">
              <strong>{nameplateInfo?.original_filename || "Nameplate image"}</strong>
              <div className="transformer-image-viewer-actions">
                <button
                  type="button"
                  onClick={() =>
                    setImageZoom((zoom) =>
                      Math.max(0.5, Number((zoom - 0.25).toFixed(2)))
                    )
                  }
                  disabled={imageZoom <= 0.5}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span aria-live="polite">{Math.round(imageZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() =>
                    setImageZoom((zoom) =>
                      Math.min(3, Number((zoom + 0.25).toFixed(2)))
                    )
                  }
                  disabled={imageZoom >= 3}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <a
                  href={nameplateImage}
                  download={nameplateInfo?.original_filename || `${equipmentId}-nameplate`}
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setImageViewerOpen(false)}
                  aria-label="Close image viewer"
                >
                  Close
                </button>
              </div>
            </header>
            <div className="transformer-image-viewer-stage">
              <img
                src={nameplateImage}
                alt={`${equipmentId} transformer nameplate`}
                style={{ width: `${imageZoom * 100}%` }}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default TransformerDetails;

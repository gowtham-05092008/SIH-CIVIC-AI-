import React, { useEffect, useState } from "react";

const API = "https://sih-civic-ai-backend.onrender.com/api";

export default function AuthorityDashboard({ user, onLogout }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  async function loadReports() {
    try {
      const response = await fetch(`${API}/reports`);

      if (!response.ok) {
        throw new Error("Unable to load reports");
      }

      const data = await response.json();

      setReports(
        Array.isArray(data)
          ? data
          : data.reports || []
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function updateStatus(reportId, status, note = "") {
  try {
    setActionLoading(true);

    const actorId = user?.id || 1;

    const url =
      `${API}/reports/${reportId}/status` +
      `?status=${encodeURIComponent(status)}` +
      `&actor_id=${actorId}` +
      `&note=${encodeURIComponent(note)}`;

    const response = await fetch(url, {
      method: "PUT"
    });

    if (!response.ok) {
      throw new Error("Failed to update status");
    }

    await loadReports();

    setSelectedReport(null);

    alert(`Report updated to ${status}`);

  } catch (error) {
    alert(error.message);
  } finally {
    setActionLoading(false);
  }
}

  async function addResolutionNote(reportId) {
    const note = window.prompt(
      "Enter resolution note:"
    );

    if (!note) return;

    try {
      setActionLoading(true);

      const actorId = user?.id || 1;

      const url =
        `${API}/reports/${reportId}/resolution` +
        `?note=${encodeURIComponent(note)}` +
        `&actor_id=${actorId}`;

      const response = await fetch(url, {
        method: "PUT"
      });

      if (!response.ok) {
        throw new Error(
          "Failed to save resolution note"
        );
      }

      await loadReports();

      alert("Resolution note saved successfully");

    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  function priorityClass(priority) {
    if (!priority) return "normal";

    return priority.toLowerCase();
  }

  return (
    <div className="authority-dashboard">
      <header className="authority-header">
        <div>
          <h1>🏢 CivicConnect AI</h1>
          <p>Authority Operations Dashboard</p>
        </div>
        <div>
          <span>
            👤 {user?.name || "Authority Staff"}
          </span>
          <button onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      <main>
        <div className="dashboard-title">
          <div>
            <h2>Issue Management</h2>
            <p>
              Monitor, assign and resolve civic complaints.
            </p>
          </div>
          <button onClick={loadReports}>
            🔄 Refresh
          </button>
        </div>
        {/* Statistics */}
        <div className="statistics">
          <div className="stat-card">
            <h3>{reports.length}</h3>
            <p>Total Reports</p>
          </div>
          <div className="stat-card">
            <h3>
              {
                reports.filter(
                  r =>
                    String(r.status || "")
                      .toLowerCase() === "received"
                ).length
              }
            </h3>
            <p>New</p>
          </div>
          <div className="stat-card">
            <h3>
              {
                reports.filter(
                  r =>
                    String(r.status || "")
                      .toLowerCase() === "in progress"
                ).length
              }
            </h3>
            <p>In Progress</p>
          </div>
          <div className="stat-card">
            <h3>
              {
                reports.filter(
                  r =>
                    String(r.status || "")
                      .toLowerCase() === "resolved"
                ).length
              }
            </h3>
            <p>Resolved</p>
          </div>
        </div>
        {/* Report Queue */}
        <section className="report-section">
          <h2>📋 Report Queue</h2>
          {loading ? (
            <p>Loading reports...</p>
          ) : reports.length === 0 ? (
            <p>No civic reports available.</p>
          ) : (
            <div className="report-table">
              <div className="table-header">
                <span>ID</span>
                <span>Issue</span>
                <span>Category</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {reports.map(report => (
                <div
                  className="table-row"
                  key={report.id}
                >
                  <span>
                    #{report.id}
                  </span>
                  <span>
                    {report.title ||
                      report.description ||
                      "Civic Issue"}
                  </span>
                  <span>
                    {report.category || "Uncategorized"}
                  </span>
                  <span>
                    <b
                      className={`priority ${priorityClass(
                        report.priority
                      )}`}
                    >
                      {report.priority || "Normal"}
                    </b>
                  </span>
                  <span>
                    {report.status || "Received"}
                  </span>
                  <span>
                    <button
                      onClick={() =>
                        setSelectedReport(report)
                      }
                    >
                      View
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        {/* Selected Report */}
        {selectedReport && (
          <div className="report-details">
            <div className="details-header">
              <h2>
                Report #{selectedReport.id}
              </h2>
              <button
                onClick={() =>
                  setSelectedReport(null)
                }
              >
                ✕
              </button>
            </div>
            <div className="details-content">
              <p>
                <strong>Description:</strong>
              </p>
              <p>
                {selectedReport.description ||
                  "No description provided."}
              </p>
              <p>
                <strong>Category:</strong>{" "}
                {selectedReport.category ||
                  "Unknown"}
              </p>
              <p>
                <strong>Priority:</strong>{" "}
                {selectedReport.priority ||
                  "Normal"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {selectedReport.status ||
                  "Received"}
              </p>
              <p>
                <strong>Location:</strong>{" "}
                {selectedReport.latitude &&
                selectedReport.longitude
                  ? `${selectedReport.latitude}, ${selectedReport.longitude}`
                  : "Location unavailable"}
              </p>
              <hr />
              <div className="authority-actions">
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    const officerId = window.prompt(
                      "Enter Field Officer ID:"
                    );
                    if (!officerId) return;
                    fetch(
                      `${API}/reports/${selectedReport.id}/assign` +
                      `?officer_id=${officerId}` +
                      `&actor_id=${user?.id || 1}`,
                      {
                        method: "PUT"
                      }
                    )
                      .then(response => {
                        if (!response.ok) {
                          throw new Error(
                            "Failed to assign officer"
                          );
                        }
                        return response.json();
                      })
                      .then(() => {
                        alert(
                          "Field Officer assigned successfully"
                        );
                        loadReports();
                        setSelectedReport(null);
                      })
                      .catch(error => {
                        alert(error.message);
                      });
                  }}
                >
                  👷 Assign Officer
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() =>
                    updateStatus(
                      selectedReport.id,
                      "In Progress",
                      "Field officer started working on the issue."
                    )
                  }
                >
                  🔄 Start Work
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() =>
                    updateStatus(
                      selectedReport.id,
                      "Resolved",
                      "Civic issue resolved by field officer."
                    )
                  }
                >
                  ✅ Mark Resolved
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() =>
                    addResolutionNote(
                      selectedReport.id
                    )
                  }
                >
                  📝 Resolution Note
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
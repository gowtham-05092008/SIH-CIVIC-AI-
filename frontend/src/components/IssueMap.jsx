import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = "https://sih-civic-ai-backend.onrender.com";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

function RecenterMap({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView(location, 14);
    }
  }, [location, map]);

  return null;
}

export default function IssueMap() {
  const [location, setLocation] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get citizen's location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);
      },
      () => {
        // Hyderabad fallback for development
        setLocation([17.3850, 78.4867]);
      }
    );
  }, []);

  // Load reports
  useEffect(() => {
    async function getIssues() {
      try {
        const response = await fetch(
          `${API_URL}/api/reports`
        );

        if (!response.ok) {
          throw new Error("Could not load reports");
        }

        const data = await response.json();

        setIssues(
          Array.isArray(data)
            ? data
            : data.reports || []
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    getIssues();
  }, []);

  return (
    <div className="issue-map-container">

      <h2>🗺️ Nearby Civic Issues</h2>

      {loading && (
        <p>Loading civic issues...</p>
      )}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {location && (
        <MapContainer
          center={location}
          zoom={14}
          style={{
            height: "500px",
            width: "100%",
            borderRadius: "15px"
          }}
        >

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap location={location} />

          {/* Citizen location */}

          <Marker position={location}>
            <Popup>
              <strong>📍 Your Location</strong>
            </Popup>
          </Marker>

          {/* Civic issues */}

          {issues.map((issue) => {

            const latitude =
              issue.latitude ?? issue.lat;

            const longitude =
              issue.longitude ??
              issue.lng ??
              issue.lon;

            if (
              latitude == null ||
              longitude == null
            ) {
              return null;
            }

            return (
              <Marker
                key={issue.id}
                position={[
                  latitude,
                  longitude
                ]}
              >

                <Popup>

                  <strong>
                    {issue.title ||
                      `Report #${issue.id}`}
                  </strong>

                  <br />

                  Category:{" "}
                  {issue.category ||
                    "Unknown"}

                  <br />

                  Priority:{" "}
                  {issue.priority ||
                    "Normal"}

                  <br />

                  Status:{" "}
                  {issue.status ||
                    "Received"}

                  {issue.description && (
                    <>
                      <br />
                      <br />
                      {issue.description}
                    </>
                  )}

                </Popup>

              </Marker>
            );
          })}

        </MapContainer>
      )}

    </div>
  );
}
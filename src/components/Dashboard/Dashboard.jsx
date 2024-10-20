import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout, listGeoData, createGeoData } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import Map from "./Map";

function Dashboard() {
  const [geoData, setGeoData] = useState([]);
  const { logout } = useAuth(); // Use the logout function from AuthContext
  const navigate = useNavigate();

  useEffect(() => {
    fetchGeoData();
  }, []);

  const fetchGeoData = async () => {
    try {
      const data = await listGeoData();
      setGeoData(data);
    } catch (error) {
      console.error("Failed to fetch geo data:", error);
      if (error.response && error.response.status === 401) {
        // If unauthorized, logout and redirect to login page
        handleLogout();
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        try {
          const parsedData = JSON.parse(content);
          if (parsedData.type === "FeatureCollection") {
            for (const feature of parsedData.features) {
              try {
                await createGeoData(feature);
              } catch (error) {
                console.error("Error creating geo data:", error);
              }
            }
          } else if (parsedData.type === "Feature") {
            try {
              await createGeoData(parsedData);
            } catch (error) {
              console.error("Error creating geo data:", error);
            }
          } else {
            console.error("Invalid GeoJSON format");
            return;
          }
          await fetchGeoData();
        } catch (error) {
          console.error("Failed to upload geo data:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-indigo-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Geospatial Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </header>
      <div className="flex-grow flex">
        <main className="w-screen">
          <input
            type="file"
            accept=".geojson,.kml"
            onChange={handleFileUpload}
            className="my-4 mx-auto flex items-center border border-gray-300 rounded p-2"
          />
          <Map geoData={geoData} />
        </main>
      </div>
    </div>
  );
}

export default Dashboard;

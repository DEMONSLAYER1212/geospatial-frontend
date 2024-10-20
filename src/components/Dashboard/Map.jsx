import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, GeoJSON } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import {
  createGeoData,
  updateGeoData,
  deleteGeoData,
} from "../../services/api";

const Map = ({ geoData }) => {
  const [map, setMap] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localGeoData, setLocalGeoData] = useState([]);
  const featureGroupRef = useRef(null);

  useEffect(() => {
    if (map) {
      loadLocalGeoData();
    }
  }, [map]);

  useEffect(() => {
    if (geoData.length > 0) {
      setLocalGeoData(geoData);
      saveToLocalStorage(geoData);
    }
  }, [geoData]);

  const loadLocalGeoData = () => {
    const storedData = localStorage.getItem("geoData");
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      setLocalGeoData(parsedData);
      renderGeoData(parsedData);
    }
  };

  const saveToLocalStorage = (data) => {
    localStorage.setItem("geoData", JSON.stringify(data));
  };

  const renderGeoData = (data) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();

      data.forEach((item) => {
        if (item.data) {
          try {
            const geoJSONLayer = L.geoJSON(item.data);
            geoJSONLayer.eachLayer((layer) => {
              layer.feature.properties.id = item.id;
              featureGroupRef.current.addLayer(layer);
            });
          } catch (error) {
            console.error(`Error parsing GeoJSON for item ${item.id}:`, error);
          }
        }
      });

      const bounds = featureGroupRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    }
  };

  const handleCreated = async (e) => {
    const layer = e.layer;
    const geoJSON = layer.toGeoJSON();

    setIsLoading(true);
    try {
      const result = await createGeoData(geoJSON);
      if (!result || !result.geo_data) {
        throw new Error("Invalid server response");
      }

      const id = result.geo_data.ID;
      layer.feature = geoJSON;
      layer.feature.properties.id = id;
      featureGroupRef.current.addLayer(layer);

      const newGeoData = [...localGeoData, { id, data: geoJSON }];
      setLocalGeoData(newGeoData);
      saveToLocalStorage(newGeoData);
    } catch (error) {
      console.error("Error saving geodata:", error);
      featureGroupRef.current.removeLayer(layer);
      alert(`Failed to save shape: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdited = async (e) => {
    const layers = e.layers;
    const updatePromises = [];

    layers.eachLayer((layer) => {
      if (layer.feature?.properties?.id) {
        const id = layer.feature.properties.id;
        const geoJSON = layer.toGeoJSON();

        const updatePromise = updateGeoData(id, geoJSON).catch((error) => {
          // console.error("Error updating geodata:", error);
          // throw new Error(`Failed to update shape ${id}: ${error.message}`);
        });

        updatePromises.push(updatePromise);
      }
    });

    try {
      await Promise.all(updatePromises);
      const updatedGeoData = localGeoData.map((item) => {
        const updatedLayer = layers
          .getLayers()
          .find((layer) => layer.feature.properties.id === item.id);
        return updatedLayer
          ? { ...item, data: updatedLayer.toGeoJSON() }
          : item;
      });
      setLocalGeoData(updatedGeoData);
      saveToLocalStorage(updatedGeoData);
    } catch (error) {
      console.error("Error during batch update:", error);
      alert(error.message);
    }
  };

  const handleDeleted = async (e) => {
    const layers = e.layers;
    const deletePromises = [];

    layers.eachLayer((layer) => {
      if (layer.feature?.properties?.id) {
        const id = layer.feature.properties.id;

        const deletePromise = deleteGeoData(id).catch((error) => {
          console.error("Error deleting geodata:", error);
          throw new Error(`Failed to delete shape ${id}: ${error.message}`);
        });

        deletePromises.push(deletePromise);
      }
    });

    try {
      await Promise.all(deletePromises);
      const updatedGeoData = localGeoData.filter(
        (item) =>
          !layers
            .getLayers()
            .some((layer) => layer.feature.properties.id === item.id)
      );
      setLocalGeoData(updatedGeoData);
      saveToLocalStorage(updatedGeoData);
    } catch (error) {
      console.error("Error during batch delete:", error);
      alert(error.message);
    }
  };

  return (
    <div className="relative w-full">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: "600px", width: "100%" }}
        whenCreated={setMap}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            draw={{
              rectangle: true,
              polygon: true,
              circle: false,
              circlemarker: false,
              marker: true,
              polyline: true,
            }}
          />
        </FeatureGroup>
      </MapContainer>
      {isLoading && (
        <div className="absolute top-2 right-2 bg-white px-3 py-2 rounded shadow">
          Saving...
        </div>
      )}
    </div>
  );
};

export default Map;

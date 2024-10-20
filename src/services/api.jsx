import axios from "axios";

const API_URL = "http://localhost:8087/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
export const register = async (email, password) => {
  const response = await api.post("/register", { email, password });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post("/login", { email, password });
  if (response.data.token) {
    localStorage.setItem("auth_token", response.data.token);
  }
  return response.data;
};

export const logout = async () => {
  localStorage.removeItem("auth_token");
  const response = await api.post("/logout");
  return response.data;
};

export const listGeoData = async () => {
  const response = await api.get("/geodata");
  return response.data;
};

export const createGeoData = async (geoJSONData) => {
  const data = {
    data: {
      type: "Feature",
      geometry: {
        type: geoJSONData.geometry.type,
        coordinates: geoJSONData.geometry.coordinates,
      },
      properties: geoJSONData.properties || {},
    },
  };
  console.log(
    "Sending data to backend (create):",
    JSON.stringify(data, null, 2)
  );
  const response = await api.post("/geodata", data);
  return response.data;
};

export const updateGeoData = async (id, geoJSONData) => {
  try {
    const data = {
      data: {
        type: "Feature",
        geometry: {
          type: geoJSONData.geometry.type,
          coordinates: geoJSONData.geometry.coordinates,
        },
        properties: geoJSONData.properties || {},
      },
    };

    console.log(
      "Sending data to backend (update):",
      JSON.stringify(data, null, 2)
    );

    const response = await api.put(`/geodata/${id}`, data);

    console.log("Update response:", response);

    if (response.data && response.data.id) {
      return response.data;
    } else {
      throw new Error("Invalid response from server");
    }
  } catch (error) {
    throw error;
  }
};

export const deleteGeoData = async (id) => {
  try {
    const response = await api.delete(`/geodata/${id}`);
    console.log("Delete response:", response);
    return response.data;
  } catch (error) {
    console.error("Error deleting geodata:", error);
    throw error;
  }
};
export default api;

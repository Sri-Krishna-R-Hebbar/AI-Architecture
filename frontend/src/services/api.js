import axios from "axios";

const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const instance = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 120000
});

export default instance;

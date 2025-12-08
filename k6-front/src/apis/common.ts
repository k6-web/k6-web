import axios from "axios";

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      VITE_API_URL: string;
    };
  }
}

const getRuntimeConfig = () => {
  return window.__RUNTIME_CONFIG__?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

const API_BASE_URL = getRuntimeConfig();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


export {
  api,
  API_BASE_URL
}

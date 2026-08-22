export const environment={production:import.meta.env.PROD,apiUrl:import.meta.env.VITE_API_URL||'http://localhost:5000/api',wsUrl:import.meta.env.VITE_WS_URL||'http://localhost:5000',socketPath:import.meta.env.VITE_SOCKET_PATH||'/chat'};
export default environment;

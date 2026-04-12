export const BASE_URL = __ENV.K6_BASE_URL || "https://trakr-five.vercel.app";
export const API_KEY = __ENV.K6_API_KEY || "trk_saBiJA_Zt4PMRmstYdpvxUUOXQ-UWMQa";

export const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

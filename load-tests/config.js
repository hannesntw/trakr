export const BASE_URL = __ENV.K6_BASE_URL || "https://stori.zone";
export const API_KEY = __ENV.K6_API_KEY || "str_saBiJA_Zt4PMRmstYdpvxUUOXQ-UWMQa";

export const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

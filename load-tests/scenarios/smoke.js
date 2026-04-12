import http from "k6/http";
import { check } from "k6";
import { sleep } from "k6";
import { BASE_URL, headers } from "../config.js";

export const options = {
  vus: 5,
  duration: "10s",
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // Verify the system is up by hitting core endpoints

  const projectsRes = http.get(`${BASE_URL}/api/projects`, { headers });
  check(projectsRes, {
    "GET /api/projects is up (200)": (r) => r.status === 200,
  });

  sleep(0.5);

  const workItemsRes = http.get(`${BASE_URL}/api/work-items`, { headers });
  check(workItemsRes, {
    "GET /api/work-items is up (200)": (r) => r.status === 200,
  });

  sleep(0.5);

  const sprintsRes = http.get(`${BASE_URL}/api/sprints`, { headers });
  check(sprintsRes, {
    "GET /api/sprints is up (200)": (r) => r.status === 200,
  });

  sleep(0.5);

  const traqlRes = http.post(
    `${BASE_URL}/api/traql`,
    JSON.stringify({ query: "type:story" }),
    { headers }
  );
  check(traqlRes, {
    "POST /api/traql is up": (r) => r.status === 200,
  });

  sleep(0.5);
}

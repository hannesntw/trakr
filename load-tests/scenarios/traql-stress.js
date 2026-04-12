import http from "k6/http";
import { check, group } from "k6";
import { sleep } from "k6";
import { Trend } from "k6/metrics";
import { BASE_URL, headers } from "../config.js";

const simpleQueryDuration = new Trend("traql_simple_duration", true);
const hierarchyQueryDuration = new Trend("traql_hierarchy_duration", true);
const aggregateQueryDuration = new Trend("traql_aggregate_duration", true);

export const options = {
  scenarios: {
    traql_stress: {
      executor: "constant-vus",
      vus: 50,
      duration: "2m",
    },
  },
  thresholds: {
    traql_simple_duration: ["p(95)<500"],
    traql_hierarchy_duration: ["p(95)<2000"],
    traql_aggregate_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

const simpleQueries = [
  "type:story",
  "type:bug",
  "type:epic",
  "type:feature",
  "is:open",
  "is:closed",
  "type:story is:open",
  "type:bug is:open",
  "type:story points:3",
  "type:story points:>2",
];

const hierarchyQueries = [
  "type:epic has:children",
  "type:feature parent:epic",
  "type:story parent:feature",
];

const aggregateQueries = [
  "SELECT count() GROUP BY type",
  "SELECT count() GROUP BY state",
  "SELECT sum(points) GROUP BY type",
  "SELECT avg(points) GROUP BY state",
  "SELECT count() GROUP BY type, state",
];

const formatQueries = [
  "type:story FORMAT markdown",
  "type:epic FORMAT json",
  "type:bug FORMAT table",
];

function runTraql(query, metricTrend) {
  const res = http.post(
    `${BASE_URL}/api/traql`,
    JSON.stringify({ query }),
    { headers }
  );

  check(res, {
    "TraQL succeeded": (r) => r.status === 200 || r.status === 429,
  });

  if (res.status === 200) {
    metricTrend.add(res.timings.duration);
  }

  return res;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  // Simple field query
  group("Simple queries", () => {
    runTraql(pickRandom(simpleQueries), simpleQueryDuration);
  });

  sleep(0.5);

  // Hierarchy traversal
  group("Hierarchy queries", () => {
    runTraql(pickRandom(hierarchyQueries), hierarchyQueryDuration);
  });

  sleep(0.5);

  // Aggregation
  group("Aggregate queries", () => {
    runTraql(pickRandom(aggregateQueries), aggregateQueryDuration);
  });

  sleep(0.5);

  // Format output
  group("Format queries", () => {
    runTraql(pickRandom(formatQueries), simpleQueryDuration);
  });

  sleep(0.5);
}

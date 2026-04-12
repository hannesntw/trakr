import http from "k6/http";
import { check, group, fail } from "k6";
import { sleep } from "k6";
import { BASE_URL, headers } from "../config.js";

export const options = {
  scenarios: {
    audience: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "2m", target: 100 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
  const projectKey = `K${__VU}`.substring(0, 5).toUpperCase();
  let projectId;
  let epicId;
  const featureIds = [];
  const storyIds = [];

  // 1. Create a project
  group("Create project", () => {
    const res = http.post(
      `${BASE_URL}/api/projects`,
      JSON.stringify({
        name: `Load Test ${uniqueId}`,
        key: projectKey,
        description: "Created by k6 load test",
      }),
      { headers }
    );

    const ok = check(res, {
      "project created (201)": (r) => r.status === 201,
    });

    if (!ok) {
      console.log(`Failed to create project: ${res.status} ${res.body}`);
      return;
    }

    projectId = res.json().id;
  });

  if (!projectId) return;

  sleep(1);

  // 2. Create workflow states
  group("Create workflow states", () => {
    const res = http.post(
      `${BASE_URL}/api/projects/${projectId}/workflow`,
      JSON.stringify({ preset: "standard" }),
      { headers }
    );

    check(res, {
      "workflow created (201)": (r) => r.status === 201,
    });
  });

  sleep(1);

  // 3. Create an epic
  group("Create epic", () => {
    const res = http.post(
      `${BASE_URL}/api/work-items`,
      JSON.stringify({
        projectId,
        title: `Epic ${uniqueId}`,
        type: "epic",
        description: "Load test epic",
      }),
      { headers }
    );

    check(res, {
      "epic created (201)": (r) => r.status === 201,
    });

    if (res.status === 201) {
      epicId = res.json().id;
    }
  });

  if (!epicId) {
    cleanup(projectId);
    return;
  }

  sleep(1);

  // 4. Create 2 features under the epic
  group("Create features", () => {
    for (let i = 0; i < 2; i++) {
      const res = http.post(
        `${BASE_URL}/api/work-items`,
        JSON.stringify({
          projectId,
          title: `Feature ${i + 1} - ${uniqueId}`,
          type: "feature",
          parentId: epicId,
          description: `Load test feature ${i + 1}`,
        }),
        { headers }
      );

      check(res, {
        "feature created (201)": (r) => r.status === 201,
      });

      if (res.status === 201) {
        featureIds.push(res.json().id);
      }
    }
  });

  sleep(1);

  // 5. Create 3 stories under each feature (6 total)
  group("Create stories", () => {
    for (const featureId of featureIds) {
      for (let i = 0; i < 3; i++) {
        const res = http.post(
          `${BASE_URL}/api/work-items`,
          JSON.stringify({
            projectId,
            title: `Story ${i + 1} - ${uniqueId}`,
            type: "story",
            parentId: featureId,
            description: `Load test story ${i + 1}`,
            points: [1, 2, 3, 5, 8][Math.floor(Math.random() * 5)],
          }),
          { headers }
        );

        check(res, {
          "story created (201)": (r) => r.status === 201,
        });

        if (res.status === 201) {
          storyIds.push(res.json().id);
        }
      }
    }
  });

  sleep(1);

  // 6. List work items
  group("List work items", () => {
    const res = http.get(
      `${BASE_URL}/api/work-items?projectId=${projectId}`,
      { headers }
    );

    check(res, {
      "work items listed (200)": (r) => r.status === 200,
      "has work items": (r) => r.json().length > 0,
    });
  });

  sleep(1);

  // 7. Update a story's state
  group("Update story state", () => {
    if (storyIds.length > 0) {
      const res = http.patch(
        `${BASE_URL}/api/work-items/${storyIds[0]}`,
        JSON.stringify({ state: "in_progress" }),
        { headers }
      );

      check(res, {
        "story updated (200)": (r) => r.status === 200,
      });
    }
  });

  sleep(1);

  // 8. Run a TraQL query
  group("TraQL query", () => {
    const res = http.post(
      `${BASE_URL}/api/traql`,
      JSON.stringify({
        query: "type:story is:open",
        projectId,
      }),
      { headers }
    );

    check(res, {
      "TraQL query succeeded": (r) => r.status === 200,
    });
  });

  sleep(1);

  // 9. Run an aggregate query
  group("TraQL aggregate", () => {
    const res = http.post(
      `${BASE_URL}/api/traql`,
      JSON.stringify({
        query: "SELECT count() GROUP BY state",
        projectId,
      }),
      { headers }
    );

    check(res, {
      "TraQL aggregate succeeded": (r) => r.status === 200,
    });
  });

  sleep(1);

  // 10. List sprints
  group("List sprints", () => {
    const res = http.get(
      `${BASE_URL}/api/sprints?projectId=${projectId}`,
      { headers }
    );

    check(res, {
      "sprints listed (200)": (r) => r.status === 200,
    });
  });

  sleep(1);

  // 11. Clean up: delete the project
  cleanup(projectId);
}

function cleanup(projectId) {
  group("Cleanup", () => {
    const res = http.del(`${BASE_URL}/api/projects/${projectId}`, null, {
      headers,
    });

    check(res, {
      "project deleted (200)": (r) => r.status === 200,
    });
  });
}

# Trakr Load Tests

Load tests for the Trakr API using [k6](https://k6.io/).

## Install k6

```bash
# macOS (Homebrew)
brew install k6

# Or download from https://k6.io/docs/get-started/installation/
```

## Scenarios

### Smoke test

Quick 10-second health check with 5 virtual users. Run this before a full load test to confirm the target is reachable.

```bash
npm run load-test:smoke
```

Hits `GET /api/projects`, `GET /api/work-items`, `GET /api/sprints`, and `POST /api/traql` in a loop.

### Audience demo

Simulates 100 conference attendees using Trakr simultaneously. Each virtual user creates a project, sets up workflow states, builds a small hierarchy (epic > features > stories), queries data via TraQL, and cleans up.

```bash
npm run load-test
```

Ramp profile:
- 0-30s: ramp from 0 to 50 VUs
- 30s-1m30s: ramp from 50 to 100 VUs
- 1m30s-3m30s: hold at 100 VUs
- 3m30s-4m: ramp down to 0

### TraQL stress

Stress tests the TraQL query engine specifically with 50 concurrent users running a mix of simple field queries, hierarchy traversals, aggregations, and format outputs.

```bash
npm run load-test:traql
```

Runs for 2 minutes at a constant 50 VUs.

## Overriding the target URL

By default, tests target `https://trakr-five.vercel.app`. Override with the `K6_BASE_URL` environment variable:

```bash
# Test against local dev server
K6_BASE_URL=http://localhost:3100 npm run load-test:smoke

# Test against staging
K6_BASE_URL=https://staging.trakr.app npm run load-test
```

You can also override the API key:

```bash
K6_API_KEY=trk_your_key_here npm run load-test:smoke
```

## Reading the output

k6 prints a summary table after each run. Key metrics to watch:

| Metric | Meaning |
|--------|---------|
| `http_req_duration` | Response time distribution (avg, p90, p95, p99) |
| `http_req_failed` | Percentage of requests that returned non-2xx status |
| `http_reqs` | Total number of HTTP requests made |
| `iterations` | Number of complete VU iterations (full user flows) |
| `vus` | Current number of active virtual users |

### Custom metrics (TraQL stress only)

| Metric | Meaning |
|--------|---------|
| `traql_simple_duration` | Response time for simple field queries |
| `traql_hierarchy_duration` | Response time for hierarchy traversal queries |
| `traql_aggregate_duration` | Response time for aggregate queries |

## Thresholds

Thresholds define pass/fail criteria. If any threshold is breached, k6 exits with a non-zero code.

**Audience demo:**
- `http_req_duration` p95 < 1000ms, p99 < 2000ms
- `http_req_failed` rate < 5%

**TraQL stress:**
- `traql_simple_duration` p95 < 500ms
- `traql_hierarchy_duration` p95 < 2000ms
- `traql_aggregate_duration` p95 < 1000ms
- `http_req_failed` rate < 5%

**Smoke:**
- `http_req_duration` p95 < 2000ms
- `http_req_failed` rate < 1%

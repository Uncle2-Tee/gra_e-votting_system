import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "http://localhost:3000";
const READ_PATHS = [
  "/",
  "/vote/overview",
  "/vote/candidate-application",
  "/vote/candidates",
];

export const options = {
  scenarios: {
    local_read_baseline: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 25 },
        { duration: "1m", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    "http_req_duration{category:landing}": ["p(95)<1000"],
    "http_req_duration{category:database_read}": ["p(95)<2000"],
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

export default function localReadBaseline() {
  const path = READ_PATHS[Math.floor(Math.random() * READ_PATHS.length)];
  const response = http.get(`${BASE_URL}${path}`, {
    tags: {
      route: path,
      category: path === "/" ? "landing" : "database_read",
    },
    timeout: "10s",
  });

  check(response, {
    [`${path} responds successfully`]: (result) =>
      result.status >= 200 && result.status < 400,
  });
  sleep(1);
}

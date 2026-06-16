const baseUrl = (process.env.AGENT_TEST_BASE_URL || "https://store-teal-six.vercel.app").replace(/\/+$/, "");
const secret = process.env.AGENT_TEST_SECRET || process.env.CRON_SECRET;

if (!secret) {
  throw new Error("Set AGENT_TEST_SECRET or CRON_SECRET before running agent tests.");
}

const response = await fetch(`${baseUrl}/api/agent-tests/run`, {
  body: JSON.stringify({
    baseUrl,
    label: `AGENT_TEST manual ${new Date().toISOString()}`,
    mode: "manual",
  }),
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  method: "POST",
});
const text = await response.text();
let data;

try {
  data = text ? JSON.parse(text) : {};
} catch {
  data = { raw: text };
}

console.log(JSON.stringify(data, null, 2));

if (!response.ok || data.status === "failed") {
  process.exitCode = 1;
}

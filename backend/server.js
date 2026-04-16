const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, "logs.jsonl");

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend running" });
});

app.post("/log", (req, res) => {
  const { id, platform, timestamp, pageUrl, prompt, response, status } = req.body;

  if (!platform || !timestamp || !prompt || !response) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  const entry = {
    id: id || null,
    platform,
    timestamp,
    pageUrl: pageUrl || "",
    prompt,
    response,
    status: status || "logged"
  };

  fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", (err) => {
    if (err) {
      console.error("Write error:", err);
      return res.status(500).json({ ok: false, error: "Write failed" });
    }

    console.log(`[${platform}] logged at ${timestamp}`);
    res.json({ ok: true, stored: true });
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`node-api listening on http://localhost:${port}`);
});

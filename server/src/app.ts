import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "25mb" }));

  app.get("/", (_req, res) => {
    res.status(200).json({
      message: "TUGON server is running.",
    });
  });

  app.use("/api", apiRouter);

  return app;
}

import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, () => {
  // Startup log for local development and deployment diagnostics.
  console.log(`TUGON server listening on port ${env.port} (${env.nodeEnv})`);
});

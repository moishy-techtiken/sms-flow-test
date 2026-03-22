import express from "express";
import messagesRouter from "./routes/messages";

const app = express();

app.set("trust proxy", true);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.get("/health", (_req, res) => {
  return res.json({ ok: true });
});
app.use("/api/messages", messagesRouter);

export default app;

import { Request, Router } from "express";
import { z } from "zod";
import { processIncomingMessage } from "../flow/engine/processIncomingMessage";
import { getRequiredEnv } from "../lib/env";
import { normalizePhone } from "../lib/normalizePhone";

const router = Router();

const signalWireWebhookSchema = z
  .object({
    MessageSid: z.string().min(1),
    From: z.string().min(1),
    To: z.string().min(1),
    Body: z.string().default("")
  })
  .passthrough();

type SignalWireRestClient = {
  validateRequest(
    signingKey: string,
    signature: string,
    url: string,
    params: Record<string, unknown>
  ): boolean;
};

function getSignalWireRestClient(): SignalWireRestClient {
  const { RestClient } = require("@signalwire/compatibility-api") as {
    RestClient: SignalWireRestClient;
  };

  return RestClient;
}

function isSignalWireWebhookBody(body: unknown): boolean {
  return !!body && typeof body === "object" && "From" in body && "To" in body;
}

function getRequestUrl(req: Request): string {
  return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
}

function verifySignalWireSignature(req: Request): boolean {
  const signature = req.get("x-signalwire-signature");

  if (!signature) {
    return false;
  }

  const signalWire = getSignalWireRestClient();

  return signalWire.validateRequest(
    getRequiredEnv("SIGNALWIRE_SIGNING_KEY"),
    signature,
    getRequestUrl(req),
    req.body as Record<string, unknown>
  );
}

router.post("/inbound", async (req, res) => {
  try {
    if (!isSignalWireWebhookBody(req.body)) {
      return res.status(400).json({
        ok: false,
        error: "Expected a SignalWire inbound webhook payload."
      });
    }

    // if (!verifySignalWireSignature(req)) {
    //   return res.status(401).json({
    //     ok: false,
    //     error: "Invalid SignalWire signature."
    //   });
    // }

    const parsed = signalWireWebhookSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Invalid SignalWire webhook body.",
        issues: parsed.error.flatten()
      });
    }

    if (!parsed.data.Body.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Message body cannot be empty."
      });
    }

    console.info("signalwire_inbound_received", {
      provider: "signalwire",
      providerMessageId: parsed.data.MessageSid,
      fromNumber: parsed.data.From,
      toNumber: parsed.data.To
    });

    const result = await processIncomingMessage({
      provider: "signalwire",
      providerMessageId: parsed.data.MessageSid,
      fromNumber: normalizePhone(parsed.data.From),
      toNumber: normalizePhone(parsed.data.To),
      body: parsed.data.Body.trim(),
      rawPayload: parsed.data
    });

    return res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("Failed to process inbound SMS", error);

    return res.status(500).json({
      ok: false,
      error: "Internal server error."
    });
  }
});

export default router;

import { getRequiredEnv } from "../lib/env";

export type SendSmsInput = {
  from: string;
  to: string;
  body: string;
};

export type SendSmsResult = {
  provider: string;
  providerMessageId: string | null;
};

type SignalWireMessageResponse = {
  sid?: string;
};

type SignalWireRestClient = {
  messages: {
    create(input: {
      from: string;
      to: string;
      body: string;
    }): Promise<SignalWireMessageResponse>;
  };
};

function getSignalWireClient(): SignalWireRestClient {
  const { RestClient } = require("@signalwire/compatibility-api") as {
    RestClient: (
      projectId: string,
      apiToken: string,
      options: { signalwireSpaceUrl: string }
    ) => SignalWireRestClient;
  };

  return RestClient(
    getRequiredEnv("SIGNALWIRE_PROJECT_ID"),
    getRequiredEnv("SIGNALWIRE_API_TOKEN"),
    {
      signalwireSpaceUrl: getRequiredEnv("SIGNALWIRE_SPACE_URL")
    }
  );
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const client = getSignalWireClient();
  const response = await client.messages.create({
    from: input.from,
    to: input.to,
    body: input.body
  });

  console.info("outbound_sms_sent", {
    provider: "signalwire",
    from: input.from,
    to: input.to,
    providerMessageId: response.sid ?? null
  });

  return {
    provider: "signalwire",
    providerMessageId: response.sid ?? null
  };
}

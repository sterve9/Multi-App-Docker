import { randomUUID } from "crypto";

export function normalizeToN8n(intermediate) {
  if (!intermediate.trigger || !intermediate.actions) {
    throw new Error("Invalid intermediate workflow format");
  }

  const webhookNodeId = randomUUID();
  const logNodeId = randomUUID();

  return {
    name: intermediate.workflowName || "AI Generated Workflow",
    active: false,
    settings: {},
    nodes: [
      {
        id: webhookNodeId,
        name: "Webhook Trigger",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: intermediate.trigger.httpMethod || "POST",
          path: intermediate.trigger.path || "webhook",
          responseMode: "onReceived"
        }
      },
      {
        id: logNodeId,
        name: "Log Data",
        type: "n8n-nodes-base.noOp",
        typeVersion: 1,
        position: [550, 300],
        parameters: {}
      }
    ],
    connections: {
      "Webhook Trigger": {
        main: [
          [
            {
              node: "Log Data",
              type: "main",
              index: 0
            }
          ]
        ]
      }
    }
  };
}

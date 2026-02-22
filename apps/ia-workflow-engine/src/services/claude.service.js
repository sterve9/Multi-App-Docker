import axios from "axios";

/**
 * Nettoie la réponse brute de Claude
 * - Supprime les éventuels ```json
 * - Supprime les ```
 * - Parse le JSON proprement
 */
function safeJsonParse(raw) {
  if (typeof raw === "object") return raw;

  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ Claude raw response:", raw);
    throw new Error("Claude returned invalid JSON");
  }
}

/**
 * Génère un workflow intermédiaire structuré
 * Forcé à respecter le format attendu
 */
export async function generateWorkflow(userRequest) {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error("CLAUDE_API_KEY is not defined");
  }

  if (!process.env.CLAUDE_MODEL) {
    throw new Error("CLAUDE_MODEL is not defined");
  }

  const prompt = `
You are a backend workflow generator.

You MUST respond ONLY with valid JSON.
No markdown.
No explanations.
No backticks.
The response MUST be directly parseable with JSON.parse().

The JSON MUST strictly follow this format:

{
  "workflowName": "Webhook logger",
  "trigger": {
    "type": "webhook",
    "httpMethod": "POST",
    "path": "incoming-data"
  },
  "actions": [
    {
      "type": "log",
      "message": "Incoming data received"
    }
  ]
}

User request:
${userRequest}
`;

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: process.env.CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    },
    {
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      }
    }
  );

  if (!response.data || !response.data.content) {
    throw new Error("Invalid response from Claude API");
  }

  const rawText = response.data.content[0].text;

  return safeJsonParse(rawText);
}

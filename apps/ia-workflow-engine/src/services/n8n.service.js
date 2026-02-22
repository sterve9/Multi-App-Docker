import axios from "axios";

export async function createWorkflow(workflowJson) {
  if (!workflowJson || typeof workflowJson !== "object") {
    throw new Error("Invalid workflow payload (not an object)");
  }

  if (!workflowJson.nodes || !Array.isArray(workflowJson.nodes)) {
    throw new Error("Invalid n8n workflow structure (missing nodes)");
  }
// Ajoute cette ligne juste avant const response = await axios.post(
delete workflowJson.active;
  const response = await axios.post(
    `${process.env.N8N_URL}/api/v1/workflows`,
    workflowJson,
    {
      headers: {
        "X-N8N-API-KEY": process.env.N8N_API_KEY,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
}

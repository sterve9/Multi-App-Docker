import express from "express";
import dotenv from "dotenv";
import { generateWorkflow } from "./services/claude.service.js";
import { createWorkflow } from "./services/n8n.service.js";

/**
 * ✅ AJOUT : on importe le normalizer n8n
 */
import { normalizeToN8n } from "./normalizers/n8n.normalizer.js";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/generate-workflow", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token || token !== `Bearer ${process.env.INTERNAL_AUTH_TOKEN}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { request } = req.body;

    if (!request) {
      return res.status(400).json({ error: "Request is required" });
    }

    console.log("Generating workflow with Claude...");

    /**
     * ❌ ANCIEN CODE :
     * const workflowJson = await generateWorkflow(request);
     * const createdWorkflow = await createWorkflow(workflowJson);
     */

    /**
     * ✅ NOUVEAU FLOW :
     * 1️⃣ Claude génère un workflow intermédiaire
     */
    const intermediate = await generateWorkflow(request);

    /**
     * 2️⃣ On normalise vers le format n8n
     */
    const n8nWorkflow = normalizeToN8n(intermediate);

    console.log("Creating workflow in n8n...");

    /**
     * 3️⃣ On envoie le workflow normalisé à n8n
     */
    const createdWorkflow = await createWorkflow(n8nWorkflow);

    res.json({
      success: true,
      workflowId: createdWorkflow.id
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to generate workflow",
      details: error.message
    });
  }
});

/**
 * 🔴 FIX CRITIQUE ICI
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Workflow Engine running on port ${PORT}`);
});

import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Mock Database for rule-based logic
  // In a real production app, this would be MongoDB/Firestore
  const drugDatabase = [
    {
      name: "Aspirin",
      interactsWith: [
        { drug: "Warfarin", severity: "High", effect: "Increased risk of bleeding", recommendation: "Avoid combination or monitor closely" },
        { drug: "Ibuprofen", severity: "Moderate", effect: "Decreased antiplatelet effect of aspirin", recommendation: "Take aspirin at least 30 mins before or 8 hours after ibuprofen" },
        { drug: "Clopidogrel", severity: "High", effect: "Significant increase in bleeding risk", recommendation: "Use with extreme caution" }
      ]
    },
    {
      name: "Warfarin",
      interactsWith: [
        { drug: "Aspirin", severity: "High", effect: "Increased risk of bleeding", recommendation: "Avoid combination" },
        { drug: "Vitamin K", severity: "Moderate", effect: "Decreased warfarin effectiveness", recommendation: "Maintain consistent vitamin K intake" },
        { drug: "Amiodarone", severity: "High", effect: "Increased warfarin levels and bleeding risk", recommendation: "Reduce warfarin dose and monitor INR" }
      ]
    },
    {
      name: "Ibuprofen",
      interactsWith: [
        { drug: "Lisinopril", severity: "Moderate", effect: "Reduced blood pressure control and kidney risk", recommendation: "Monitor blood pressure and kidney function" },
        { drug: "Aspirin", severity: "Moderate", effect: "May interfere with aspirin's heart protection", recommendation: "Space doses apart" }
      ]
    },
    {
      name: "Lisinopril",
      interactsWith: [
        { drug: "Ibuprofen", severity: "Moderate", effect: "Reduced blood pressure control and kidney risk", recommendation: "Monitor blood pressure and kidney function" },
        { drug: "Spironolactone", severity: "High", effect: "Risk of dangerously high potassium levels", recommendation: "Monitor potassium levels closely" }
      ]
    },
    {
      name: "Metformin",
      interactsWith: [
        { drug: "Contrast Dye", severity: "High", effect: "Risk of lactic acidosis", recommendation: "Stop metformin 48 hours before and after contrast procedures" }
      ]
    },
    {
      name: "Simvastatin",
      interactsWith: [
        { drug: "Amlodipine", severity: "Moderate", effect: "Increased simvastatin levels and muscle toxicity risk", recommendation: "Limit simvastatin dose to 20mg daily" },
        { drug: "Grapefruit Juice", severity: "Moderate", effect: "Increased simvastatin levels", recommendation: "Avoid grapefruit juice" }
      ]
    }
  ];

  const drugMap = new Map<string, typeof drugDatabase[number]>();
  drugDatabase.forEach((drug) => {
    drugMap.set(drug.name.toLowerCase(), drug);
  });

  // API Route: Search Drugs
  app.get("/api/drugs/search", (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.json([]);
    }
    const query = q.toLowerCase();
    const results = drugDatabase
      .filter(d => d.name.toLowerCase().includes(query))
      .map(d => d.name);
    res.json(results);
  });

  // API Route: Analyze Interactions (Rule-based only)
  app.post("/api/analyze", (req, res) => {
    const { drugs } = req.body;

    if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
      return res.status(400).json({ error: "Please provide at least two drugs." });
    }

    try {
      const uniqueDrugs = Array.from(
        new Set(
          drugs
            .map((drug: string) => drug.trim())
            .filter((drug) => drug.length > 0)
        )
      );

      const interactions: any[] = [];

      for (let i = 0; i < uniqueDrugs.length; i++) {
        for (let j = i + 1; j < uniqueDrugs.length; j++) {
          const drugA = uniqueDrugs[i];
          const drugB = uniqueDrugs[j];

          const dbEntry = drugMap.get(drugA.toLowerCase());
          const interaction = dbEntry?.interactsWith.find(
            (inter) => inter.drug.toLowerCase() === drugB.toLowerCase()
          );

          if (interaction) {
            interactions.push({
              drugA,
              drugB,
              severity: interaction.severity,
              description: interaction.effect,
              recommendation: interaction.recommendation,
            });
          }
        }
      }

      res.json({
        interactions,
      });

    } catch (error) {
      console.error("Analysis Error:", error);
      res.status(500).json({ error: "Failed to analyze interactions." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

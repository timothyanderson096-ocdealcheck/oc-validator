const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("OC Validator is running");
});

app.post("/validate-images", async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        status: "invalid",
        has_price: false,
        has_exterior: false,
        has_interior: false,
        missing_evidence: [
          "seller asking price screenshot",
          "exterior vehicle photo",
          "interior vehicle photo",
        ],
        reason: "No images provided.",
      });
    }

    const imageInputs = images.map((img) => ({
      type: "input_image",
      image_url: img,
    }));

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
You are the evidence validator for OC DealCheck.

Your only job is to decide whether the uploaded images provide enough evidence to analyse a used VEHICLE listing.

Images can be in ANY order.

Required evidence:
1. A screenshot or image showing the seller's asking price
2. A clear exterior photo of the vehicle
3. A clear interior photo of the vehicle

Return ONLY valid JSON in this exact shape:

{
  "status": "valid",
  "has_price": true,
  "has_exterior": true,
  "has_interior": true,
  "missing_evidence": [],
  "reason": "short explanation"
}

Rules:
- Be strict, but practical.
- Order does not matter.
- The seller price evidence does not need to be a full listing page if the asking price is clearly shown.
- The exterior photo must clearly show the outside of a car or vehicle.
- The interior photo must clearly show the cabin/interior of the same type of vehicle.
- If the images are code, memes, random screenshots, screenshots of this app, boats, motorbikes, documents, or unclear images, mark invalid unless the required vehicle evidence is clearly present.
- If any required evidence is missing, status must be "invalid".
- If all three are present but one is unclear, status must be "low_confidence".
- Do not analyse price.
- Do not give buying advice.
- Do not invent missing evidence.
              `,
            },
            ...imageInputs,
          ],
        },
      ],
    });

    const raw = response.output_text;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        status: "invalid",
        has_price: false,
        has_exterior: false,
        has_interior: false,
        missing_evidence: ["unknown"],
        reason: "AI returned unreadable validation result.",
        raw,
      });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "invalid",
      has_price: false,
      has_exterior: false,
      has_interior: false,
      missing_evidence: ["unknown"],
      reason: "Validation failed.",
    });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("OC Validator running on port 3000");
});
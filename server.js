const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const { normalizeValidationResult } = require("./validation_contract");

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
          "seller asking price",
          "exterior vehicle photo",
          "interior vehicle photo",
        ],
        reason: "No images were provided.",
      });
    }

    const normalizedImages = images.map((img) => {
      if (typeof img === "string") {
        return {
          imageUrl: img,
          role: null,
        };
      }

      if (img && typeof img === "object" && img.base64 && img.mimeType) {
        return {
          imageUrl: `data:${img.mimeType};base64,${img.base64}`,
          role: img.role || null,
        };
      }

      return {
        imageUrl: null,
        role: null,
      };
    });

    if (normalizedImages.some((img) => !img.imageUrl)) {
      return res.status(400).json({
        status: "invalid",
        has_price: false,
        has_exterior: false,
        has_interior: false,
        missing_evidence: ["unknown"],
        reason: "One or more images were not in a supported format.",
      });
    }

    const imageInputs = normalizedImages.map((img) => ({
      type: "input_image",
      image_url: img.imageUrl,
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

Your job is to decide whether the uploaded images give enough evidence to assess a used car listing.

Images can be in ANY order.

Required evidence:
1. Seller asking price
2. Exterior photo of the car
3. Interior photo of the car

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
- Do not require a perfect Carsales/Facebook listing screenshot.
- If a clear asking price is visible anywhere, count has_price as true.
- If the outside of a car is clearly visible, count has_exterior as true.
- If the cabin/interior of a car is clearly visible, count has_interior as true.
- Do not reject just because the images are not in the expected order.
- Do not reject just because the price screenshot is cropped, as long as the price is readable.
- Do not reject just because the exterior/interior photo is imperfect, as long as it is clearly useful.
- If all three required evidence types are present, return status "valid".
- If one required evidence type is missing, return status "invalid".
- If all three are present but one is blurry, cropped, or unclear, return status "low_confidence".
- If the images are random, memes, code, documents, screenshots of this app, boats, motorbikes, or unrelated content, return "invalid".
- Do not analyse whether the price is good or bad.
- Do not give buying advice.
- Do not invent missing evidence.
- Keep the reason short and plain English.
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
        reason: "AI returned an unreadable validation result.",
        raw,
      });
    }

    res.json(normalizeValidationResult(parsed));
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

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("OC Validator running on port 3000");
});

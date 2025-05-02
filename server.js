require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const { OpenAI } = require("openai");

const app = express();

// CORS dla frontendu
app.use(cors({
  origin: 'https://stepmedia.pl',
  methods: ['GET', 'POST'],
  credentials: false
}));

// ⛔ NIE parsuj JSON-a globalnie przed uploadem plików!
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/app", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Brak zdjęcia." });

  try {
    const imageData = fs.readFileSync(req.file.path, { encoding: "base64" });
    const mimeType = req.file.mimetype;

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Oceń buta na zdjęciu i podaj szacunkową cenę rynkową w złotówkach. Jeśli to możliwe, podaj markę i model." },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageData}`
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    res.send({ wynik: response.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Błąd przetwarzania obrazu." });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// 👇 Jeśli masz inne JSON API — uruchom parsowanie dopiero tu
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Render wymaga tego:
app.listen(process.env.PORT || 3000, () => {
  console.log("Serwer działa");
});

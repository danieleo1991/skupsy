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
     model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Na podstawie zdjęcia oceń, co to za przedmiot i podaj wynik w formacie JSON takim jak poniżej:
{
  "product_name": "...",
  "product_my_price": "..."
}
Gdzie "product_name" to nazwa przedmiotu, a "product_my_price" to szacunkowa kwota, za którą lombard może go odkupić. Nic poza JSON-em nie wyświetlaj.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageData}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    let wynik;

    try {
      wynik = JSON.parse(content);
    } catch (e) {
      console.error("❗ Błąd parsowania JSON:", e.message);
      wynik = { error: "Nie udało się sparsować odpowiedzi GPT jako JSON." };
    }

    res.send({ wynik });

  } catch (error) {
    console.error("❌ Błąd serwera:", error?.message || error);
    if (error?.response?.data) {
      console.error("📦 Szczegóły odpowiedzi OpenAI:", error.response.data);
    }
    res.status(500).json({ error: "Błąd przetwarzania obrazu." });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

app.get("/test", (req, res) => {
  res.send("Serwer działa, OPENAI_API_KEY: " + (process.env.OPENAI_API_KEY ? "OK" : "BRAK"));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Serwer działa");
});

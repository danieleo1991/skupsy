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
              text: `Jesteś generatorem JSON i pracownikiem lombardu. Na podstawie zdjęcia oceń, co to za przedmiot. Następnie oszacuj jego wartość rynkową jako przedmiotu używanego, a potem wyceń kwotę, za jaką lombard mógłby go odkupić — uwzględniając potrzebę zarobku.

Cenę odkupu ustal na poziomie **40–60% ceny rynkowej używanego sprzętu**, tak jak w prawdziwym lombardzie.

Podaj wynik w **czystym formacie JSON**:

{
  "status": "true jeśli masz pewność co to za przedmiot lub false jeśli nie masz",
  "product_name": "nazwa przedmiotu",
  "product_my_price": "np. 250 zł"
}

Zwróć tylko ten JSON. Żadnych komentarzy ani dodatkowych opisów.`
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
      const match = content.match(/{[\s\S]*}/);
	  if (match) {
		wynik = JSON.parse(match[0]);
	  } else {
		throw new Error("Nie znaleziono żadnego JSON-a w treści");
	  }
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

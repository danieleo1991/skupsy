const express = require("express");
const cors = require('cors');
const multer = require("multer");
const fs = require("fs");
const { OpenAI } = require("openai");

const app = express();
app.use(cors({
	origin: 'https://stepmedia.pl',
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	credentials: false
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json());
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: "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" });

app.post("/app", upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).send("Brak zdjęcia.");

    try {
        // Wczytaj obraz jako base64
        const imageData = fs.readFileSync(req.file.path, { encoding: "base64" });
        const mimeType = req.file.mimetype;

        // Zapytanie do GPT-4 z obrazem
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

        const answer = response.choices[0].message.content;
        res.send({ wynik: answer });
    } catch (error) {
        console.error(error);
        res.status(500).send("Błąd przetwarzania obrazu.");
    } finally {
        fs.unlinkSync(req.file.path); // Usuń plik po analizie
    }
});

app.listen(3000, () => {
    console.log("Serwer działa na http://localhost:3000");
});

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const { OpenAI } = require("openai");

const app = express();

app.use(cors({
	origin: 'https://stepmedia.pl',
	methods: ['GET', 'POST'],
	credentials: false
}));

const upload = multer({
	dest: "uploads/",
	limits: { fileSize: 8 * 1024 * 1024 },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/app", upload.single("image"), async (req, res) => {
	
	if (!req.file) return res.status(400).json({ error: "Brak zdjęcia." });

	try {
		
		const openAI_messages = [];
		const quotationKey = req.body.quotation_key;
		const imageData = fs.readFileSync(req.file.path, { encoding: "base64" });
		const imageHash = crypto.createHash("sha1").update(imageData).digest("hex");
		const mimeType = req.file.mimetype;
		const imageBase64 = `data:${mimeType};base64,${imageData}`;
		
		if (quotationKey) {
			
			const quotation = await axios.post("https://stepmedia.pl/skupsy/app/get-quotation.php", {
				secret: "777",
				quotation_key: quotationKey
			});
			
			openAI_messages.unshift({
  role: "system",
  content: `
Jesteś generatorem JSON i pracownikiem lombardu. Twoim zadaniem jest:

1. Rozpoznać przedmiot ze zdjęcia (nazwa, model, marka),
2. Określić kategorię główną (np. Elektronika, AGD, Narzędzia, itd.),
3. Ocenić:
   - stopień pewności rozpoznania: "definitely" (1–10),
   - stan fizyczny: "condition" (1–10),
   - potencjał sprzedaży: "potential" (1–10).

---

**OBOWIĄZKOWO OBLICZ KOLEJNE POLA:**

- "product_new_price": podaj realistyczną cenę nowego produktu na rynku (np. 259),
- "used_percentage": procent wartości nowej wg condition:
  - 10 → 40
  - 9 → 35
  - 8 → 30
  - 7 → 25
  - 6 → 20
  - 5 → 15
  - 4 → 10
  - 3 lub mniej → 5

- "used_value": product_new_price × used_percentage / 100 (zaokrąglij w dół do pełnej liczby),
- "potential_percentage": współczynnik wg potential:
  - 10 → 100
  - 9 → 90
  - 8 → 80
  - 7 → 70
  - 6 → 60
  - 5 → 50
  - 4 → 40
  - 3 → 30
  - 2 → 20
  - 1 → 10

- "adjusted_value": used_value × potential_percentage / 100 (zaokrąglij w dół do pełnej liczby),
- "product_my_price": wartość adjusted_value, zaokrąglona **w dół do najbliższej pełnej setki** (np. 187 → 100). **Jeśli wynik < 100 i produkt wart sprzedaży → wpisz 100.**

---

**Zwróć wynik w czystym JSON (bez komentarzy):**

{
  "status": "true",
  "product_name": "Głośnik JBL Flip 6",
  "product_category_name": "Elektronika",
  "definitely": 10,
  "condition": 9,
  "potential": 6,
  "product_new_price": 259,
  "used_percentage": 35,
  "used_value": 90,
  "potential_percentage": 60,
  "adjusted_value": 54,
  "product_my_price": 100,
  "need_more_info": "0"
}

Jeśli potrzebne dodatkowe zdjęcie – dodaj pole "photo_request" z instrukcją. Jeśli nie – pomiń to pole.

ZWRÓĆ TYLKO JSON. Żadnych wyjaśnień ani tekstów.
`
});
			
			openAI_messages.push({
				role: "assistant",
				content: JSON.stringify({
					status: quotation.data.status,
					product_name: quotation.data.product_name,
					product_category_name: quotation.data.product_category_name,
					definitely: quotation.data.definitely,
					condition: quotation.data.condition,
					potential: quotation.data.potential,
					product_my_price: quotation.data.product_my_price,
					need_more_info: quotation.data.need_more_info,
					photo_request: quotation.data.photo_request
				})
			});

			openAI_messages.push({
				role: "user",
				content: [
				{
					type: "text",
					text: `Oto dodatkowe zdjęcie tego samego przedmiotu. Proszę o pełną wycenę na podstawie **obiektu widocznego na tym zdjęciu**.

					Jeśli masz wystarczająco danych - podaj kompletną wycenę.
					Jeśli jakość zdjęcia lub jego zawartość nie pozwala jednoznacznie zidentyfikować przedmiotu lub jego stanu, dodaj pole 'photo_request', w którym zasugerujesz użytkownikowi jakie dokładnie zdjęcie powinien dosłać. Np. "Proszę o zdjęcie tabliczki znamionowej z danymi technicznymi", "Proszę o zdjęcie z innej perspektywy, pokazujące stan obudowy", "Proszę o zdjęcie logo producenta i modelu", itp. Jeśli dodatkowe zdjęcie nie jest potrzebne, pomiń to pole.

					Zwróć tylko wynik w czystym formacie JSON jak wcześniej.`
				},
				{
					type: "image_url",
					image_url: {
						url: `data:${mimeType};base64,${imageData}`
					}
				}
				]
			});
			
		}
		else {
			
			openAI_messages.unshift({
  role: "system",
  content: `
Jesteś generatorem JSON i pracownikiem lombardu. Twoim zadaniem jest:

1. Rozpoznać przedmiot ze zdjęcia (nazwa, model, marka),
2. Określić kategorię główną (np. Elektronika, AGD, Narzędzia, itd.),
3. Ocenić:
   - stopień pewności rozpoznania: "definitely" (1–10),
   - stan fizyczny: "condition" (1–10),
   - potencjał sprzedaży: "potential" (1–10).

---

**OBOWIĄZKOWO OBLICZ KOLEJNE POLA:**

- "product_new_price": podaj realistyczną cenę nowego produktu na rynku (np. 259),
- "used_percentage": procent wartości nowej wg condition:
  - 10 → 40
  - 9 → 35
  - 8 → 30
  - 7 → 25
  - 6 → 20
  - 5 → 15
  - 4 → 10
  - 3 lub mniej → 5

- "used_value": product_new_price × used_percentage / 100 (zaokrąglij w dół do pełnej liczby),
- "potential_percentage": współczynnik wg potential:
  - 10 → 100
  - 9 → 90
  - 8 → 80
  - 7 → 70
  - 6 → 60
  - 5 → 50
  - 4 → 40
  - 3 → 30
  - 2 → 20
  - 1 → 10

- "adjusted_value": used_value × potential_percentage / 100 (zaokrąglij w dół do pełnej liczby),
- "product_my_price": wartość adjusted_value, zaokrąglona **w dół do najbliższej pełnej setki** (np. 187 → 100). **Jeśli wynik < 100 i produkt wart sprzedaży → wpisz 100.**

---

**Zwróć wynik w czystym JSON (bez komentarzy):**

{
  "status": "true",
  "product_name": "Głośnik JBL Flip 6",
  "product_category_name": "Elektronika",
  "definitely": 10,
  "condition": 9,
  "potential": 6,
  "product_new_price": 259,
  "used_percentage": 35,
  "used_value": 90,
  "potential_percentage": 60,
  "adjusted_value": 54,
  "product_my_price": 100,
  "need_more_info": "0"
}

Jeśli potrzebne dodatkowe zdjęcie – dodaj pole "photo_request" z instrukcją. Jeśli nie – pomiń to pole.

ZWRÓĆ TYLKO JSON. Żadnych wyjaśnień ani tekstów.
`
});
			
			try {
				const check = await axios.post("https://stepmedia.pl/skupsy/app/check-hash-image.php", {
					secret: "777",
					image_hash: imageHash
				});
				if (check.data.status === "found") {
					return res.send(check.data);
				}
			}
			catch (err) {
				console.error("❌ Błąd sprawdzania hasha:", err.message);
			}
			
		}
		
		console.log("GPT...");

		const response = await openai.chat.completions.create({
			model: "gpt-4.1-mini",
			temperature: 0,
			messages: openAI_messages,
			max_tokens: 1000,
		});

		const content = response.choices[0].message.content;
		console.log("📥 Treść od GPT:", content);
		let wynik;

		try {
			const match = content.match(/{[\s\S]*}/);
			if (match) {
				wynik = JSON.parse(match[0]);
			}
			else {
				throw new Error("Nie znaleziono żadnego JSON-a w treści");
			}
		}
		catch (e) {
			console.error("❗ Błąd parsowania JSON:", e.message);
			wynik = { error: "Nie udało się sparsować odpowiedzi GPT jako JSON." };
		}
	
		const quotationResponse = await axios.post("https://stepmedia.pl/skupsy/app/quotation.php", {
			secret: "777",
			quotation_key: quotationKey,
			image_hash: imageHash,
			image_base64: imageBase64,
			product_name: wynik.product_name,
			product_category_name: wynik.product_category_name,
			product_my_price: wynik.product_my_price,
			definitely: wynik.definitely,
			condition: wynik.condition,
			potential: wynik.potential,
			status: wynik.status,
			need_more_info: wynik.need_more_info,
			photo_request: wynik.photo_request
		});

		res.send(quotationResponse.data);

	}
	catch (error) {
		console.error("❌ Błąd serwera:", error?.message || error);
		if (error?.response?.data) {
			console.error("📦 Szczegóły odpowiedzi OpenAI:", error.response.data);
		}
		res.status(500).json({ error: "Błąd przetwarzania obrazu." });
	}
	finally {
		fs.unlinkSync(req.file.path);
	}
	
});

app.listen(process.env.PORT || 3000);

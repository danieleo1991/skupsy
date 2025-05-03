require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const crypto = require("crypto");
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
			
			openAI_messages.push({
				role: "user",
				content: `Oto pierwsze zdjęcie przedmiotu. Proszę o wycenę.`
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
				content: `Oto dodatkowe zdjęcie - zgodnie z wcześniejszą prośbą.`
			});
			
		}
		else {
			
			openAI_messages.push({
				role: "user",
				content: [
					{
						type: "text",
						text: `Jesteś generatorem JSON i pracownikiem lombardu. Na podstawie zdjęcia oceń, co to za przedmiot - dokładnie, wraz z modelem lub marką.

						Określ też główną kategorię przedmiotu, np.: "Elektronika", "Samochód", "Biżuteria", "AGD", "Odzież", "Narzędzia", "Inne".

	Dodatkowo podaj stopień pewności co do identyfikacji przedmiotu w skali od 1 (zgaduję) do 10 (100% pewność). Zwróć to jako pole "definitely".

	Jeśli jakość zdjęcia lub jego zawartość nie pozwala jednoznacznie zidentyfikować przedmiotu lub jego stanu, dodaj pole 'photo_request', w którym zasugerujesz użytkownikowi jakie dokładnie zdjęcie powinien dosłać. Np. "Proszę o zdjęcie tabliczki znamionowej z danymi technicznymi", "Proszę o zdjęcie z innej perspektywy, pokazujące stan obudowy", "Proszę o zdjęcie logo producenta i modelu", itp. Jeśli dodatkowe zdjęcie nie jest potrzebne, pomiń to pole.


	Wynik zwróć w **czystym formacie JSON**:

	{
	  "status": "true jeśli masz pewność co to za przedmiot lub false jeśli nie masz",
	  "product_name": "dokładna nazwa przedmiotu wraz z modelem",
	  "product_category_name": "główna kategoria, np. Elektronika",
	  "definitely": "liczba od 1 do 10 włącznie określająca jak bardzo jesteś pewien",
	  "condition": "liczba od 1 do 10 włącznie określająca obecny stan przedmiotu ze zdjęcia",
	  "potential": "potencjał sprzedaży przez lombard w skali od 1 do 10 włącznie. Uwzględnij zapotrzebowanie rynkowe na ten produkt, popularność. Lombard musi być zarobić na tym łatwo i szybko. Jeżeli uznasz, że ten przedmiot jest super łatwo sprzedaż z dużym zyskiem to wynik: 10, jeżeli ciężko i mały zysk to potencjał sprzedaży: 1",
	  "product_my_price": "np. 250. Zaokrąglij wynik w dół do pełnych setek (np. 1125 zł → 1100 zł lub 85 zł → 80 zł). Oszacuj wartość rynkową produktu jako używanego, i określ za jaką kwotę lombard mógłby go odkupić. Weź pod uwagę stan przedmiotu (wartość 'condition') tj. jeśli '10' to 25% wartości rynkowej używanego przedmiotu, jeśli '1' to 10% wartości rynkowej używanego przedmiotu i reszta analogicznie. Weź także pod uwagę parametr 'potential' - im wyższy tym wyższa wartość produktu, a im niższy niż tym niższa wartość produktu",
	  "need_more_info": "wpisz '1' jeśli do wyceny potrzebujesz więcej informacji (np. ilość RAM itp.) lub wpisz '0' jeśli nie potrzebujesz dodatkowych informacji, aby wycenić dokładnie produkt",
	  "photo_request": "jeśli potrzebne jest dodatkowe zdjęcie - wpisz instrukcję jakie, np. 'Proszę o zdjęcie tabliczki znamionowej'. Jeśli niepotrzebne – pomiń to pole."
	}

	Zwróć tylko ten JSON. Żadnych opisów ani komentarzy.`
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

    const response = await openai.chat.completions.create({
		model: "gpt-4.1-mini",
		temperature: 0,
		messages: openAI_messages,
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
	
	const quotationResponse = await axios.post("https://stepmedia.pl/skupsy/app/quotation.php", {
		secret: "777",
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

app.listen(process.env.PORT || 3000, () => {
  console.log("Serwer działa");
});

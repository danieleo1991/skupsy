<?php

	if (!$IS_DEFINED) die;

$JS_SCRIPTS .= '
<script>
	// Obsługa automatycznego submitu po zrobieniu zdjęcia aparatem
	document.getElementById("cameraInput").addEventListener("change", function () {
		if (this.files.length > 0) {
			document.getElementById("form").requestSubmit();
		}
	});

	// Obsługa automatycznego submitu po wybraniu pliku z galerii (drugi input)
	document.getElementById("galleryInput").addEventListener("change", function () {
		if (this.files.length > 0) {
			document.getElementById("form").requestSubmit();
		}
	});

	// Obsługa wysyłki formularza
	document.getElementById("form").onsubmit = async (e) => {
		e.preventDefault();
		$("#result").html("<h1>Wyceniam Twój przedmiot. Daj mi chwilę...</h1>");

		try {
			const formData = new FormData(e.target);
			const res = await fetch("https://skupsy.onrender.com/app", {
				method: "POST",
				body: formData
			});
			const data = await res.json();

			if (data.wynik.status) {
				console.log(data.wynik.product_category_name);
				$("#result").html(
					"<h2>" + data.wynik.product_name + "</h2>" +
					"<h1>Gratulacje! Możemy odkupić od Ciebie ten przedmiot za <span>" +
					data.wynik.product_my_price +
					"</span> w ciągu <span>15 minut</span>!</h1>"
				);
			} else {
				$("#result").html("❌ Nie mogę rozpoznać tego przedmiotu. Zrób inne zdjęcie.");
			}
		}
		catch (err) {
			console.error(err);
			$("#result").html("❌ Błąd. Spróbuj później.");
		}
	};
</script>
';

$CONTENT .= '
<div class="container mt50 mb50">
	<form id="form" enctype="multipart/form-data">
		<!-- Ukryty input dla aparatu -->
		<input id="cameraInput" type="file" name="image" accept="image/*" capture="environment" style="display:none;"  />

		<!-- Przycisk otwierający aparat -->
		<div>
			<button type="button" onclick=\'document.getElementById("cameraInput").click();\'>Zrób zdjęcie</button>
		</div>

		<div>lub...</div>

		<!-- Drugi input do galerii -->
		<input id="galleryInput" type="file" name="image" accept="image/*"  />

		<button type="submit">Wyceń</button>
	</form>

	<div id="result" class="result"></div>
</div>
';

?>

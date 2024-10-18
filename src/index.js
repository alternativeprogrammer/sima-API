export default {
	async fetch(req) {
	  try {
		// Obtener el nombre de la estación desde la URL
		const url = new URL(req.url);
		const stationName = url.searchParams.get("station") || "CENTRO";  // Por defecto "CENTRO" si no se proporciona
  
		// Debug: Comenzamos con la estación
		console.log(`Fetch estación ${stationName}`);
		
		// Realizamos la petición PHP (sin await, no esperamos a que termine)
		fetch(`http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=${stationName}`, {
		  headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
			"Accept-Language": "en-US,en;q=0.9",
			"Accept-Encoding": "gzip, deflate, br",
			"Connection": "keep-alive",
		  }
		});
  
		// Debug: Esperamos 1 segundo antes de hacer la solicitud JSON
		console.log("Await 1 second");
		await new Promise(resolve => setTimeout(resolve, 1000));  // Espera 1 segundo
  
		// Debug: Solicitando el archivo JSON
		console.log("Await fetch .json");
		const jsonResponse = await fetch('http://aire.nl.gob.mx:81/SIMA2017reportes/pages/ParamA_IAS.json', {
		  headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
			"Accept-Language": "en-US,en;q=0.9",
			"Accept-Encoding": "gzip, deflate, br",
			"Connection": "keep-alive",
		  }
		});
  
		if (!jsonResponse.ok) {
		  throw new Error(`Failed to fetch JSON: ${jsonResponse.statusText}`);
		}
  
		const data = await jsonResponse.json();
  
		// Retornamos el JSON con los datos
		const response = new Response(JSON.stringify(data), {
		  headers: { "Content-Type": "application/json" },
		});
  
		// Debug de 2 segundos para simular una solicitud lenta
		console.log("Await 2 seconds");
		await new Promise(resolve => setTimeout(resolve, 2000));  // Espera 20 segundos
  
		return response;
  
	  } catch (error) {
		return new Response('Error: ' + error.message, { status: 500 });
	  }
	}
  };
  
export default {
	async fetch(req) {
	  try {
		const url = new URL(req.url);
		const stationName = url.searchParams.get("station") || "CENTRO";
  
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
  
		console.log("Await 1 second");
		await new Promise(resolve => setTimeout(resolve, 1000));
  
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
  
		const headers = {
		  "Content-Type": "application/json",
		  "Access-Control-Allow-Origin": "*",  // Permite cualquier origen
		  "Access-Control-Allow-Methods": "GET, OPTIONS",  // Métodos permitidos
		  "Access-Control-Allow-Headers": "Content-Type",  // Encabezados permitidos
		};
  
		console.log("Await 2 seconds");
		await new Promise(resolve => setTimeout(resolve, 2000));
  
		return new Response(JSON.stringify(data), { headers });
  
	  } catch (error) {
		return new Response('Error: ' + error.message, { status: 500 });
	  }
	}
  };
  
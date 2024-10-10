"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const chromium = require('chrome-aws-lambda'); // Esto solo se usará en la nube
const app = (0, express_1.default)();
// Cambié el puerto para que use el valor de la variable de entorno
const port = process.env.PORT || 4000;
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
// Lista de estaciones
const estaciones = [
    { name: "Centro", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=CENTRO' },
    { name: "Sureste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SURESTE' },
    { name: "Noreste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NORESTE' },
    { name: "Noroeste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NOROESTE' },
    { name: "Suroeste", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SUROESTE' },
    { name: "Noroeste2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=GARCIA' },
    { name: "Norte", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NORTE' },
    { name: "Noreste2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NORESTE2' },
    { name: "Sureste2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SURESTE2' },
    { name: "Suroeste2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=[SAN%20Pedro]' },
    { name: "Sureste3", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SURESTE3' },
    { name: "Norte2", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=NORTE2' },
    { name: "Sur", dataUrl: 'http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=SUR' },
  ];
// Función para lanzar el navegador con las opciones correctas para Vercel o local
const launchBrowser = () => __awaiter(void 0, void 0, void 0, function* () {
    const isLambda = process.env.AWS_LAMBDA_FUNCTION_NAME; // Esto verifica si la app está corriendo en AWS Lambda o no
    const browserOptions = isLambda
        ? {
            args: chromium.args,
            executablePath: yield chromium.executablePath,
            headless: true,
        }
        : { headless: true }; // Usa Chromium por defecto en local
    const browser = yield puppeteer_extra_1.default.launch(browserOptions);
    return browser;
});
// Ruta inicial
app.get('/', (req, res) => {
    res.send('API inicializada');
});
// Función para obtener datos de una estación
const obtenerDatosEstacion = (dataUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield launchBrowser();
    const page = yield browser.newPage();
    try {
        yield page.goto(dataUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000, // Esperar hasta que la red esté inactiva o tiempo de espera (60s)
        });
        // Esperar a que los datos sean visibles y que no contengan 'No datos'
        yield page.waitForFunction(() => {
            const tbody = document.querySelector('#tablaIMK_wrapper tbody');
            return tbody && tbody.innerText.trim().length > 0 && !tbody.innerText.includes('No datos');
        });
        // Obtener los datos de la tabla
        const jsonData = yield page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#tablaIMK_wrapper tbody tr'));
            return rows.map(row => {
                var _a, _b, _c;
                const cells = row.querySelectorAll('td');
                return {
                    parametro: (_a = cells[0]) === null || _a === void 0 ? void 0 : _a.innerText.trim(),
                    valor: (_b = cells[1]) === null || _b === void 0 ? void 0 : _b.innerText.trim(),
                    descriptor: (_c = cells[2]) === null || _c === void 0 ? void 0 : _c.innerText.trim(),
                };
            });
        });
        return jsonData;
    }
    catch (error) {
        console.error('Error al obtener los datos de la estación:', error);
        throw new Error('Error al procesar la solicitud para la estación');
    }
    finally {
        yield browser.close();
    }
});
// Crear rutas específicas para cada estación
estaciones.forEach(estacion => {
    app.get(`/data/${estacion.name.toLowerCase()}`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const jsonData = yield obtenerDatosEstacion(estacion.dataUrl);
            res.json(jsonData);
        }
        catch (error) {
            console.error(`Error al cargar los datos de ${estacion.name}:`, error);
            res.status(500).send(`Error al procesar la solicitud para ${estacion.name}`);
        }
    }));
});
// Iniciar el servidor en el puerto correcto
app.listen(port, () => {
    console.log(`API inicializada en http://localhost:${port}`);
});

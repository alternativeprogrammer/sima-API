# SIMA API
  
Esta API permite capturar y estructurar datos de calidad del aire provenientes del **Sistema Integral de Monitoreo Ambiental (SIMA)** del estado de Nuevo León. El proyecto ofrece un endpoint funcional tanto en local como en producción, con el propósito de facilitar la obtención de datos en un formato JSON ordenado y consistente.

### Nota  
Actualmente, la API se encuentra alojada en **Heroku**. Sin embargo, debido a razones personales y para reducir gastos por tráfico, la API se ha mantenido privada. Aun así, el código es completamente funcional para ejecutarse en entornos locales, por lo que eres libre de clonar este repositorio y probarlo. Agradezco que reconozcas mi trabajo si lo usas o lo adaptas en tus propios proyectos.

## ¿Qué datos captura esta API?  

La API realiza **web scraping** de las páginas oficiales del SIMA, específicamente de los reportes diarios organizados por estación. Un ejemplo de estos reportes puede encontrarse en: [Reporte Diario - Estación Centro](http://aire.nl.gob.mx:81/SIMA2017reportes/ReporteDiariosimaIcars.php?estacion1=CENTRO)  

![image](https://github.com/user-attachments/assets/8d51f9ae-f45c-406c-b8ca-dd877e8861b8)

El objetivo principal es capturar la primera gráfica que refleja la calidad del aire de forma resumida. La API organiza esta información en un JSON más accesible con la siguiente estructura:

```json
{
  "station": "CENTRO",
  "data": [
    {
      "parametro": "Bióxido de azufre (SO2)",
      "valor": "4.867",
      "descriptor": "Bueno"
    },
    {
      "parametro": "Bióxido de nitrógeno (NO2)",
      "valor": "6.9",
      "descriptor": "Bueno"
    },
    {
      "parametro": "Monóxido de carbono (CO)",
      "valor": "0.764",
      "descriptor": "Bueno"
    },
    {
      "parametro": "Ozono (O3)",
      "valor": "40",
      "descriptor": "Bueno"
    },
    {
      "parametro": "Ozono (O3) promedio 8 hrs",
      "valor": "37.125",
      "descriptor": "Bueno"
    },
    {
      "parametro": "Partículas menores a 10 micras (PM10)",
      "valor": "25.181",
      "descriptor": "Bueno"
    },
    {
      "parametro": "Partículas menores a 2.5 micras (PM2.5)",
      "valor": "8.035",
      "descriptor": "Bueno"
    }
  ]
}
```

## ¿Por qué se implementó de esta manera?  

Durante la creación del proyecto, se identificó que algunos enlaces del SIMA no mostraban datos actualizados al cambiar entre estaciones de monitoreo, a menos que se hubiera abierto manualmente la página de cada estación en el navegador. Esto puede deberse al modo en que los servidores **Apache** de SIMA gestionan la caché o las solicitudes de datos dinámicos. 

Para resolver este problema y asegurar que la API devuelva información en tiempo real, se optó por implementar un proceso de **web scraping independiente por cada solicitud**. De esta manera, cada vez que se realiza un GET hacia la API, se capturan y devuelven los datos más recientes. Esto permite hacer múltiples solicitudes sin perder precisión en la información obtenida.

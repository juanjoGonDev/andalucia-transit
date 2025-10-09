# CTAN API Endpoint Reference

Generated from https://api.ctan.es/doc/api_data.js on 2025-10-08 21:05 UTC.

## External integrations

### GET https://date.nager.at/api/v3/PublicHolidays/{year}/ES — Spanish public holidays

Retrieves the full list of national and regional public holidays for the requested year. The app filters the response for entries marked as global or assigned to `ES-AN` so timetable queries treat Andalusian festivos correctly.

- **Provider:** Nager.Date (https://date.nager.at)
- **License:** MIT (https://github.com/nager/Nager.Date/blob/master/LICENSE)
- **Usage:** Cached per year in-memory; no API key required; respect server rate limits noted in the upstream documentation.

**Parameters**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| year | Number | Yes | Gregorian year for the holiday set. |

**Success responses**

| Name | Type | Description |
| --- | --- | --- |
| date | String | ISO `yyyy-MM-dd` date of the holiday. |
| localName | String | Localised holiday name (Spanish). |
| name | String | English holiday name. |
| global | Boolean | Indicates whether the holiday applies nationwide. |
| counties | Array[String] | Optional list of ISO 3166-2 subdivision codes (e.g., `ES-AN`). |

The integration must display CTAN data attribution unchanged and cite the Nager.Date source in documentation when referencing holiday-aware behaviour.

## Endpoint catalog

### Abreviaturas

#### GET /Consorcios/:idConsorcio/abreviaturas — Abreviaturas

Obtiene un listado completo de las abreviaturas del Consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneAbreviaturas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/abreviaturas?lang=ES`
- **Source:** v1/recursos/abreviaturas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idfrecuencia | Number | Yes | Identificador de la frecuencia. |
| acronimo | String | Yes | Nombre corto usado en las leyendas de los horarios. |
| nombre | String | Yes | Nombre de la frecuencia. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/frecuencias — Frecuencias

Listado de las frecuencias del Consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneFrecuencia
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/frecuencias`
- **Source:** v1/recursos/frecuencias.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idFreq | Number | Yes | Identificador de la Frecuencia. |
| codigo | String | Yes | Código de la frecuencia, nombre corto. |
| nombre | String | Yes | Nombre de la Frecuencia. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Atencion_Usuario

#### GET /Consorcios/:idConsorcio/att_usuario — Obtiene atencion al usuario

Contiene una variable formateada en HTML con estilos para mostrar el contenido de la sección mostrada de atención al usuario.

- **Version:** 1.0.0
- **Operation ID:** ObtieneAtencionUsuario
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/att_usuario?lang=ES`
- **Source:** v1/recursos/att_usuario.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| txtAtencionUsr | String | Yes | Texto de atención al usuario. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Configuracion

#### GET /Consorcios/:idConsorcio/configuracion — Configuracion de la App

Muestra un listado de variables que describen el funcionamiento de la APP para un Consorcio.

- **Version:** 1.0.0
- **Operation ID:** configuracionConsorcio
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/configuracion`
- **Source:** v1/recursos/configuracion.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| numAtencionUnica | String | Yes | Número de teléfono de atención unica al usuario. |
| desactivarIdioma | String | Yes | Indica si la opcion de cambio de idioma esta activa. |
| urlTwitter | String | Yes | URL del consorcio en Twitter. |
| urlFacebook | String | Yes | URL del Conosrcion en Facebook. |
| numSolMinCalculoRutas | Number | Yes | Numero de soluciones minimas en el calculo de rutas. |
| rangoTempBusqSol | Number | Yes | Rango de tiempo para la busqueda de soluciones. |
| verTarifas | Boolean | Yes | Indica si se muestran las tarifas. |
| verSimulador | Boolean | Yes | Indica si se muestra el simulador de saltos. |
| verSaltos | Boolean | Yes | Indica si se muestra la tabla de saltos. |
| verCalculadora | Boolean | Yes | Indica si se muestra la calculadora de saltos. |
| verMatriz | Boolean | Yes | Indica si se muestra la matriz de saltos. |
| verZonas | Boolean | Yes | Indica si se muestra la lista de zonas. |
| maxTiempoAndando | Number | Yes | Maximo tiempo andando a una parada. |
| verTextoZonaInferior | Boolean | Yes | Ver texto de la zona inferior de la seccion de tarifas. |
| verTarifasUrbano | Boolean | Yes | Ver las tarifas de los operadores urbanos. |
| textoSeccionTarifas | String | Yes | Texto a mostrar en la seccion tarifas. |
| longitud | String | Yes | Coordenada de longitud del consorcio. |
| latitud | String | Yes | Coordenada de latitud del consorcio. |
| fianza | Number | Yes | Fianza de la tarjeta. |
| horaCorte | Date | Yes | Hora de corte de los servicios del consorcio. |
| maxTiempoRecorrido | Number | Yes | Indica el número máximo de minutos que puede tener un recorrido (incluyendo transbordos). |
| tieneTren | Boolean | Yes | Indica si el Consorcio tiene opción de usar el tren. |
| hayCorredores | Boolean | Yes | Indica si existen corredores en el consorcio. |
| fechaNoticias | Date | Yes | Fecha de la primera noticia registrada. |
| fechaInicioTarifa | Date | Yes | Fecha de entrada en vigor de las tarifas. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Consorcios

#### GET /Consorcios/:idConsorcio/consorcios — Lista de Consorcios

Listado de los consorcios.

- **Version:** 1.0.0
- **Operation ID:** ObtieneConsorcios
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/consorcios`
- **Source:** v1/recursos/consorcios.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| nombre | String | Yes | Nombre del Consorcio. |
| nombreCorto | String | Yes | Nombre del Consorcio. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/consorcios — Consorcios por defecto

Listado de los consorcios, se usa cuando al cargar la APP aún no sabemos que consorcio quiere usar el usuario.

- **Version:** 1.0.0
- **Operation ID:** ObtieneConsorciosDefecto
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/consorcios`
- **Source:** v1/recursos/consorcios.php

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| nombre | String | Yes | Nombre del Consorcio. |
| nombreCorto | String | Yes | Nombre del Consorcio. |

#### GET /Consorcios/:idConsorcio/consorcio — Datos del Consorcio

Muestra un conjunto de datos del Consorcio que tengamos seleccionado.

- **Version:** 1.0.0
- **Operation ID:** ObtieneDatosConsorcio
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/consorcios/consorcio`
- **Source:** v1/recursos/consorcios.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| nombre | String | Yes | Nombre del Consorcio. |
| nombreCorto | String | Yes | Siglas del Consorcio. |
| direccion | String | Yes | Dirección del Consorcio. |
| cp | String | Yes | Código postal del Consorcio. |
| tlf1 | String | Yes | Teléfono del Consorcio. |
| tlf2 | String | Yes | Otro teléfono del Consorcio. |
| fax | String | Yes | Fax del Consorcio. |
| email | String | Yes | Email del Consorcio. |
| web | String | Yes | Web corporativa del Consorcio. |
| cif | String | Yes | CIF del Consorcio. |
| ciudad | String | Yes | Ciudad sede del Consorcio. |
| provincia | String | Yes | Provincia sede del Consorcio. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Corredores

#### GET /Consorcios/:idConsorcio/corredores/:idCorredor/bloques — Bloques de paso

Listado de los bloques de paso del corredor. Corresponden con las columas que aparecen en el horario.

- **Version:** 1.0.0
- **Operation ID:** ObtieneBloquesCorredor
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/corredores/2/bloques`
- **Source:** v1/recursos/corredores.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idCorredor | Number | Yes | Identificador del corredor. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idBloque | Number | Yes | Identificador del bloque de paso. |
| idCorredor | Number | Yes | Identificador del corredor. |
| nombre | String | Yes | Nombre del Corredor. |
| color | String | Yes | Color de la columna del corredor. En formato web hex. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| CorredorNoEncontrado |  | Yes | El identificador del corredor idCorredor no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta CorredorNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El corredor no existe"
}
````

#### GET /Consorcios/:idConsorcio/corredores/:idCorredor — Obtiene corredor

Obtiene la información del corredor de transporte indicado.

- **Version:** 1.0.0
- **Operation ID:** ObtieneCorredor
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/corredores/2`
- **Source:** v1/recursos/corredores.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idCorredor | Number | Yes | Identificador del corredor. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idCorredor | Number | Yes | Identificador del Corredor. |
| nombre | String | Yes | Nombre del Corredor. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| CorredorNoEncontrado |  | Yes | El identificador del corredor idCorredor no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta CorredorNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El corredor no existe"
}
````

#### GET /Consorcios/:idConsorcio/corredores/ — Listado

Listado de los corredores de transporte definidos en el Consorcio.

- **Version:** 1.0.0
- **Operation ID:** ObtieneCorredores
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/corredores`
- **Source:** v1/recursos/corredores.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idCorredor | Number | Yes | Identificador del Corredor. |
| nombre | String | Yes | Nombre del Corredor. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Horarios

#### GET /Consorcios/:idConsorcio/horarios_lineas — Horario de una línea

Muestra el horario de una línea.

- **Version:** 1.0.0
- **Operation ID:** ObtieneHorarioLinea
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/horarios_lineas?dia=&frecuencia=&lang=ES&linea=44&mes=`
- **Source:** v1/recursos/horarios_lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idLinea | Number | Yes | Identificador de la línea. |
| idFrecuencia | Number | Yes | Identificador de la frecuencia. |
| dia | Number | Yes | Día de la fecha de la que se quiere obtener el horario. |
| mes | Number | Yes | Mes de la fecha de la que se quiere obtener el horario. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| planificadores | Object[] | Yes | Lista de planificadores. |
| planificadores.FechaInicio | Date | Yes | Fecha de inicio del planificador. |
| planificadores.FechaFin | Date | Yes | Fecha de fin del planificador. |
| planificadores.muestraFechaFin | Boolean | Yes | Indica si se debe mostrar la fecha fin del planificador. |
| nucleosIda | Object[] | Yes | Lista de nucleos de Ida por los que pasa la línea. |
| nucleosIda.colspan | String | Yes | Tamaño que debe ocupar la celda en horizontal. |
| nucleosIda.nombre | String | Yes | Nombre del núcleo. |
| nucleosIda.color | String | Yes | Color de fondo del bloque en hexadecimal. |
| nucleosVuelta | Object[] | Yes | Lista de nucleos de vuelta por los que pasa la línea. |
| nucleosVuelta.colspan | String | Yes | Tamaño que debe ocupar la celda en horizontal. |
| nucleosVuelta.nombre | String | Yes | Nombre del núcleo. |
| nucleosVuelta.color | String | Yes | Color de fondo del bloque en hexadecimal. |
| bloquesIda | Object[] | Yes | Lista de bloques de cabecera. |
| bloquesIda.nombre | String | Yes | Nombre del bloque. |
| bloquesIda.color | String | Yes | Color de fondo del bloque. |
| horarioIda | Object[] | Yes | Lista de horarios. |
| horarioIda.horas | String[] | Yes | Horas de paso por los distintos bloques. |
| horarioIda.frecuencia | String | Yes | Frecuencia de la linea. |
| horarioIda.observaciones | String | Yes | Observaciones de la linea en esa salida. |
| bloquesVuelta | Object[] | Yes | Lista de bloques de cabecera. |
| bloquesVuelta.nombre | String | Yes | Nombre del bloque. |
| bloquesVuelta.color | String | Yes | Color de fondo del bloque. |
| horarioVuelta | Object[] | Yes | Lista de horarios. |
| horarioVuelta.horas | String[] | Yes | Horas de paso por los distintos bloques. |
| horarioVuelta.dias | String | Yes | Frecuencia de la linea. |
| horarioVuelta.observaciones | String | Yes | Observaciones de la linea en esa salida. |
| frecuencias | Object[] | Yes | Lista de las frecuencias específicas de la línea. |
| frecuencias.idfrecuencia | String | Yes | Identificador de la frecuencia de la linea. |
| frecuencias.acronimo | String | Yes | Nombre corto de la frecuencia de la linea. |
| frecuencias.nombre | String | Yes | Nombre de la frecuencia de la linea. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| LineaIncorrecta |  | Yes | La linea idLinea no se encontro. |
| ErrorFecha |  | Yes | La fecha es incorrecta. |
| ErrorFrecuencia |  | Yes | El identificador de la frecuencia idFrecuencia es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta LineaIncorrecta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la linea debe ser un numero mayor a 0"
}
````

*Respuesta ErrorFecha:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La fecha es incorrecta"
}
````

*Respuesta FrecuenciaIncorrecta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la frecuencia debe ser un numero mayor que 0"
}
````

#### GET /Consorcios/:idConsorcio/horarios_origen_destino — Horarios de las líneas entre un núcleo de origen y un núcleo de destino determinado

Muestra las líneas existentes entre 2 núcleos (uno de origen y uno de destino) que deben ser distintos.

- **Version:** 1.0.0
- **Operation ID:** ObtieneHorarioOrigenDestino
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/horarios_origen_destino?destino=46&lang=ES&origen=1`
- **Source:** v1/recursos/horarios_origen_destino.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idNucleoOrigen | Number | Yes | Identificador del núcleo de origen. |
| idNucleoDestino | Number | Yes | Identificador del núcleo de destino. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| bloques | Object[] | Yes | Lista de los bloques de paso de cabecera. |
| bloques.nombre | String | Yes | Nombre del bloque de paso. |
| bloques.color | String | Yes | Color de fondo del bloque de paso. |
| horario | Object[] | Yes | Lista de los horarios. |
| horario.idlinea | String | Yes | Identificador de la línea. |
| horario.codigo | String | Yes | Código de la línea. |
| horario.horas | String | Yes | Hora de paso de la línea. |
| horario.dias | String | Yes | Frecuencia de las horas de paso de la línea. |
| horario.observaciones | String | Yes | Observaciones para el servicio de la línea. |
| frecuencias | Object[] | Yes | Frecuencias Lista de las frecuencias del corredor. |
| frecuencias.idfrecuencia | String | Yes | Identificador de la frecuencia del corredor. |
| frecuencias.acronimo | String | Yes | Nombre corto de la frecuencia del corredor. |
| frecuencias.nombre | String | Yes | Nombre de la frecuencia del corredor. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorOrigen |  | Yes | El identificador del nucleo de origen origen no se encontro. |
| ErrorDestino |  | Yes | El identificador del nucleo de destino destino no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorOrigen:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo de origen es incorrecto"
}
````

*Respuesta ErrorDestino:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo de destino es incorrecto"
}
````

#### GET /Consorcios/:idConsorcio/horarios_corredor — Horarios de las líneas de un corredor

Muestra los horarios de un corredor.

- **Version:** 1.0.0
- **Operation ID:** ObtieneHorariosCorredores
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/horarios_corredor?corredor=4&lang=ES`
- **Source:** v1/recursos/horarios_corredor.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idCorredor | Number | Yes | Identificador del corredor. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| bloquesIda | Object[] | Yes | Lista de los bloques de paso de ida. |
| bloquesIda.nombre | String | Yes | Nombre del bloque de paso del corredor. |
| bloquesIda.color | String | Yes | Color de fondo del bloque de paso del corredor. |
| horarioIda | Object[] | Yes | Lista de los horarios de ida. |
| horarioIda.idlinea | String | Yes | Nombre del bloque de paso del corredor. |
| horarioIda.codigo | String | Yes | Color de fondo del bloque de paso del corredor. |
| horarioIda.horas | String | Yes | Color de fondo del bloque de paso del corredor. |
| horarioIda.dias | String | Yes | Color de fondo del bloque de paso del corredor. |
| horarioIda.observaciones | String | Yes | Color de fondo del bloque de paso del corredor. |
| frecuencias | Object[] | Yes | Lista de las frecuencias del corredor. |
| frecuencias.idfrecuencia | String | Yes | Identificador de la frecuencia del corredor. |
| frecuencias.acronimo | String | Yes | Nombre corto de la frecuencia del corredor. |
| frecuencias.nombre | String | Yes | Nombre de la frecuencia del corredor. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| CorredorNoEncontrado |  | Yes | El identificador del corredor idCorredor no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta CorredorNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El corredor no existe"
}
````


### Idiomas

#### GET /Consorcios/:idConsorcio/idiomas — Idiomas del Consorcio

Listado de idiomas disponibles del Consorcio.

- **Version:** 1.0.0
- **Operation ID:** ObtieneIdiomas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/idiomas`
- **Source:** v1/recursos/idiomas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idiomasConsorcio | Object[] | Yes | Listado de idiomas. |
| idiomasConsorcio.id | Number | Yes | Identificador del Idioma. |
| idiomasConsorcio.cod | String | Yes | Acrónimo del idioma. |
| idiomasConsorcio.nombre | String | Yes | Nombre del Idioma. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Lineas

#### GET /Consorcios/:idConsorcio/:idLinea — Datos de una línea

Muestra información de una línea dada, como su código, nombre, modo de transporte, operadores ...

- **Version:** 1.0.0
- **Operation ID:** DetalleLinea
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/lineas/177`
- **Source:** v1/recursos/lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idLinea | Number | Yes | Identificador de la linea. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLinea | Number | Yes | Identificador de la linea relacionada con la noticia. |
| codigo | String | Yes | Código de la línea. |
| nombre | String | Yes | Nombre de la línea. |
| modo | String | Yes | Nombre del modo de transporte de la línea. |
| operadores | String | Yes | Lista de operadores de la linea separados por comas. |
| hayNoticias | Boolean | Yes | Indica si hay noticias referentes a la linea. |
| termometroIda | String | Yes | URL que contiende el termómetro de ida de la línea. |
| termometroVuelta | String | Yes | URL que contiende el termómetro de vuelta de la línea. |
| polilinea | String | Yes | Listado de puntos que componen el recorrido de la línea, cada punto esta formado por latitud y longitud. |
| grosor | Number | Yes | Grosor de la línea que se usa para pintar el recorrido dado por polilinea. |
| color | Number | Yes | Color de la línea que se usa para pintar el recorrido dado por polilinea, en hexadecimal. |
| tieneIda | Boolean | Yes | Indica si la línea tiene sentido de ida. |
| tieneVuelta | Boolean | Yes | Indica si la línea tiene sentido de vuelta. |
| pmr | Number | Yes | Indica si la línea esta o no adaptada a Personas con Movilidad Reducida. |
| concesion | Number | Yes | Indica la concesión de la línea. |
| observaciones | String | Yes | Observaciones de la línea. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| LineaIncorrecta |  | Yes | La linea idLinea no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta LineaIncorrecta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la linea debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/lineas/:codigo — Datos de una línea, por su código

Muestra información de una línea dada por su código, como su el nombre, si tiene noticias, el modo de transporte ...

- **Version:** 1.0.0
- **Operation ID:** DetalleLineaCodigo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/lineas/codigo/M1-10`
- **Source:** v1/recursos/lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| codigo | String | Yes | Código de la línea. No sensible a mayúsculas. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLinea | Number | Yes | Identificador de la linea relacionada con la noticia. |
| codigo | String | Yes | Código de la línea. |
| nombre | String | Yes | Nombre de la línea. |
| modo | String | Yes | Nombre del modo de transporte de la línea. |
| operadores | String | Yes | Lista de operadores de la linea separados por comas. |
| hayNoticias | Boolean | Yes | Indica si hay noticias referentes a la linea. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/infoLineas/:idLineas — Datos de varias líneas, dados por su identificador

Muestra información de varias línea dada por su identificador, como su el nombre, si tiene noticias, el modo de transporte ...

- **Version:** 1.0.0
- **Operation ID:** DetalleLineasIdentificador
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/4/lineas/infoLineas/177/188/191/198?lang=ES`
- **Source:** v1/recursos/lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idLineas | String | Yes | Identificadores de las líneas. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLinea | Number | Yes | Identificador de la linea relacionada con la noticia. |
| codigo | String | Yes | Código de la línea. |
| nombre | String | Yes | Nombre de la línea. |
| modo | String | Yes | Nombre del modo de transporte de la línea. |
| operadores | String | Yes | Lista de operadores de la linea separados por comas. |
| hayNoticias | Boolean | Yes | Indica si hay noticias referentes a la linea. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/corredores/:idLinea/bloques — Bloques de paso

Listado de los bloques de paso de una línea. Corresponden con las columas que aparecen en el horario.

- **Version:** 1.0.0
- **Operation ID:** ObtieneBloquesLinea
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/lineas/177/bloques?sentido=1`
- **Source:** v1/recursos/lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idLinea | Number | Yes | Identificador de la linea. |
| sentido | Number | Yes | Sentido de la línea (1=IDA, 2=VUELTA). |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idBloque | Number | Yes | Identificador del bloque de paso. |
| idLinea | Number | Yes | Identificador de la línea. |
| sentido | Number | Yes | Sentido de la línea. |
| nombre | String | Yes | Nombre del bloque de paso. |
| color | String | Yes | Color de la columna del corredor. En formato web hex. |
| orden | Number | Yes | Orden del bloque de paso. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorSentido |  | Yes | El sentido de la linea sentido no se encontro. |
| LineaIncorrecta |  | Yes | La linea idLinea no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorSentido:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El sentido de la linea debe ser un numero, 1 o 2"
}
````

*Respuesta LineaIncorrecta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la linea debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/lineas — Lineas del consorcio

Muestra todas las líneas activas del Consorcio, si se rellenan la latitud y longitud nos dará las líneas cercanas a esa posición

- **Version:** 1.0.0
- **Operation ID:** ObtieneLineas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/lineas`
- **Source:** v1/recursos/lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| latitud | String | Yes | Latitud en grados decimales, si se rellena este parámetro también se debe rellenar la longitud. |
| longitud | String | Yes | Longitud en grados decimales, si se rellena este parámetro también se debe rellenar la latitud. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLinea | Number | Yes | Identificador de la linea. |
| idModo | Number | Yes | Identificador del modo de transporte. |
| codigo | String | Yes | Codigo de la linea. |
| nombre | String | Yes | Nombre de la linea. |
| modo | String | Yes | Nombre del modo de transporte.. |
| operadores | String | Yes | Lista de operadores de la linea. |
| hay_noticias | Boolean | Yes | Indica si hay noticias referentes a la linea. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorLatitud |  | Yes | La latitud lat es incorrecta. |
| ErrorLongitud |  | Yes | La latitud long es incorrecta. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorLatitud:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La latitud no es correcta, debe ser un numero "
}
````

*Respuesta ErrorLongitud:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La longitud no es correcta, debe ser un numero "
}
````

#### GET /Consorcios/:idConsorcio/modostransporte/:idModo/lineas — Listado de líneas por modo de transporte

Listado de líneas por modo de transporte, con opción de filtrar por municipio y núcleo

- **Version:** 1.0.0
- **Operation ID:** ObtieneLineasPorModo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/modostransporte/1/lineas`
- **Source:** v1/recursos/modostransporte.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idModo | Number | Yes | Identificador del modo de transporte. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLinea | Number | Yes | Identificador de la linea relacionada con la noticia. |
| codigo | String | Yes | Código de la línea. |
| nombre | String | Yes | Nombre de la línea. |
| modo | String | Yes | Nombre del modo de transporte de la línea. |
| idModo | Number | Yes | Identificador del modo de transporte. |
| operadores | String | Yes | Lista de operadores de la linea separados por comas. |
| hayNoticias | Boolean | Yes | Indica si hay noticias referentes a la linea. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| idNucleo | Number | Yes | Identificador del nucleo. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdNucleo |  | Yes | El identificador del nucleo nucleo no se encontro. |
| ErrorIdMunicipio |  | Yes | El identificador del municipio municipio no se encontro. |
| ErrorIdModo |  | Yes | El Modo con el identificador idModo es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdNucleo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo es incorrecto, debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdMunicipio:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del municipio es incorrecto, debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdModo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del modo debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/lineas — Listado de líneas por municipios y núcleo

Listado de líneas por municipios y núcleo, además se puede filtrar por el modo de transporte

- **Version:** 1.0.0
- **Operation ID:** ObtieneLineasPorMunicipioPorNucleo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/municipios/10/nucleos/3/lineas?idModo=1`
- **Source:** v1/recursos/municipios.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idModo | Number | Yes | Identificador del modo de transporte. |
| nucleos | Number | Yes | Identificador del núcleo. |
| municipios | Number | Yes | Identificador del municipio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLinea | Number | Yes | Identificador de la linea relacionada con la noticia. |
| codigo | String | Yes | Código de la línea. |
| nombre | String | Yes | Nombre de la línea. |
| modo | String | Yes | Nombre del modo de transporte de la línea. |
| idModo | Number | Yes | Identificador del modo de transporte. |
| operadores | String | Yes | Lista de operadores de la linea separados por comas. |
| hayNoticias | Boolean | Yes | Indica si hay noticias referentes a la linea. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| idNucleo | Number | Yes | Identificador del nucleo. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdNucleo |  | Yes | El identificador del nucleo nucleo no se encontro. |
| ErrorIdMunicipio |  | Yes | El identificador del municipio municipio no se encontro. |
| ErrorIdModo |  | Yes | El Modo con el identificador idModo es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdNucleo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo es incorrecto, debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdMunicipio:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del municipio es incorrecto, debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdModo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del modo debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/nucleos/:idNucleo/lineas — Listado de lineas por nucleo

Muestra un listado de líneas filtrado por núcleo.

- **Version:** 1.0.0
- **Operation ID:** ObtieneLineasPorNucleo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/nucleos/51/lineas`
- **Source:** v1/recursos/nucleos.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idNucleo | Number | Yes | Identificador del núcleo. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLinea | Number | Yes | Identificador de la linea. |
| idModo | Number | Yes | Identificador del modo de transporte. |
| codigo | String | Yes | Codigo de la linea. |
| nombre | String | Yes | Nombre de la linea. |
| modo | String | Yes | Nombre del modo de transporte.. |
| operadores | String | Yes | Lista de operadores de la linea. |
| hay_noticias | Boolean | Yes | Indica si hay noticias referentes a la linea. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorNucleo |  | Yes | El nucleo idNucleo es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorNucleo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/lineas/:idLinea/paradas — Paradas de una línea

Listado de las paradas de una línea.

- **Version:** 1.0.0
- **Operation ID:** ObtieneParadasLinea
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/lineas/44/paradas`
- **Source:** v1/recursos/lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idLinea | Number | Yes | Identificador de la linea. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idParada | Number | Yes | Identificador de la parada. |
| idLinea | Number | Yes | Identificador de la línea. |
| idNucleo | Number | Yes | Identificador del núcleo al que pertenece la parada. |
| idZona | String | Yes | Identificador de la zona a la que pertenece la parada. |
| latitud | String | Yes | Latitud de la parada. |
| longitud | Number | Yes | Longitud de la parada. |
| nombre | Number | Yes | Nombre la parada. |
| sentido | Number | Yes | Sentido de la parada. |
| orden | Number | Yes | Orden de la parada, dentro del itinerario de la línea. |
| modos | Number | Yes | Modos de transporte soportados por la parada (autobús, tren, barco ...). |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| LineaIncorrecta |  | Yes | La linea idLinea no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta LineaIncorrecta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la linea debe ser un numero mayor a 0"
}
````


### Lugares_de_interes

#### GET /Consorcios/:idConsorcio/lugares_interes/:idLugar — Datos del lugar de interés

Datos del lugar de interes con identificador idLugar.

- **Version:** 1.0.0
- **Operation ID:** ObtieneLugarInteres
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/lugares_interes/56`
- **Source:** v1/recursos/lugares_interes.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idLugar | Number | Yes | Identificador del lugar de interes. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLugar | Number | Yes | Identificador del lugar de interes. |
| idMunicipio | String | Yes | Identificador del municipio donde se situa el lugar de interes. |
| municipio | String | Yes | Nombre del municipio donde se situa el lugar de interes. |
| idCat | String | Yes | Identificador del tipo de categoría del lugar de interes del que se trata. |
| tipo | String | Yes | Tipo de lugar de interes del que se trata. |
| nombre | String | Yes | Nombre del lugar de interes. |
| latitud | String | Yes | Latitud del lugare de interes. |
| longitud | String | Yes | Longitud del lugar de interes. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdLugar |  | Yes | El identificador del lugar de interes idLugar no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdLugar:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del lugar de interes debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/lugares_interes/:idLugar — Lista de lugares de interes de un tipo y de un municipio

Lista de lugares de interés dado el identificador de un tipo de lugar y un municipio.

- **Version:** 1.0.0
- **Operation ID:** ObtieneLugarInteresPorTipoPorMunicipio
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/lugares_interes/56`
- **Source:** v1/recursos/tipos_lugares_interes.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idCat | Number | Yes | Identificador de la categoría del lugar de interes. |
| idMunicipio | Number | Yes | Identificador del municipio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLugar | Number | Yes | Identificador del lugar de interes. |
| idMunicipio | String | Yes | Identificador del municipio donde se situa el lugar de interes. |
| municipio | String | Yes | Nombre del municipio donde se situa el lugar de interes. |
| idCat | String | Yes | Identificador del tipo de categoría del lugar de interes del que se trata. |
| tipo | String | Yes | Tipo de lugar de interes del que se trata. |
| nombre | String | Yes | Nombre del lugar de interes. |
| x | String | Yes | Latitud del lugare de interes. |
| y | String | Yes | Longitud del lugar de interes. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdCat |  | Yes | El identificador del tipo de lugar de interes idCat no se encontro. |
| ErrorIdMunicipio |  | Yes | El identificador del municipio municipio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdCat:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del tipo de lugar de interes debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdMunicipio:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del municipio es incorrecto, debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/lugares_interes — Listado de lugares de interés del Consorcio

Listado de los lugares de interés del Consorcio.

- **Version:** 1.0.0
- **Operation ID:** ObtieneLugaresInteres
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/municipios/10/lugares_interes`
- **Source:** v1/recursos/lugares_interes.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLugar | Number | Yes | Identificador del lugar de interes. |
| idMunicipio | String | Yes | Identificador del municipio donde se situa el lugar de interes. |
| municipio | String | Yes | Nombre del municipio donde se situa el lugar de interes. |
| idCat | String | Yes | Identificador del tipo de categoría del lugar de interes del que se trata. |
| tipo | String | Yes | Tipo de lugar de interes del que se trata. |
| nombre | String | Yes | Nombre del lugar de interes. |
| latitud | String | Yes | Latitud del lugare de interes. |
| longitud | String | Yes | Longitud del lugar de interes. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/municipios/:idMunicipio/lugares_interes — Lista de lugares de interés de un municipio y un tipo

Lista de lugares de interes de un Municipio y un tipo determinado.

- **Version:** 1.0.0
- **Operation ID:** ObtieneLugaresInteresPorTipoPorMunicipio
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/municipios/10/lugares_interes`
- **Source:** v1/recursos/municipios.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idTipo | Number | Yes | Identificador de la categoría del lugar de interes. |
| idMunicipio | Number | Yes | Identificador del municipio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLugar | Number | Yes | Identificador del lugar de interes. |
| idMunicipio | String | Yes | Identificador del municipio donde se situa el lugar de interes. |
| municipio | String | Yes | Nombre del municipio donde se situa el lugar de interes. |
| idCat | String | Yes | Identificador del tipo de categoría del lugar de interes del que se trata. |
| tipo | String | Yes | Tipo de lugar de interes del que se trata. |
| nombre | String | Yes | Nombre del lugar de interes. |
| latitud | String | Yes | Latitud del lugare de interes. |
| longitud | String | Yes | Longitud del lugar de interes. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdCat |  | Yes | El identificador del tipo de lugar de interes idCat no se encontro. |
| ErrorIdMunicipio |  | Yes | El identificador del municipio municipio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdCat:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del tipo de lugar de interes debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdMunicipio:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del municipio es incorrecto, debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/tipos_lugares_interes/:idCat — Datos del tipo de lugar de interés

Datos del tipo de lugar de interés por el identificador de la categoría

- **Version:** 1.0.0
- **Operation ID:** ObtieneTipoLugarInteres
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/tipos_lugares_interes/10?lang=ES`
- **Source:** v1/recursos/tipos_lugares_interes.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idCat | Number | Yes | Identificador del tipo de lugar. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idCat | Number | Yes | Identificador del tipo de lugar de interes. |
| nombre | String | Yes | Nombre del tipo de lugar de interes. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdCat |  | Yes | El identificador del tipo de lugar de interes idCat no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdCat:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del tipo de lugar de interes debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/tipos_lugares_interes/ — Tipos de lugares de interés

Listado de los tipos de lugares de interés del Consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneTiposLugaresInteres
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/tipos_lugares_interes?lang=ES`
- **Source:** v1/recursos/tipos_lugares_interes.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idCat | Number | Yes | Identificador del tipo de lugar de interes. |
| nombre | String | Yes | Nombre del tipo de lugar de interes. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Modos_de_transporte

#### GET /Consorcios/:idConsorcio/modostransporte — Modos de transporte

Listado de los distintos modos de transporte del Consorcio.

- **Version:** 1.0.0
- **Operation ID:** ObtieneModosTransporte
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/modostransporte?lang=ES`
- **Source:** v1/recursos/modostransporte.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idModo | Number | Yes | Identificador del modo de transporte. |
| descripcion | String | Yes | Descripcion del modo de transporte. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/modostransporte/:id — Modo Modos de transporte con identificador

Datos de un modo de transporte dado un idenficiador de modo.

- **Version:** 1.0.0
- **Operation ID:** ObtieneModosTransportePorIdModo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/modostransporte/1?lang=ES`
- **Source:** v1/recursos/modostransporte.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idModo | Number | Yes | Identificador del modo de transporte. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idModo | Number | Yes | Identificador del modo de transporte. |
| descripcion | String | Yes | Descripcion del modo de transporte. |
| autobus | Boolean | Yes | Identificador del modo de transporte. |
| barco | Boolean | Yes | Identificador del modo de transporte. |
| tren | Boolean | Yes | Identificador del modo de transporte. |
| tranvia | Boolean | Yes | Identificador del modo de transporte. |
| metro | Boolean | Yes | Identificador del modo de transporte. |
| bici | Boolean | Yes | Identificador del modo de transporte. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdModo |  | Yes | El Modo con el identificador idModo es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdModo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del modo debe ser un numero mayor a 0"
}
````


### Municipios

#### GET /Consorcios/:idConsorcio/municipios/:id — Datos de un municipio

Devuelve los datos de un municipio dado el identificador del mismo

- **Version:** 1.0.0
- **Operation ID:** ObtieneMunicipio
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/municipios/1`
- **Source:** v1/recursos/municipios.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idMunicipio | Number | Yes | Identificador del municipio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idMunicipio | Number | Yes | Identificador del municipio. |
| datos | String | Yes | Nombre del municipio. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdMunicipio |  | Yes | El identificador del municipio municipio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdMunicipio:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del municipio es incorrecto, debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/municipios/ — Lista de municipios

Listado de los municipios de un Consorcio.

- **Version:** 1.0.0
- **Operation ID:** ObtieneMunicipios
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/municipios/`
- **Source:** v1/recursos/municipios.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idMunicipio | Number | Yes | Identificador del municipio. |
| datos | String | Yes | Nombre del municipio. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Noticias

#### GET /Consorcios/:idConsorcio/categorias_noticias — Categorías de las noticias

Listado de las distintas categorías que puede tener una noticia

- **Version:** 1.0.0
- **Operation ID:** CategoríaNoticias
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/categorias_noticias`
- **Source:** v1/recursos/categorias_noticias.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idCategoria | Number | Yes | Identificador de la categoría de noticias. |
| nombre | String | Yes | Nombre de la categoría de noticias. |

#### GET /Consorcios/:idConsorcio/noticias/:idNoticia — Detalles de una noticia

Devuelve los detalles de una noticia.

- **Version:** 1.0.0
- **Operation ID:** DetallesNoticia
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/noticias/27`
- **Source:** v1/recursos/noticias.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idNoticia | Number | Yes | Identificador de la noticia. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idNoticia | Number | Yes | Identificador de la noticia. |
| idLinea | Number | Yes | Identificador de la linea relacionada con la noticia. |
| idCategoria | Number | Yes | Identificador de la categoría de la noticia. |
| titulo | String | Yes | Titulo de la noticia. |
| subTitulo | String | Yes | Subtitulo de la noticia. |
| tituloEng | String | Yes | Titulo de la noticia, cuando el idioma es EN. |
| subtituloEng | String | Yes | Subtitulo de la noticia, cuando el idioma es EN . |
| textoEng | String | Yes | Cuerpo de la noticia, cuando el idioma es EN. |
| resumenEng | String | Yes | Resumen de la noticia, cuando el idioma es EN. |
| resumen | String | Yes | Resumen de la noticia. |
| texto | String | Yes | Cuerpo de la noticia. |
| fechaInicio | Date | Yes | Fecha de inicio de la noticia. |
| fechaFin | Date | Yes | Fecha de fin de la noticia. |
| fechaFinFija | Date | Yes | Fecha de fin fija de la noticia. |
| novedad | Boolean | Yes | Indica si la noticia es una novedad. |
| categoria | String | Yes | Nombre de la categoria de la noticia. |
| orden | Number | Yes | Orden de la noticia. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| NoticiaNoEncontrada |  | Yes | El identificador de la noticia idNoticia no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta NoticiaNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La noticia no existe"
}
````

#### GET /Consorcios/:idConsorcio/categorias_noticias/:idCategoria/noticias — Noticias filtradas por parámetros

Muestra un listado de noticias dependiendo de los parametros pasados (línea,categoría,fecha de inicio o fecha fin)

- **Version:** 1.0.0
- **Operation ID:** NoticiasCategoria
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/categorias_noticias`
- **Source:** v1/recursos/categorias_noticias.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idCategoria | Number | Yes | Identificador de la categoría de la cual queremos saber sus noticias. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idLinea | Number | Yes | Identificador de la línea. |
| fechaIni | Number | Yes | Fecha Inicio de la busqueda, formato (YYYY-DD-MM). |
| fechaFin | Number | Yes | Fecha fin de la busqueda, formato (YYYY-DD-MM). |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idNoticia | Number | Yes | Identificador de la noticia. |
| idLinea | Number | Yes | Identificador de la linea relacionada con la noticia. |
| idCategoria | Number | Yes | Identificador de la categoría de la noticia. |
| titulo | String | Yes | Titulo de la noticia. |
| subtitulo | String | Yes | Subtitulo de la noticia. |
| titulo_eng | String | Yes | Titulo de la noticia, cuando el idioma es EN. |
| subtitulo_eng | String | Yes | Subtitulo de la noticia, cuando el idioma es EN . |
| resumen_eng | String | Yes | Resumen de la noticia, cuando el idioma es EN. |
| resumen | String | Yes | Resumen de la noticia. |
| fechaInicio | Date | Yes | Fecha de inicio de la noticia. |
| fechaFin | Date | Yes | Fecha de fin de la noticia. |
| fechaFinFija | Date | Yes | Fecha de fin fija de la noticia. |
| novedad | Boolean | Yes | Indica si la noticia es una novedad. |
| categoria | String | Yes | Nombre de la categoria de la noticia. |
| orden | Number | Yes | Orden de la noticia. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| CategoriaIncorrecta |  | Yes | La categoria idCategoria no se encontro. |
| ErrorFechaInicio |  | Yes | La fecha de inicio fechaIni es incorrecta. |
| ErrorFechaFin |  | Yes | La fecha de fin fechaFin es incorrecta. |
| LineaIncorrecta |  | Yes | La linea idLinea no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorCategoria:*:

````
HTTP/1.1 404 Not Found
{
  "error": "Categoria incorrecta, la categoria debe ser un numero mayor que 0"
}
````

*Respuesta ErrorFechaIni:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La fecha de inicio es incorrecta"
}
````

*Respuesta ErrorFechaFin:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La fecha de inicio es incorrecta"
}
````

*Respuesta LineaIncorrecta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la linea debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/lineas/:idLinea/noticias — Noticias de una linea

Lista de las noticias de una linea determinada.

- **Version:** 1.0.0
- **Operation ID:** NoticiasLinea
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/lineas/55/noticias`
- **Source:** v1/recursos/lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idLinea | Number | Yes | Identificador de la linea. |
| idCategoria | Number | Yes | Identificador de la categoria de noticias. |
| fechaIni | Date | Yes | Fecha Inicio de la busqueda en formato YYYY-MM-DD. |
| fechaFin | Date | Yes | Fecha fin de la busqueda en formato YYYY-MM-DD. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idNoticia | Number | Yes | Identificador de la noticia. |
| idLinea | Number | Yes | Identificador de la linea relacionada con la noticia. |
| idCategoria | Number | Yes | Identificador de la categoría de la noticia. |
| titulo | String | Yes | Titulo de la noticia. |
| subTitulo | String | Yes | Subtitulo de la noticia. |
| resumen | String | Yes | Resumen de la noticia. |
| tituloEng | String | Yes | Titulo de la noticia, cuando el idioma es EN. |
| subtituloEng | String | Yes | Subtitulo de la noticia, cuando el idioma es EN . |
| resumenEng | String | Yes | Resumen de la noticia, cuando el idioma es EN. |
| fechaInicio | Date | Yes | Fecha de inicio de la noticia. |
| fechaFin | Date | Yes | Fecha de fin de la noticia. |
| fechaFinFija | Date | Yes | Fecha de fin fija de la noticia. |
| novedad | Boolean | Yes | Indica si la noticia es una novedad. |
| categoria | String | Yes | Nombre de la categoria de la noticia. |
| orden | Number | Yes | Orden de la noticia. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| CategoriaIncorrecta |  | Yes | La categoria idCategoria no se encontro. |
| ErrorFechaInicio |  | Yes | La fecha de inicio fechaIni es incorrecta. |
| ErrorFechaFin |  | Yes | La fecha de fin fechaFin es incorrecta. |
| LineaIncorrecta |  | Yes | La linea idLinea no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorCategoria:*:

````
HTTP/1.1 404 Not Found
{
  "error": "Categoria incorrecta, la categoria debe ser un numero mayor que 0"
}
````

*Respuesta ErrorFechaIni:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La fecha de inicio es incorrecta"
}
````

*Respuesta ErrorFechaFin:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La fecha de inicio es incorrecta"
}
````

*Respuesta LineaIncorrecta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la linea debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/noticias — Lista de noticias

Listado de todas las noticias asociadas a un consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneNoticias
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/noticias?lang=ES`
- **Source:** v1/recursos/noticias.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idNoticia | Number | Yes | Identificador de la noticia. |
| lineas | Number | Yes | Identificadores de la lineas relacionadas con la noticia. |
| idCategoria | Number | Yes | Identificador de la categoría de la noticia. |
| tituloEng | String | Yes | Titulo de la noticia. |
| subTituloEng | String | Yes | Subtitulo de la noticia. |
| titulo_eng | String | Yes | Titulo de la noticia, cuando el idioma es EN. |
| subtitulo_eng | String | Yes | Subtitulo de la noticia, cuando el idioma es EN . |
| resumenEng | String | Yes | Resumen de la noticia, cuando el idioma es EN. |
| resumen | String | Yes | Resumen de la noticia. |
| fechaInicio | Date | Yes | Fecha de inicio de la noticia. |
| fechaFin | Date | Yes | Fecha de fin de la noticia. |
| fechaFinFija | Date | Yes | Fecha de fin fija de la noticia. |
| novedad | Boolean | Yes | Indica si la noticia es una novedad. |
| categoria | String | Yes | Nombre de la categoria de la noticia. |
| orden | Number | Yes | Orden de la noticia. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/infoLineasNoticias/:idLineas — Lista de noticias dados los identificadores de varias líneas

Listado de todas las noticias asociadas a varias líneas

- **Version:** 1.0.0
- **Operation ID:** ObtieneNoticiasPorLineas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/4/lineas/infoLineasNoticias/55/177`
- **Source:** v1/recursos/lineas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |
| idCategoria | Number | Yes | Identificador de la categoria de noticias. |
| fechaIni | Date | Yes | Fecha Inicio de la busqueda en formato YYYY-MM-DD. |
| fechaFin | Date | Yes | Fecha fin de la busqueda en formato YYYY-MM-DD. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idNoticia | Number | Yes | Identificador de la noticia. |
| lineas | Number | Yes | Identificadores de la lineas relacionadas con la noticia. |
| idCategoria | Number | Yes | Identificador de la categoría de la noticia. |
| tituloEng | String | Yes | Titulo de la noticia. |
| subTituloEng | String | Yes | Subtitulo de la noticia. |
| titulo_eng | String | Yes | Titulo de la noticia, cuando el idioma es EN. |
| subtitulo_eng | String | Yes | Subtitulo de la noticia, cuando el idioma es EN . |
| resumenEng | String | Yes | Resumen de la noticia, cuando el idioma es EN. |
| resumen | String | Yes | Resumen de la noticia. |
| fechaInicio | Date | Yes | Fecha de inicio de la noticia. |
| fechaFin | Date | Yes | Fecha de fin de la noticia. |
| fechaFinFija | Date | Yes | Fecha de fin fija de la noticia. |
| novedad | Boolean | Yes | Indica si la noticia es una novedad. |
| categoria | String | Yes | Nombre de la categoria de la noticia. |
| orden | Number | Yes | Orden de la noticia. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| CategoriaIncorrecta |  | Yes | La categoria idCategoria no se encontro. |
| ErrorFechaInicio |  | Yes | La fecha de inicio fechaIni es incorrecta. |
| ErrorFechaFin |  | Yes | La fecha de fin fechaFin es incorrecta. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorCategoria:*:

````
HTTP/1.1 404 Not Found
{
  "error": "Categoria incorrecta, la categoria debe ser un numero mayor que 0"
}
````

*Respuesta ErrorFechaIni:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La fecha de inicio es incorrecta"
}
````

*Respuesta ErrorFechaFin:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La fecha de inicio es incorrecta"
}
````


### Nucleos

#### GET /Consorcios/:idConsorcio/nucleos/:idNucleo — Datos de un nucleo

Datos de un núcleo dado su identificador

- **Version:** 1.0.0
- **Operation ID:** ObtieneNucleo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/nucleos/51`
- **Source:** v1/recursos/nucleos.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idNucleo | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| idZona | String | Yes | Zona a la que pertenece el núcleo. |
| nombre | String | Yes | Nombre del núcleo. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdNucleo |  | Yes | El identificador del nucleo nucleo no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdNucleo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo es incorrecto, debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/nucleos — Lista de nucleos

Listado de los núcleos de un Consorcio.

- **Version:** 1.0.0
- **Operation ID:** ObtieneNucleos
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/nucleos`
- **Source:** v1/recursos/nucleos.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| idZona | String | Yes | Zona a la que pertenece el núcleo. |
| nombre | String | Yes | Nombre del núcleo. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos — Lista de nucleos de un municipio

Devuelve una lista con los núcleos de un municipio dado

- **Version:** 1.0.0
- **Operation ID:** ObtieneNucleosPorMunicipio
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/nucleos`
- **Source:** v1/recursos/municipios.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idMunicipio | Number | Yes | Identificador del municipio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idMunicipio | Number | Yes | Identificador del municipio. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| nombre | String | Yes | Nombre del nucleo. |
| idZona | String | Yes | Nombre del municipio. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdMunicipio |  | Yes | El identificador del municipio municipio no se encontro. |
| ErrorIdNucleo |  | Yes | El identificador del nucleo nucleo no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdMunicipio:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del municipio es incorrecto, debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdNucleo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo es incorrecto, debe ser un numero mayor a 0"
}
````


### Paradas

#### GET /Consorcios/:idConsorcio/infoParadas/:idParadas — Información de paradas

Devuelve una lista con información de las paradas pasadas

- **Version:** 1.0.0
- **Operation ID:** ObtieneInformacionParadas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/paradas/infoParadas/56/81/96`
- **Source:** v1/recursos/paradas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idParadas | Number | Yes | Lista con los identificadores de paradas separados por "/" |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idParada | Number | Yes | Identificador de la parada. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| idZona | Number | Yes | Identificador de la zona a la que pertenece la parada. |
| nombre | String | Yes | Nombre de la parada. |
| latitud | Number | Yes | Coordenada de latitud de la parada. |
| longitud | Number | Yes | Coordenada de longitud de la parada. |
| observaciones | String | Yes | Observaciones asociadas a la parada. |
| principal | Number | Yes | ¿Parada principal de un grupo de paradas? 1 - Si 0 - No. |
| inactiva | Number | Yes | ¿Parada inactiva? 1 - Si 0 - No. |
| municipio | String | Yes | Nombre del municipio. |
| nucleo | String | Yes | Nombre del núcleo. |
| correspondecias | String | Yes | Correspondencia de la paradas con las líneas. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdParada |  | Yes | El identificador de la parada idParada es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdParada:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la parada debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/lineasPorParadas/:idParadas — Lista de líneas que pasan por paradas

Devuelve una lista con las líneas que pasan por todas y cada una de las paradas dadas

- **Version:** 1.0.0
- **Operation ID:** ObtieneLineasPorParadas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/4/paradas/lineasPorParadas/625/627?lang=ES`
- **Source:** v1/recursos/paradas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idParadas | Number | Yes | Lista con los identificadores de paradas separados por "/" |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idLinea | Number | Yes | Identificador de la linea. |
| codigo | String | Yes | Codigo de la linea. |
| nombre | String | Yes | Nombre de la linea. |
| descripcion | String | Yes | Nombre del modo de transporte. |
| prioridad | Number | Yes | Número de servicios de la línea. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdParada |  | Yes | El identificador de la parada idParada es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdParada:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la parada debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/paradas/:idParada — Datos de una parada

Datos de una parada dado su identificador

- **Version:** 1.0.0
- **Operation ID:** ObtieneParada
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/paradas/56`
- **Source:** v1/recursos/paradas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idParada | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idParada | Number | Yes | Identificador de la parada. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| idZona | Number | Yes | Identificador de la zona a la que pertenece la parada. |
| nombre | String | Yes | Nombre de la parada. |
| latitud | Number | Yes | Coordenada de latitud de la parada. |
| longitud | Number | Yes | Coordenada de longitud de la parada. |
| descripcion | String | Yes | Descripción de la parada, nos da más información acerca de la parada o su situación. |
| observaciones | String | Yes | Observaciones de la parada que aparecen en los horarios. |
| principal | Number | Yes | Indica si se debe mostrar la parada en los combos del cálculo de rutas, se usa sobre todo para diferenciar paradas enfrentadas y que tienen el mismo nombre, de esa forma el sistema tiene en cuenta ambas paradas, aunque solo aparezca una sola en los combos. |
| inactiva | Number | Yes | Indica si la parada está activa y debe tenerse en cuenta para todo el sistema de horarios, cálculo de rutas ... 1=inactiva 0=activa. |
| municipio | Number | Yes | Nombre del municipio. |
| nucleo | Number | Yes | Nombre del núcleo. |
| correspondecias | String | Yes | Muestra una lista separadas con comas de todas las líneas que contienen esta parada. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdParada |  | Yes | El identificador de la parada idParada es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdParada:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la parada debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/paradas/ — Lista de paradas del Consorcio

Devuelve una lista con las paradas del Consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneParadas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/paradas?lat=&long=`
- **Source:** v1/recursos/paradas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| latitud | Number | Yes | Latitud de la localizacion del usuario |
| longitud | Number | Yes | Longitud de la localizacion del usuario |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idParada | Number | Yes | Identificador de la parada. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idZona | Number | Yes | Identificador de la zona a la que pertenece la parada. |
| nombre | String | Yes | Nombre de la parada. |
| latitud | Number | Yes | Coordenada de latitud de la parada. |
| longitud | Number | Yes | Coordenada de longitud de la parada. |
| modos | String | Yes | Modos de transporte de la parada. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| municipio | Number | Yes | Nombre del municipio. |
| nucleo | Number | Yes | Nombre del núcleo. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorLongitud |  | Yes | La latitud long es incorrecta. |
| ErrorLatitud |  | Yes | La latitud lat es incorrecta. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorLongitud:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La longitud no es correcta, debe ser un numero "
}
````

*Respuesta ErrorLatitud:*:

````
HTTP/1.1 404 Not Found
{
  "error": "La latitud no es correcta, debe ser un numero "
}
````

#### GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/paradas — Listado de paradas por municipios y núcleo

Listado de paradas por municipios y núcleo

- **Version:** 1.0.0
- **Operation ID:** ObtieneParadasPorMunicipioPorNucleo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/municipios/1/nucleos/1/paradas`
- **Source:** v1/recursos/municipios.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idParada | Number | Yes | Identificador de la parada. |
| idNucleo | Number | Yes | Identificador del nucleo. |
| idZona | String | Yes | Codigo de la zona. |
| nombre | String | Yes | Nombre de la parada. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorNucleo |  | Yes | El nucleo idNucleo es incorrecto. |
| ErrorIdMunicipio |  | Yes | El identificador del municipio municipio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorNucleo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdMunicipio:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del municipio es incorrecto, debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/nucleos/:idNucleo/paradas — Listado de paradas por nucleo

Muestra un listado de paradas filtrado por núcleo.

- **Version:** 1.0.0
- **Operation ID:** ObtieneParadasPorNucleo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/nucleos/51/paradas`
- **Source:** v1/recursos/nucleos.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idNucleo | Number | Yes | Identificador del núcleo. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idParada | Number | Yes | Identificador de la parada. |
| idNucleo | Number | Yes | Identificador del nucleo. |
| idZona | String | Yes | Codigo de la zona. |
| nombre | String | Yes | Nombre de la parada. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorNucleo |  | Yes | El nucleo idNucleo es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorNucleo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/zonas/idZona/paradas — Paradas por zona

Lista de paradas por zona

- **Version:** 1.0.0
- **Operation ID:** ObtieneParadasZona
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/zonas/A/paradas`
- **Source:** v1/recursos/zonas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idZona | String | Yes | Identificador de la zona. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idParada | Number | Yes | Identificador de la parada. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idZona | Number | Yes | Identificador de la zona a la que pertenece la parada. |
| nombre | String | Yes | Nombre de la parada. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/paradas/:idParada/servicios — Servicios que pasan por un parada

Servicios que pasan por un parada a un hora determinada, si no se selecciona ninguna, por defecto se escoge la hora del sistema.

- **Version:** 1.0.0
- **Operation ID:** ObtieneServiciosPorParada
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/paradas/55/servicios?horaIni=09-11-2015+11:10`
- **Source:** v1/recursos/paradas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idParada | Number | Yes | Identificador del Consorcio. |
| horaIni | date | Yes | Hora usada para la búsqueda, debe tener el siguiente formato: DD-MM-YYYY+HH:MM. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| servicios | Object[] | Yes | Listado de los servicios que pasan por dicha parada. |
| servicios.idParada | Number | Yes | Identificador de la parada. |
| servicios.idLinea | Number | Yes | Identificador de la línea a la que pertenece el servicio. |
| servicios.servicio | String | Yes | Muestra la hora de paso del servicio por esa parada. |
| servicios.nombre | String | Yes | Nombre de la línea a la que pertenece el servicio. |
| servicios.linea | String | Yes | Código de la línea a la que pertenece el servicio. |
| servicios.sentido | Number | Yes | Sentido de la línea a la que pertenece el servicio, 1=IDA, 2=VUELTA. |
| servicios.destino | String | Yes | Núcleo de destino de la línea a la que pertenece el servicio. |
| servicios.tipo | Number | Yes | Indica el tipo de parada, 0=NORMAL (SUBIDA / BAJADA) 1=SOLO SUBIDA 2=SOLO BAJADA . |
| horaIni | date | Yes | Indica la hora inicial que se ha pasado para búsqueda de servicios en formato YYYY-MM-DD HH:MM . |
| horaFin | date | Yes | Indica hata que hora se tiene en cuenta la búsqueda de servicios en formato YYYY-MM-DD HH:MM. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdParada |  | Yes | El identificador de la parada idParada es incorrecto. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdParada:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador de la parada debe ser un numero mayor a 0"
}
````


### PoliticaPrivacidad

#### GET /Consorcios/:idConsorcio/politica_privacidad — Politica Privacidad

Devuelve el texto de política de privacidad del Consorcio.

- **Version:** 1.0.0
- **Operation ID:** PoliticaPrivacidad
- **Permissions:** Todos
- **Source:** v1/recursos/politica_privacidad.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| txtPrivacidad | String | Yes | Texto de política de privacidad del Consorcio. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Puntos_de_venta

#### GET /Consorcios/:idConsorcio/puntos_venta — Datos de un punto de venta

Datos de un punto de venta dado su identificador

- **Version:** 1.0.0
- **Operation ID:** ObtienePuntoVenta
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/puntos_venta/126?lang=ES`
- **Source:** v1/recursos/puntos_venta.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idPunto | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idComercio | Number | Yes | Identificador de la parada. |
| idTipo | Number | Yes | Identificador del núcleo. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| municipio | Number | Yes | Nombre del municipio. |
| nucleo | Number | Yes | Nombre del núcleo. |
| tipo | Number | Yes | Tipo de punto de venta (Estanco, kiosco, taquilla ...). |
| direccion | String | Yes | Dirección del punto de venta. |
| latitud | Number | Yes | Coordenada de latitud del punto de venta. |
| longitud | Number | Yes | Coordenada de longitud del punto de venta. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdPuntoVenta |  | Yes | El identificador del punto de venta idPunto no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdPuntoVenta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del punto de venta debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/puntos_venta — Lista de puntos de venta del Consorcio

Devuelve una lista con los puntos de venta del Consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtienePuntosVenta
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/puntos_venta?lang=ES`
- **Source:** v1/recursos/puntos_venta.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idComercio | Number | Yes | Identificador de la parada. |
| idTipo | Number | Yes | Identificador del núcleo. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| municipio | Number | Yes | Nombre del municipio. |
| nucleo | Number | Yes | Nombre del núcleo. |
| tipo | Number | Yes | Tipo de punto de venta (Estanco, kiosco, taquilla ...). |
| direccion | String | Yes | Dirección del punto de venta. |
| latitud | Number | Yes | Coordenada de latitud del punto de venta. |
| longitud | Number | Yes | Coordenada de longitud del punto de venta. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/puntos_venta — Lista de puntos de venta por municipio,nucleo y tipo

Devuelve un listado de puntos de venta filtrado por municipio y núcleo, adicionalmente se le puede pasar también el tipo

- **Version:** 1.0.0
- **Operation ID:** ObtienePuntosVentaMunicipioNucleo
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/puntos_venta`
- **Source:** v1/recursos/puntos_venta.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idTipo | Number | Yes | Idenficador del tipo de comercio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idComercio | Number | Yes | Identificador de la parada. |
| idTipo | Number | Yes | Identificador del núcleo. |
| idNucleo | Number | Yes | Identificador del núcleo. |
| idMunicipio | Number | Yes | Identificador del municipio. |
| municipio | Number | Yes | Nombre del municipio. |
| nucleo | Number | Yes | Nombre del núcleo. |
| tipo | Number | Yes | Tipo de punto de venta (Estanco, kiosco, taquilla ...). |
| direccion | String | Yes | Dirección del punto de venta. |
| latitud | Number | Yes | Coordenada de latitud del punto de venta. |
| longitud | Number | Yes | Coordenada de longitud del punto de venta. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorIdMunicipio |  | Yes | El identificador del municipio municipio no se encontro. |
| ErrorIdNucleo |  | Yes | El identificador del nucleo nucleo no se encontro. |
| ErrorIdTipoPuntoVenta |  | Yes | El identificador del tipo de punto de venta idTipo no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorIdMunicipio:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del municipio es incorrecto, debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdNucleo:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo es incorrecto, debe ser un numero mayor a 0"
}
````

*Respuesta ErrorIdTipoPuntoVenta:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del tipo de punto de venta debe ser un numero mayor a 0"
}
````

#### GET /Consorcios/:idConsorcio/puntos_venta — Tipos de puntos de venta

Listado de los tipos de puntos de venta del Consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneTiposPuntosVenta
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/tipos_puntos_venta?lang=ES`
- **Source:** v1/recursos/tipos_puntos_venta.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idTipocomercio | Number | Yes | Identificador del tipo de venta la parada. |
| descripcion | String | Yes | Nombre del tipo de punto de venta. |
| esTaquilla | Boolean | Yes | Indica si el comercio o punto de venta es una taquilla. |
| consorcio | Boolean | Yes | Indica si el comercio es externo al Consorcio, o sea que no está ubicado dentro del Consorcio. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Saltos

#### GET /Consorcios/:idConsorcio/saltos — Saltos entre zonas

Lista de los saltos entre zonas

- **Version:** 1.0.0
- **Operation ID:** ObtieneSaltos
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/saltos`
- **Source:** v1/recursos/saltos.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| origen | Number | Yes | Identificador de la zona origen. |
| destino | String | Yes | Identificador de la zona destino. |
| saltos | Boolean | Yes | Numero de saltos entre origen y destino. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/calculo_saltos/ — Saltos entre núcleos

Calcula los saltos entre núcleos

- **Version:** 1.0.0
- **Operation ID:** SatosNucleos
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/saltos`
- **Source:** v1/recursos/calculo_saltos.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| origen | Number | Yes | Identificador del Núcleo de origen. |
| destino | Number | Yes | Identificador del Núcleo de destino. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| saltos | Number | Yes | Número de saltos entre los núcleos. |
| error | String | Yes | Mensaje de error, solo aparece cuando se devuelve -1 en saltos. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |
| ErrorOrigen |  | Yes | El identificador del nucleo de origen origen no se encontro. |
| ErrorDestino |  | Yes | El identificador del nucleo de destino destino no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

*Respuesta ErrorOrigen:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo de origen es incorrecto"
}
````

*Respuesta ErrorDestino:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El identificador del nucleo de destino es incorrecto"
}
````


### Tarifas

#### GET /Consorcios/:idConsorcio/tarifas_interurbanas — Tarifas Interurbanas

Devuelve las tarifas interurbanas del consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneTarifasInterurbanas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/tarifas_interurbanas`
- **Source:** v1/recursos/tarifas_interurbanas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| saltos | Number | Yes | Numero de saltos. |
| bs | Number | Yes | Billete sencillo. |
| tarjeta | Number | Yes | Tarjeta. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

#### GET /Consorcios/:idConsorcio/tarifas_urbanas — Tarifas Urbanas

Devuelve las tarifas urbanas del consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneTarifasUrbanas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/tarifas_urbanas`
- **Source:** v1/recursos/tarifas_urbanas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| nombre | String | Yes | Nombre del nucleo. |
| tu | Number | Yes | Tarifa con transbordo desde un modo interurbano. |
| importeUsuario | Number | Yes | Tarifa sin transbordo desde un modo interurbano. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````


### Zonas

#### GET /Consorcios/:idConsorcio/zonas — Zonas

Lista de las zonas del Consorcio

- **Version:** 1.0.0
- **Operation ID:** ObtieneZonas
- **Permissions:** Todos
- **Examples:** Ejemplo de uso: `http://api.ctan.es/v1/Consorcios/7/zonas`
- **Source:** v1/recursos/zonas.php

**Parameters**

**Parameter**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idConsorcio | Number | Yes | Identificador del Consorcio. |
| lang | String | Yes | Identificador del idioma, puede ser 'ES' o 'EN', por defecto es 'EN'. |

**Success responses**

**Success 200**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| idZona | Number | Yes | Identificador de la zona. |
| nombre | Number | Yes | Nombre de la zona. |
| color | Number | Yes | Color que representa a la zona. |

**Error responses**

**Error 4xx**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| ConsorcioNoEncontrado |  | Yes | El identificador del Consorcio idConsorcio no se encontro. |

*Respuesta ConsorcioNoEncontrado:*:

````
HTTP/1.1 404 Not Found
{
  "error": "El Consorcio no existe"
}
````

## Data combination opportunities

The workflows below highlight how to chain endpoints for richer features. Use them alongside the parameter index that follows to identify compatible payloads.

- **Stop to route timeline**: `paradas` ➝ `lineasPorParadas` ➝ `lineas/:idLinea/paradas` ➝ `horarios_lineas` for the days and frequencies associated with each service.
- **Municipality explorer**: `municipios` ➝ `municipios/:idMunicipio/nucleos` ➝ `nucleos/:idNucleo/paradas` ➝ `paradas/:idParada/servicios` for real-time departures.
- **Line-oriented planning**: `lineas` ➝ `lineas/:idLinea/paradas` ➝ `horarios_lineas` ➝ `noticias` for operational alerts.
- **Point of sale lookup**: `puntos_venta` with filters from `municipios` and `tipos_lugares_interes` to present localized ticket offices or top-up locations.

### Parameter-to-endpoint index

- **codigo**: GET /Consorcios/:idConsorcio/lineas/:codigo
- **destino**: GET /Consorcios/:idConsorcio/calculo_saltos/
- **dia**: GET /Consorcios/:idConsorcio/horarios_lineas
- **fechaFin**: GET /Consorcios/:idConsorcio/categorias_noticias/:idCategoria/noticias, GET /Consorcios/:idConsorcio/infoLineasNoticias/:idLineas, GET /Consorcios/:idConsorcio/lineas/:idLinea/noticias
- **fechaIni**: GET /Consorcios/:idConsorcio/categorias_noticias/:idCategoria/noticias, GET /Consorcios/:idConsorcio/infoLineasNoticias/:idLineas, GET /Consorcios/:idConsorcio/lineas/:idLinea/noticias
- **horaIni**: GET /Consorcios/:idConsorcio/paradas/:idParada/servicios
- **idCat**: GET /Consorcios/:idConsorcio/lugares_interes/:idLugar, GET /Consorcios/:idConsorcio/tipos_lugares_interes/:idCat
- **idCategoria**: GET /Consorcios/:idConsorcio/categorias_noticias/:idCategoria/noticias, GET /Consorcios/:idConsorcio/infoLineasNoticias/:idLineas, GET /Consorcios/:idConsorcio/lineas/:idLinea/noticias
- **idConsorcio**: GET /Consorcios/:idConsorcio/:idLinea, GET /Consorcios/:idConsorcio/abreviaturas, GET /Consorcios/:idConsorcio/att_usuario, GET /Consorcios/:idConsorcio/calculo_saltos/, GET /Consorcios/:idConsorcio/categorias_noticias, GET /Consorcios/:idConsorcio/categorias_noticias/:idCategoria/noticias, GET /Consorcios/:idConsorcio/configuracion, GET /Consorcios/:idConsorcio/consorcio, GET /Consorcios/:idConsorcio/consorcios, GET /Consorcios/:idConsorcio/corredores/, GET /Consorcios/:idConsorcio/corredores/:idCorredor, GET /Consorcios/:idConsorcio/corredores/:idCorredor/bloques, GET /Consorcios/:idConsorcio/corredores/:idLinea/bloques, GET /Consorcios/:idConsorcio/frecuencias, GET /Consorcios/:idConsorcio/horarios_corredor, GET /Consorcios/:idConsorcio/horarios_lineas, GET /Consorcios/:idConsorcio/horarios_origen_destino, GET /Consorcios/:idConsorcio/idiomas, GET /Consorcios/:idConsorcio/infoLineas/:idLineas, GET /Consorcios/:idConsorcio/infoLineasNoticias/:idLineas, GET /Consorcios/:idConsorcio/infoParadas/:idParadas, GET /Consorcios/:idConsorcio/lineas, GET /Consorcios/:idConsorcio/lineas/:codigo, GET /Consorcios/:idConsorcio/lineas/:idLinea/noticias, GET /Consorcios/:idConsorcio/lineas/:idLinea/paradas, GET /Consorcios/:idConsorcio/lineasPorParadas/:idParadas, GET /Consorcios/:idConsorcio/lugares_interes, GET /Consorcios/:idConsorcio/lugares_interes/:idLugar, GET /Consorcios/:idConsorcio/modostransporte, GET /Consorcios/:idConsorcio/modostransporte/:id, GET /Consorcios/:idConsorcio/modostransporte/:idModo/lineas, GET /Consorcios/:idConsorcio/municipios/, GET /Consorcios/:idConsorcio/municipios/:id, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/lugares_interes, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/lineas, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/paradas, GET /Consorcios/:idConsorcio/noticias, GET /Consorcios/:idConsorcio/noticias/:idNoticia, GET /Consorcios/:idConsorcio/nucleos, GET /Consorcios/:idConsorcio/nucleos/:idNucleo, GET /Consorcios/:idConsorcio/nucleos/:idNucleo/lineas, GET /Consorcios/:idConsorcio/nucleos/:idNucleo/paradas, GET /Consorcios/:idConsorcio/paradas/, GET /Consorcios/:idConsorcio/paradas/:idParada, GET /Consorcios/:idConsorcio/paradas/:idParada/servicios, GET /Consorcios/:idConsorcio/politica_privacidad, GET /Consorcios/:idConsorcio/puntos_venta, GET /Consorcios/:idConsorcio/saltos, GET /Consorcios/:idConsorcio/tarifas_interurbanas, GET /Consorcios/:idConsorcio/tarifas_urbanas, GET /Consorcios/:idConsorcio/tipos_lugares_interes/, GET /Consorcios/:idConsorcio/tipos_lugares_interes/:idCat, GET /Consorcios/:idConsorcio/zonas, GET /Consorcios/:idConsorcio/zonas/idZona/paradas
- **idCorredor**: GET /Consorcios/:idConsorcio/corredores/:idCorredor, GET /Consorcios/:idConsorcio/corredores/:idCorredor/bloques, GET /Consorcios/:idConsorcio/horarios_corredor
- **idFrecuencia**: GET /Consorcios/:idConsorcio/horarios_lineas
- **idLinea**: GET /Consorcios/:idConsorcio/:idLinea, GET /Consorcios/:idConsorcio/categorias_noticias/:idCategoria/noticias, GET /Consorcios/:idConsorcio/corredores/:idLinea/bloques, GET /Consorcios/:idConsorcio/horarios_lineas, GET /Consorcios/:idConsorcio/lineas/:idLinea/noticias, GET /Consorcios/:idConsorcio/lineas/:idLinea/paradas
- **idLineas**: GET /Consorcios/:idConsorcio/infoLineas/:idLineas
- **idLugar**: GET /Consorcios/:idConsorcio/lugares_interes/:idLugar
- **idModo**: GET /Consorcios/:idConsorcio/modostransporte/:id, GET /Consorcios/:idConsorcio/modostransporte/:idModo/lineas, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/lineas
- **idMunicipio**: GET /Consorcios/:idConsorcio/lugares_interes/:idLugar, GET /Consorcios/:idConsorcio/modostransporte/:idModo/lineas, GET /Consorcios/:idConsorcio/municipios/:id, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/lugares_interes, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/paradas, GET /Consorcios/:idConsorcio/puntos_venta
- **idNoticia**: GET /Consorcios/:idConsorcio/noticias/:idNoticia
- **idNucleo**: GET /Consorcios/:idConsorcio/modostransporte/:idModo/lineas, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/paradas, GET /Consorcios/:idConsorcio/nucleos/:idNucleo, GET /Consorcios/:idConsorcio/nucleos/:idNucleo/lineas, GET /Consorcios/:idConsorcio/nucleos/:idNucleo/paradas, GET /Consorcios/:idConsorcio/puntos_venta
- **idNucleoDestino**: GET /Consorcios/:idConsorcio/horarios_origen_destino
- **idNucleoOrigen**: GET /Consorcios/:idConsorcio/horarios_origen_destino
- **idParada**: GET /Consorcios/:idConsorcio/paradas/:idParada, GET /Consorcios/:idConsorcio/paradas/:idParada/servicios
- **idParadas**: GET /Consorcios/:idConsorcio/infoParadas/:idParadas, GET /Consorcios/:idConsorcio/lineasPorParadas/:idParadas
- **idPunto**: GET /Consorcios/:idConsorcio/puntos_venta
- **idTipo**: GET /Consorcios/:idConsorcio/municipios/:idMunicipio/lugares_interes, GET /Consorcios/:idConsorcio/puntos_venta
- **idZona**: GET /Consorcios/:idConsorcio/zonas/idZona/paradas
- **lang**: GET /Consorcios/:idConsorcio/:idLinea, GET /Consorcios/:idConsorcio/abreviaturas, GET /Consorcios/:idConsorcio/calculo_saltos/, GET /Consorcios/:idConsorcio/categorias_noticias/:idCategoria/noticias, GET /Consorcios/:idConsorcio/frecuencias, GET /Consorcios/:idConsorcio/horarios_corredor, GET /Consorcios/:idConsorcio/horarios_lineas, GET /Consorcios/:idConsorcio/horarios_origen_destino, GET /Consorcios/:idConsorcio/infoLineas/:idLineas, GET /Consorcios/:idConsorcio/infoLineasNoticias/:idLineas, GET /Consorcios/:idConsorcio/lineas/:codigo, GET /Consorcios/:idConsorcio/lineas/:idLinea/noticias, GET /Consorcios/:idConsorcio/lugares_interes, GET /Consorcios/:idConsorcio/lugares_interes/:idLugar, GET /Consorcios/:idConsorcio/modostransporte, GET /Consorcios/:idConsorcio/modostransporte/:id, GET /Consorcios/:idConsorcio/municipios/:idMunicipio/lugares_interes, GET /Consorcios/:idConsorcio/noticias, GET /Consorcios/:idConsorcio/noticias/:idNoticia, GET /Consorcios/:idConsorcio/puntos_venta, GET /Consorcios/:idConsorcio/tipos_lugares_interes/, GET /Consorcios/:idConsorcio/tipos_lugares_interes/:idCat, GET /Consorcios/:idConsorcio/zonas
- **latitud**: GET /Consorcios/:idConsorcio/lineas, GET /Consorcios/:idConsorcio/paradas/
- **longitud**: GET /Consorcios/:idConsorcio/lineas, GET /Consorcios/:idConsorcio/paradas/
- **mes**: GET /Consorcios/:idConsorcio/horarios_lineas
- **municipios**: GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/lineas
- **nucleos**: GET /Consorcios/:idConsorcio/municipios/:idMunicipio/nucleos/:idnucleo/lineas
- **origen**: GET /Consorcios/:idConsorcio/calculo_saltos/
- **sentido**: GET /Consorcios/:idConsorcio/corredores/:idLinea/bloques

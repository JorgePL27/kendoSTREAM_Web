# Cómo actualizar la web de KendoSTREAM

No hace falta saber programar. Todo lo que cambia con el tiempo está en la carpeta **`datos/`**, en archivos de texto.
Cada archivo empieza con un comentario que explica los campos. La regla de oro: **copia un bloque que ya funciona, pégalo y cambia solo el texto entre comillas.**

## Cómo editar desde GitHub (sin instalar nada)
1. Entra en tu repositorio → carpeta `datos` → abre el archivo → icono del lápiz (Edit).
2. Cambia el texto → botón verde **Commit changes**.
3. En un minuto aproximadamente la web está actualizada (refresca con Ctrl+F5).

## Errores típicos (si algo desaparece de la web, casi siempre es esto)
- Falta una **coma** entre dos bloques `{ ... },` (el último bloque no lleva coma).
- Falta cerrar unas **comillas** o hay unas comillas `"` dentro de un texto. Usa «así» para citar.
- Se ha borrado alguna llave `{` `}` o corchete `[` `]`.

---

## 1. Cuenta atrás de un evento → `datos/eventos.js`
- **Crear:** añade un bloque con la `fecha` en este formato: `"2026-10-18T10:00:00+02:00"`.
  `+02:00` = hora de verano de España; `+01:00` = hora de invierno (el cambio es el 25 de octubre de 2026).
- **Ocultar:** pon `cuentaAtras: false` (o borra el bloque). Sigue saliendo en *Noticias y eventos*.
- **Automático:** al empezar el evento pasa a «¡EN DIRECTO!» y, pasadas `duracionHoras`, desaparece sola de la portada y pasa a «Eventos pasados».
- Cuando tengas el enlace de YouTube de la retransmisión, ponlo en `enlace`: aparece un botón en la portada.
- Si hay varios eventos con cuenta atrás, se muestra el más cercano.

## 2. Noticias y novedades de portada → `datos/noticias.js`
- Añade el bloque nuevo **al principio** de la lista.
- `portada: true` → sale en la portada (máximo las 3 más recientes). `portada: false` → solo en la página de noticias.
- Para que una noticia deje de salir en portada sin borrarla: cambia a `portada: false`.

## 3. Nueva versión → `datos/novedades.js`
- Añade el bloque nuevo **al principio**. El número de esa primera versión se pone solo en todos los botones «Descargar vX.Y.Z».
- Sube el nuevo `kendostream.zip` a `descargas/` (mismo nombre, sustituyendo al anterior) **al mismo tiempo**, para que el botón y el archivo coincidan.
- Si quieres conservar versiones antiguas: súbelas a `descargas/versiones/kendostream-2.0.zip` y añade `descarga: "descargas/versiones/kendostream-2.0.zip"` en su bloque.
- Actualiza también `descargas/manual-kendostream.pdf` (mismo nombre) cuando cambie el manual.

## 4. Temas nuevos → `datos/temas.js`
1. Sube la captura a `assets/img/` (JPG, unos 1280 px de ancho; pesa menos de 200 KB).
2. Sube el zip del tema a `descargas/temas/`.
3. Añade el bloque con `incluido: false` y la ruta en `descarga`.

## 5. Colaboradores → `datos/colaboradores.js`
1. Recibes el correo de la persona o club con su ficha y su logo.
2. Sube el logo a `assets/colaboradores/` (créala si no existe).
3. Añade el bloque con sus datos. Antes de publicar, comprueba que los enlaces funcionan.

---

## Importante al subir los cambios de esta versión
- **Borra** del repositorio: `news.html`, `events.html`, `tutorials.html` (sustituidos por `noticias.html`, `novedades.html`, `instalacion.html`) y los antiguos `assets/img/comparativa-*.png` (ahora son `.jpg`, mucho más ligeros).
- **Borra también** `assets/video/demo.mp4` (86 MB): no se usa (el vídeo es de YouTube) y GitHub avisa con archivos de más de 50 MB y bloquea los de más de 100 MB.
- Mantén tal cual `CNAME` y `descargas/kendostream.zip` (este último, sustitúyelo por la versión 2.1.0 cuando esté lista).
- Las fechas y la versión que aparecen en `novedades.js` y `noticias.js` (2.1.0 / 18 de octubre) son una propuesta: revísalas.

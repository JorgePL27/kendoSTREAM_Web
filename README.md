# KendoSTREAM — Web informativa

Página estática de presentación de KendoSTREAM, pensada para publicarse
en GitHub Pages con el dominio `kendostream.com`.

## Publicarla en GitHub Pages

1. Crea un repositorio nuevo en GitHub, **público** (así GitHub Pages es
   gratuito), por ejemplo `kendostream-web`.
2. Sube todo el contenido de esta carpeta a ese repositorio (tal cual,
   sin meterlo dentro de otra carpeta — `index.html` debe quedar en la
   raíz del repositorio).
3. En el repositorio, ve a `Settings → Pages`.
4. En "Branch", elige `main` (o la rama donde lo hayas subido) y guarda.
5. Un poco más abajo, en "Custom domain", escribe `kendostream.com` y
   guarda. Esto ya está preparado en el archivo `CNAME` que incluye este
   proyecto, pero confirmarlo aquí también es necesario.
6. Ve al panel de tu proveedor de dominios (donde compraste
   kendostream.com) y añade estos registros DNS:

   ```
   Tipo A  →  185.199.108.153
   Tipo A  →  185.199.109.153
   Tipo A  →  185.199.110.153
   Tipo A  →  185.199.111.153
   Tipo CNAME  →  www  →  TU-USUARIO.github.io
   ```

   (Sustituye `TU-USUARIO` por tu nombre de usuario de GitHub. Estas 4
   direcciones IP son fijas y las mismas para cualquier web en GitHub
   Pages — no son específicas de tu cuenta.)

7. Espera a que se propague el DNS (de minutos a un par de horas).
   Vuelve a `Settings → Pages`: cuando GitHub detecte el dominio
   correctamente, aparecerá la opción "Enforce HTTPS" — actívala.

Cuando quieras publicar cambios más adelante, basta con subir los
archivos actualizados a ese mismo repositorio (sustituyendo los
antiguos) — GitHub Pages se actualiza solo, normalmente en menos de un
minuto.

## Cómo añadir fotos

Todas las imágenes viven en `assets/img/`. Para añadir una foto nueva
(por ejemplo, de una competición real ya retransmitida con
KendoSTREAM):

1. Copia el archivo de imagen a `assets/img/`.
2. En `index.html`, busca la sección donde quieras añadirla y usa:
   ```html
   <img src="assets/img/tu-foto.jpg" alt="Descripción de la foto" />
   ```
3. El `alt` (texto alternativo) no es opcional por estética — es lo que
   leen los lectores de pantalla y lo que Google indexa. Descríbela de
   verdad, no dejes el atributo vacío.

Si quieres sustituir alguna de las capturas actuales (por ejemplo,
cuando tengas fotos reales de un club usando KendoSTREAM en vez de las
capturas de ejemplo que hemos generado), simplemente reemplaza el
archivo dejando el mismo nombre, y no hace falta tocar el HTML.

## Cómo añadir el vídeo de demostración

En `index.html`, busca la sección `id="demo"` — verás un bloque
comentado con dos opciones ya escritas:

**Opción A — vídeo subido a YouTube (recomendado, más ligero):**
```html
<iframe src="https://www.youtube.com/embed/TU_ID_DE_VIDEO" allowfullscreen></iframe>
```
Sustituye `TU_ID_DE_VIDEO` por el identificador del vídeo (la parte de
la URL de YouTube después de `v=`).

**Opción B — archivo de vídeo propio:**
```html
<video controls poster="assets/img/hero-kendostream.jpg">
  <source src="assets/video/demo.mp4" type="video/mp4">
</video>
```
Coloca el archivo en `assets/video/demo.mp4` (hay más detalle sobre el
formato recomendado en `assets/video/LEE-ESTO.txt`).

Sea cual sea la opción, sustituye el `<div class="demo-placeholder">`
actual por el bloque elegido.

## Estructura del proyecto

```
kendostream-web/
├── index.html
├── style.css
├── CNAME                  ← dominio personalizado para GitHub Pages
└── assets/
    ├── img/                 capturas, logo, fondo
    └── video/               vídeo de demostración (cuando lo tengas)
```

## Sobre las imágenes actuales

Las capturas de pantalla (`hero-kendostream.jpg`,
`comparativa-clasico.jpg`, `comparativa-kendostream.jpg`,
`captura-panel.jpg`) están generadas a partir del propio código del
overlay y el panel, con datos de ejemplo — no son maquetas de diseño,
es el programa real. Puedes sustituirlas en cualquier momento por
capturas de una competición real cuando tengas alguna, sin tocar nada
más.

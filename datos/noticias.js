/* ============================================================
   NOTICIAS  —  página "Noticias y eventos" + destacados de portada
   ============================================================
   Añade una noticia copiando un bloque { ... } al PRINCIPIO de la
   lista (la más reciente arriba) y separándolo con una coma.

   Campos:
     fecha     "AAAA-MM-DD"
     tipo      "novedad" | "noticia" | "evento"   (solo cambia la etiqueta)
     titulo    Titular.
     resumen   Dos o tres frases.
     enlace    Enlace opcional ("" si no hay).
     textoEnlace  Texto del enlace (opcional).
     portada   true  -> aparece también en la página principal
                        (se muestran como máximo las 3 más recientes).
               false -> solo en la página de noticias.
   ============================================================ */
window.KS_NOTICIAS = [
    {
    fecha: "2026-10-20",
    tipo: "novedad",
    titulo: "Dos temas nuevos para el overlay: Otoño y Halloween",
    resumen: "Ya puedes descargar dos diseños nuevos para el marcador: «Otoño», estilo de naranjas y hojas caidas perfectos para la temporada, y «Halloween», para aquellas competiciones de espanto o temáticas. Se instalan copiando los archivos a la carpeta de temas, sin tocar código.",
    enlace: "temas.html",
    textoEnlace: "Ver los temas e instalarlos",
    portada: true
  },
  {
    fecha: "2026-10-19",
    tipo: "noticia",
    titulo: "Así fue la primera retransmisión con KendoSTREAM",
    resumen: "El domingo 18 de octubre se estrenó KendoSTREAM 2.1 en directo en el Campeonato de Aragón de Kendo. Aunque hubo ciertos problemas técnicos relacionados con el sonido que nos obligaron a deshabilitarlo, la retransmisión fue un éxito. Pudimos disfrutar de muchos combates de los que integrarán la selección Aragones en el próximo campeonato de España. Os dejamos el vídeo completo de campeonato. Gracias a todos los asistentes que ayudaron con toda la organización y correcto funcionamiento y a todas esas personas que os acercasteis al Streaming.",
    enlace: "https://www.youtube.com/watch?v=TU_ID",
    textoEnlace: "Ver la retransmisión",
    portada: true
  },
  {
    fecha: "2026-10-13",
    tipo: "novedad",
    titulo: "KendoSTREAM 2.1: registro de resultados y encuentros por equipos",
    resumen: "La nueva versión estará disponible para descargar desde el domingo 18 de octubre, el día en que se estrena en directo en el Campeonato de Aragón.  Incluye registro de resultados en un archivo por evento, mensaje de resultado en el overlay, suma automática en los encuentros por equipos y un organizador de torneos con equipos, listas guardables y grupos mejorados.",
    enlace: "novedades.html",
    textoEnlace: "Ver todos los cambios",
    portada: true
  }
];

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
    fecha: "2026-10-13",
    tipo: "novedad",
    titulo: "KendoSTREAM 2.1: registro de resultados y encuentros por equipos",
    resumen: "La nueva versión estará disponible para descargar desde el domingo 18 de octubre, el día en que se estrena en directo en el Campeonato de Aragón.  Incluye registro de resultados en un archivo por evento, mensaje de resultado en el overlay, suma automática en los encuentros por equipos y un organizador de torneos con equipos, listas guardables y grupos mejorados.",
    enlace: "novedades.html",
    textoEnlace: "Ver todos los cambios",
    portada: true
  }
];

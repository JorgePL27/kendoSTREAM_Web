/* ============================================================
   COLABORADORES  —  clubes y personas que crean contenido
   ============================================================
   Añade un colaborador copiando un bloque { ... } (con coma entre
   bloques). Mientras la lista esté vacía, la página muestra un
   mensaje invitando a participar.

   Campos:
     nombre       Club o persona.
     tipo         "Club" | "Federación" | "Creador de contenido" | "Diseñador"...
     lugar        Ciudad / región ("" si no procede).
     descripcion  Dos frases sobre qué hace con KendoSTREAM.
     logo         Ruta de su logo en assets/colaboradores/ ("" si no hay).
     enlaces      Lista de { texto, url }  (web, YouTube, Instagram...).
   ============================================================ */
window.KS_COLABORADORES = [
  /* Ejemplo:
  {
    nombre: "Club Ejemplo de Kendo",
    tipo: "Club",
    lugar: "Zaragoza",
    descripcion: "Retransmite sus torneos internos con KendoSTREAM.",
    logo: "assets/colaboradores/club-ejemplo.png",
    enlaces: [
      { texto: "YouTube", url: "https://youtube.com/@ejemplo" },
      { texto: "Web", url: "https://ejemplo.org" }
    ]
  }
  */
];

/* ============================================================
   TEMAS  —  galería de diseños del overlay
   ============================================================
   Para añadir un diseño nuevo: copia un bloque { ... } al final
   (con coma) y cambia los datos. Sube su imagen a assets/img/ y,
   si es descargable, su zip a descargas/temas/.

   Campos:
     nombre       Nombre del diseño.
     etiqueta     Texto pequeño sobre el nombre ("Moderno", "Club X"...).
     descripcion  Una frase.
     imagen       Ruta de la captura.
     incluido     true  -> viene en el paquete de KendoSTREAM.
                  false -> se descarga aparte.
     descarga     Ruta del zip del tema (solo si incluido es false).
     autor        Quién lo ha creado.
     desde        Primera versión de KendoSTREAM compatible ("1.3", "2.1"...).
   ============================================================ */
window.KS_TEMAS = [
  {
    nombre: "Clásico",
    etiqueta: "Predeterminado",
    descripcion: "Discreto y neutro.",
    imagen: "assets/img/comparativa-clasico.jpg",
    incluido: true,
    descarga: "",
    autor: "KendoSTREAM",
    desde: "1.0"
  },
  {
    nombre: "KendoSTREAM",
    etiqueta: "Identidad de marca",
    descripcion: "Cortes angulados, tipografía propia y estilo más profesional.",
    imagen: "assets/img/comparativa-kendostream.jpg",
    incluido: true,
    descarga: "",
    autor: "KendoSTREAM",
    desde: "1.1"
  },
  {
    nombre: "Neón",
    etiqueta: "Moderno",
    descripcion: "Estética futurista con marcos y bordes luminiscentes.",
    imagen: "assets/img/comparativa-neon.jpg",
    incluido: true,
    descarga: "",
    autor: "KendoSTREAM",
    desde: "1.3"
  },
  {
    nombre: "Samurai",
    etiqueta: "Estilo japonés",
    descripcion: "Inspirado en la caligrafía japonesa tradicional, con tinta y papel.",
    imagen: "assets/img/comparativa-samurai.jpg",
    incluido: true,
    descarga: "",
    autor: "KendoSTREAM",
    desde: "1.3"
  },
  {
    nombre: "Otoño",
    etiqueta: "Temporada",
    descripcion: "Estilo de naranjas y hojas caidas perfectos para la temporada.",
    imagen: "assets/img/comparativa-otono.jpg",
    incluido: false,
    descarga: "descargas/temas/otono.zip",
    autor: "KendoSTREAM",
    desde: "2.1"
  },
  {
    nombre: "Halloween",
    etiqueta: "Temporada",
    descripcion: "Diseño con tonos naranja y negro, ideal para competiciones temáticas.",
    imagen: "assets/img/comparativa-halloween.jpg",
    incluido: false,
    descarga: "descargas/temas/halloween.zip",
    autor: "KendoSTREAM",
    desde: "2.1"
  }
  // Ejemplo de un tema descargable aparte.
  // Ejemplo de un tema descargable aparte. Para usarlo: pon una coma tras la
  // llave "}" del último tema, y copia aquí el bloque sin las barras "//":
  //
  // {
  //   nombre: "Nombre del tema",
  //   etiqueta: "Nuevo",
  //   descripcion: "Una frase que lo describa.",
  //   imagen: "assets/img/tema-nombre.jpg",
  //   incluido: false,
  //   descarga: "descargas/temas/tema-nombre.zip",
  //   autor: "KendoSTREAM",
  //   desde: "2.1"
  // }
];

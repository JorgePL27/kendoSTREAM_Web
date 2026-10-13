/* layout.js — cabecera, pie, cuenta atrás y listas de la web de KendoSTREAM.
   Aquí NO hay que tocar nada para actualizar contenido: los textos y fechas
   se editan en la carpeta /datos (eventos.js, noticias.js, novedades.js,
   temas.js, colaboradores.js). */
(function () {
  "use strict";

  var EMAIL = "kendostream@outlook.com";
  var NOVEDADES = window.KS_NOVEDADES || [];
  var EVENTOS = window.KS_EVENTOS || [];
  var NOTICIAS = window.KS_NOTICIAS || [];
  var TEMAS = window.KS_TEMAS || [];
  var COLABORADORES = window.KS_COLABORADORES || [];

  var ULTIMA = NOVEDADES[0] || null;
  var VERSION = ULTIMA ? ULTIMA.version : "";

  /* ---------- utilidades ---------- */
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  function parse(s) {
    if (!s) return new Date(NaN);
    return s.length === 10 ? new Date(s + "T00:00:00Z") : new Date(s);
  }
  function fmtFecha(s, opciones) {
    var d = parse(s);
    if (isNaN(d)) return s || "";
    var soloDia = s.length === 10;
    var o = { day: "numeric", month: "long", year: "numeric", timeZone: soloDia ? "UTC" : "Europe/Madrid" };
    if (opciones && opciones.diaSemana) o.weekday = "long";
    var txt = d.toLocaleDateString("es-ES", o);
    if (!soloDia && !(opciones && opciones.sinHora)) {
      txt += ", " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) + " h (hora de España)";
    }
    return txt;
  }

  /* ---------- eventos ---------- */
  function estadoEvento(e, ahora) {
    var ini = parse(e.fecha).getTime();
    if (isNaN(ini)) return "pasado";
    var fin = ini + (e.duracionHoras || 8) * 3600000;
    if (ahora < ini) return "proximo";
    if (ahora <= fin) return "directo";
    return "pasado";
  }
  function eventoCuentaAtras() {
    var ahora = Date.now();
    return EVENTOS.filter(function (e) {
      return e.cuentaAtras && estadoEvento(e, ahora) !== "pasado";
    }).sort(function (a, b) { return parse(a.fecha) - parse(b.fecha); })[0] || null;
  }
  function partes(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  }
  function dos(n) { return n < 10 ? "0" + n : String(n); }

  /* ---------- cabecera y pie ---------- */
  var ENLACES = [
    ["index.html#que-es", "Qué es"],
    ["instalacion.html", "Instalación"],
    ["novedades.html", "Novedades"],
    ["noticias.html", "Noticias y eventos"],
    ["resultados.html", "Resultados"],
    ["colaboradores.html", "Colaboradores"],
    ["temas.html", "Temas"]
  ];

  function montarCabecera() {
    var cont = $("ks-cabecera");
    if (!cont) return;
    var pag = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var etiquetaDescarga = VERSION ? "Descargar v" + esc(VERSION) : "Descargar";
    var lis = ENLACES.map(function (e) {
      var archivo = e[0].split("#")[0].toLowerCase();
      var activo = archivo === pag && e[0].indexOf("#") === -1;
      return '<li><a href="' + e[0] + '"' + (activo ? ' class="activo" aria-current="page"' : "") + ">" + e[1] + "</a></li>";
    }).join("");
    cont.innerHTML =
      '<header class="cabecera">' +
      '<div class="envoltura cabecera-fila">' +
      '<a class="nav-marca" href="index.html"><img src="assets/img/logo.png" alt="" /><div>KENDO<span>STREAM</span></div></a>' +
      '<div class="cabecera-acciones">' +
      '<a class="boton boton-secundario boton-peq boton-manual" href="descargas/manual-kendostream.pdf" target="_blank" rel="noopener">Manual (PDF)</a>' +
      '<a class="boton boton-primario boton-peq" href="descargas/kendostream.zip" download>' + etiquetaDescarga + "</a>" +
      '<button class="nav-toggle" id="navToggle" aria-label="Abrir menú" aria-expanded="false">☰</button>' +
      "</div></div>" +
      '<nav class="subnav" id="subnav" aria-label="Principal"><div class="envoltura"><ul>' + lis +
      '<li class="solo-movil"><a href="descargas/manual-kendostream.pdf" target="_blank" rel="noopener">Manual (PDF)</a></li>' +
      "</ul></div></nav></header>" +
      '<div id="ks-franja"></div>';
    var btn = $("navToggle"), nav = $("subnav");
    btn.addEventListener("click", function () {
      var abierto = nav.classList.toggle("abierto");
      btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
  }

  function montarPie() {
    var cont = $("ks-pie");
    if (!cont) return;
    var enlaces = ENLACES.map(function (e) { return '<li><a href="' + e[0] + '">' + e[1] + "</a></li>"; }).join("");
    cont.innerHTML =
      "<footer>" +
      '<div class="envoltura footer-grid">' +
      '<div><div class="footer-marca"><img src="assets/img/logo.png" alt="" />KendoSTREAM</div>' +
      '<p class="footer-contacto" style="margin-top:12px;">Contacto: <a href="mailto:' + EMAIL + '">' + EMAIL + "</a></p></div>" +
      '<ul class="footer-enlaces">' + enlaces + "</ul>" +
      "</div>" +
      '<div class="envoltura"><p class="footer-nota">© 2026 Jorge Pascual Lansac. Distribuido bajo PolyForm Noncommercial License 1.0.0.</p></div>' +
      "</footer>";
  }

  /* Etiquetas con la versión actual: <span data-ks-version></span> */
  function rellenarVersion() {
    var els = document.querySelectorAll("[data-ks-version]");
    for (var i = 0; i < els.length; i++) els[i].textContent = VERSION ? "v" + VERSION : "";
  }

  /* ---------- cuenta atrás (portada) y franja (resto de páginas) ---------- */
  function montarEvento() {
    var e = eventoCuentaAtras();
    var grande = $("cuenta-atras");
    var franja = grande ? null : $("ks-franja");

    if (!e) {
      if (grande) grande.hidden = true;
      return;
    }

    if (grande) {
      grande.hidden = false;
      var lugar = e.lugar ? " · " + esc(e.lugar) : "";
      grande.innerHTML =
        '<div class="envoltura"><div class="evento-destacado"><div class="evento-cuerpo">' +
        '<div class="evento-info">' +
        '<p class="seccion-eyebrow" id="eventoEtiqueta"></p>' +
        "<h2>" + esc(e.titulo) + "</h2>" +
        '<p class="evento-meta">' + esc(fmtFecha(e.fecha, { diaSemana: true })) + lugar + "</p>" +
        (e.descripcion ? '<p class="evento-desc">' + esc(e.descripcion) + "</p>" : "") +
        (e.enlace ? '<a class="boton boton-primario" href="' + esc(e.enlace) + '" target="_blank" rel="noopener">' + esc(e.textoEnlace || "Ver más") + "</a>" : "") +
        "</div>" +
        '<div id="eventoReloj"></div>' +
        "</div></div></div>";
    }

    function pintar() {
      var ahora = Date.now();
      var st = estadoEvento(e, ahora);
      if (st === "pasado") {
        if (grande) grande.hidden = true;
        if (franja) franja.innerHTML = "";
        clearInterval(timer);
        return;
      }
      var p = partes(parse(e.fecha).getTime() - ahora);
      if (grande) {
        $("eventoEtiqueta").textContent = st === "directo" ? "Ahora mismo" : "Próximo evento";
        $("eventoReloj").innerHTML = st === "directo"
          ? '<span class="en-directo"><span class="punto-vivo" style="background:var(--carmesi)"></span>¡EN DIRECTO!</span>'
          : '<div class="cuenta" role="timer" aria-label="Cuenta atrás">' +
            bloque(p.d, "días") + bloque(p.h, "horas") + bloque(p.m, "min") + bloque(p.s, "seg") + "</div>";
      }
      if (franja) {
        var texto = st === "directo"
          ? '<span class="punto-vivo"></span>EN DIRECTO: ' + esc(e.titulo)
          : "Próximo evento: " + esc(e.titulo) + " — faltan " + (p.d ? p.d + " d " : "") + p.h + " h " + p.m + " min";
        franja.innerHTML = '<div class="franja-evento"><a href="noticias.html#eventos">' + texto + "</a></div>";
      }
    }
    function bloque(n, etq) {
      return '<div class="cuenta-bloque"><div class="cuenta-num">' + dos(n) + '</div><div class="cuenta-etq">' + etq + "</div></div>";
    }
    var timer = setInterval(pintar, 1000);
    pintar();
  }

  /* ---------- listas ---------- */
  var TIPOS = { novedad: "Novedad", noticia: "Noticia", evento: "Evento" };

  function tarjetaNoticia(n) {
    return '<article class="tarjeta">' +
      '<span class="etiqueta-tipo">' + esc(TIPOS[n.tipo] || "Noticia") + "</span>" +
      '<span class="fecha-txt">' + esc(fmtFecha(n.fecha)) + "</span>" +
      "<h3>" + esc(n.titulo) + "</h3><p>" + esc(n.resumen) + "</p>" +
      (n.enlace ? '<a class="flecha" href="' + esc(n.enlace) + '">' + esc(n.textoEnlace || "Leer más") + " →</a>" : "") +
      "</article>";
  }
  function ordenarPorFechaDesc(a, b) { return parse(b.fecha) - parse(a.fecha); }

  function montarDestacados() {
    var cont = $("destacados");
    if (!cont) return;
    var lista = NOTICIAS.filter(function (n) { return n.portada; }).sort(ordenarPorFechaDesc).slice(0, 3);
    if (!lista.length) { cont.hidden = true; return; }
    cont.hidden = false;
    $("destacadosLista").innerHTML = lista.map(tarjetaNoticia).join("");
  }

  function montarNoticias() {
    var cn = $("lista-noticias");
    if (cn) {
      var lista = NOTICIAS.slice().sort(ordenarPorFechaDesc);
      cn.innerHTML = lista.length
        ? lista.map(function (n) {
            return '<article class="item-fila"><div><span class="fecha-txt">' + esc(fmtFecha(n.fecha)) + "</span><br />" +
              '<span class="etiqueta-tipo">' + esc(TIPOS[n.tipo] || "Noticia") + "</span></div><div><h3>" + esc(n.titulo) + "</h3><p>" + esc(n.resumen) + "</p>" +
              (n.enlace ? '<a class="enlace-rojo" href="' + esc(n.enlace) + '">' + esc(n.textoEnlace || "Leer más") + " →</a>" : "") +
              "</div></article>";
          }).join("")
        : '<p class="vacio">Todavía no hay noticias.</p>';
    }
    var ahora = Date.now();
    function fila(e, clase) {
      var st = estadoEvento(e, ahora);
      return '<article class="item-fila ' + clase + '"><div><span class="fecha-txt">' + esc(fmtFecha(e.fecha, { diaSemana: true })) + "</span>" +
        (st === "directo" ? '<br /><span class="etiqueta-tipo">En directo</span>' : "") +
        (e.kendostream ? '<br /><span class="insignia verde" style="display:inline-block;margin-top:8px;">con KendoSTREAM</span>' : "") +
        "</div><div><h3>" + esc(e.titulo) + "</h3>" +
        (e.lugar ? '<p class="fecha-txt" style="margin-bottom:6px;">' + esc(e.lugar) + "</p>" : "") +
        (e.descripcion ? "<p>" + esc(e.descripcion) + "</p>" : "") +
        (e.enlace ? '<a class="enlace-rojo" href="' + esc(e.enlace) + '" target="_blank" rel="noopener">' + esc(e.textoEnlace || "Más información") + " →</a>" : "") +
        "</div></article>";
    }
    var prox = $("lista-eventos-proximos"), pas = $("lista-eventos-pasados");
    if (prox) {
      var p = EVENTOS.filter(function (e) { return estadoEvento(e, ahora) !== "pasado"; })
        .sort(function (a, b) { return parse(a.fecha) - parse(b.fecha); });
      prox.innerHTML = p.length ? p.map(function (e) { return fila(e, ""); }).join("") : '<p class="vacio">No hay eventos programados por ahora.</p>';
    }
    if (pas) {
      var q = EVENTOS.filter(function (e) { return estadoEvento(e, ahora) === "pasado"; }).sort(ordenarPorFechaDesc);
      if (q.length) pas.innerHTML = q.map(function (e) { return fila(e, "pasado"); }).join("");
      else { var cab = $("cabeceraPasados"); if (cab) cab.hidden = true; pas.hidden = true; }
    }
  }

  function montarNovedades() {
    var act = $("version-actual"), lista = $("lista-versiones");
    if (act && ULTIMA) {
      act.innerHTML =
        '<span class="etiqueta-tipo">Última versión</span>' +
        "<h2>KendoSTREAM v" + esc(ULTIMA.version) + "</h2>" +
        '<p class="fecha-txt" style="margin-bottom:10px;">' + esc(ULTIMA.fecha ? fmtFecha(ULTIMA.fecha) : "") + "</p>" +
        "<p>" + esc(ULTIMA.titulo) + "</p>" +
        '<a class="boton boton-primario" href="descargas/kendostream.zip" download>Descargar v' + esc(ULTIMA.version) + "</a>";
    }
    if (lista) {
      lista.innerHTML = NOVEDADES.map(function (v) {
        return '<div class="changelog-item"><div class="version">v' + esc(v.version) +
          (v.fecha ? "<small>" + esc(fmtFecha(v.fecha)) + "</small>" : "") + "</div><div>" +
          (v.titulo ? "<h3>" + esc(v.titulo) + "</h3>" : "") +
          "<ul>" + (v.cambios || []).map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>" +
          (v.descarga ? '<a class="enlace-rojo" href="' + esc(v.descarga) + '" download>Descargar esta versión →</a>' : "") +
          "</div></div>";
      }).join("");
    }
  }

  function montarTemas() {
    var cont = $("grid-temas");
    if (cont) {
      cont.innerHTML = TEMAS.map(function (t) {
        return '<article class="diseno-card tema-card"><img src="' + esc(t.imagen) + '" alt="Diseño ' + esc(t.nombre) + ' del overlay" loading="lazy" />' +
          '<div class="diseno-card-info"><p class="etiqueta">' + esc(t.etiqueta) + "</p><h3>" + esc(t.nombre) + "</h3><p>" + esc(t.descripcion) + "</p>" +
          '<div class="tema-meta">' +
          (t.incluido ? '<span class="insignia verde">Incluido en el paquete</span>' : '<span class="insignia">Descarga aparte</span>') +
          (t.desde ? '<span class="insignia">Desde v' + esc(t.desde) + "</span>" : "") +
          (t.autor ? "<span>por " + esc(t.autor) + "</span>" : "") + "</div>" +
          (!t.incluido && t.descarga ? '<a class="boton boton-primario boton-peq" href="' + esc(t.descarga) + '" download>Descargar tema</a>' : "") +
          "</div></article>";
      }).join("") +
        '<div class="tema-pronto"><strong>Más diseños en camino</strong><span>¿Quieres uno propio para tu club o tu torneo?</span>' +
        '<a class="enlace-rojo" href="mailto:' + EMAIL + '?subject=' + encodeURIComponent("Diseño de overlay para mi club") + '">Escríbenos →</a></div>';
    }
  }

  function montarColaboradores() {
    var cont = $("grid-colaboradores");
    if (!cont) return;
    if (!COLABORADORES.length) {
      cont.innerHTML = '<p class="vacio" style="grid-column:1/-1;">Aquí aparecerán los clubes y personas que colaboran con KendoSTREAM. ¡Puedes ser el primero!</p>';
      return;
    }
    cont.innerHTML = COLABORADORES.map(function (c) {
      return '<article class="colab-card">' +
        (c.logo ? '<img src="' + esc(c.logo) + '" alt="Logo de ' + esc(c.nombre) + '" loading="lazy" />' : "") +
        '<span class="etiqueta-tipo">' + esc(c.tipo || "Colaborador") + "</span>" +
        "<h3>" + esc(c.nombre) + "</h3>" +
        (c.lugar ? '<p class="fecha-txt">' + esc(c.lugar) + "</p>" : "") +
        "<p>" + esc(c.descripcion) + "</p>" +
        '<div class="colab-enlaces">' + (c.enlaces || []).map(function (l) {
          return '<a class="enlace-rojo" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.texto) + " ↗</a>";
        }).join("") + "</div></article>";
    }).join("");
  }

  /* Enlaces mailto con asunto y cuerpo: <a data-mailto-asunto="..." data-mailto-cuerpo="..."> */
  function montarMailto() {
    var els = document.querySelectorAll("[data-mailto-asunto]");
    for (var i = 0; i < els.length; i++) {
      var a = els[i];
      a.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(a.getAttribute("data-mailto-asunto")) +
        "&body=" + encodeURIComponent((a.getAttribute("data-mailto-cuerpo") || "").replace(/\\n/g, "\n"));
    }
  }

  function iniciar() {
    montarCabecera();
    montarPie();
    rellenarVersion();
    montarEvento();
    montarDestacados();
    montarNoticias();
    montarNovedades();
    montarTemas();
    montarColaboradores();
    montarMailto();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();

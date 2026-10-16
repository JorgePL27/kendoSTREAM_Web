/* ============================================================
   NOVEDADES  —  historial de versiones
   ============================================================
   La PRIMERA versión de la lista es "la última": su número aparece
   automáticamente en el botón "Descargar vX.Y.Z" de toda la web.

   Para publicar una versión nueva: copia un bloque { ... } al
   PRINCIPIO de la lista (con coma detrás) y cambia los datos.

   Campos:
     version   "2.1.0"
     fecha     "AAAA-MM-DD" (o "" si no la sabes)
     titulo    Frase corta que resume la versión.
     cambios   Lista de textos entre comillas, separados por comas.
     descarga  (opcional) enlace a un zip de esa versión antigua,
               p. ej. "descargas/versiones/kendostream-2.0.zip".
               La última versión siempre se descarga de
               descargas/kendostream.zip.
   ============================================================ */
window.KS_NOVEDADES = [
  {
    version: "2.1.0",
    fecha: "2026-10-18",
    titulo: "Registro de resultados, fin de combate y encuentros por equipos",
    cambios: [
      "Finalizar combate: el botón «Fin de tiempo / Combate terminado» calcula el resultado (puntos, encho, empate, hantei o victoria técnica).",
      "Mensaje de resultado en el overlay (por ejemplo «Gana Blanco (Encho)») en los cuatro diseños y en español o inglés, según el idioma del panel.",
      "Victoria técnica por incomparecencia, lesión, descalificación u otro motivo, con símbolo propio en el overlay.",
      "Hantei: decisión arbitral que fija el ganador sin añadir puntos al marcador.",
      "Deshacer el último punto o hansoku, y Reabrir el combate recién finalizado.",
      "El encho solo se activa con el marcador igualado, y el primer punto decide el combate.",
      "Registro de resultados: cada combate finalizado se guarda en un archivo JSON por evento, con copia de respaldo y aviso rojo si no se puede guardar.",
      "Carpeta de resultados configurable en /config, con botón «Probar carpeta».",
      "Encuentros por equipos de 3 o 5 integrantes (eliminatoria o grupos): las victorias, empates e ippones se suman solos, con combate de desempate.",
      "Categoría y modalidad visibles siempre mientras se registra."
    ],
    apartados: [
      {
        titulo: "Organizador de torneos (actualización de octubre de 2026)",
        grupos: [
          {
            etiqueta: "Nuevo",
            cambios: [
              "Torneos por equipos: nuevo selector Individual / Por equipos en la lista de participantes. En modo equipos se introduce el nombre del equipo (obligatorio) y el club (opcional); el campo Dan y la opción «Mostrar el Dan en el cuadro» se ocultan, porque los equipos no llevan grado.",
              "Integrantes opcionales: se pueden indicar los nombres de los integrantes de cada equipo, de 3 o de 5 (puestos Senpo a Taisho). Un equipo de 3 admite 1 hueco en blanco y uno de 5 admite 2. Si no se escribe ningún nombre, no se valida nada. Los integrantes se muestran en la lista de equipos y los huecos aparecen señalados.",
              "Los equipos sin club se muestran correctamente en el cuadro, en la clasificación de grupos y en los PDF.",
              "Guardar y cargar listas: nuevos botones «Guardar lista (.json)» y «Cargar lista (.json)» para guardar la lista de participantes y recuperarla más tarde. Se conservan el orden, el club, el Dan y las marcas de cabeza de serie (y, en equipos, el tamaño y los integrantes). Al cargar se reemplaza la lista actual, con confirmación si ya había participantes; hay mensajes claros si el archivo no es válido y aviso si trae más cabezas de serie de las permitidas.",
              "Casilla «Evitar cruces del mismo club», activada por defecto, que afecta a la primera ronda del cuadro y al reparto en grupos. Si se desactiva, el sorteo es completamente aleatorio y el cuadro indica cuántas coincidencias de club hay. En los grupos se avisa cuando una coincidencia es inevitable."
            ]
          },
          {
            etiqueta: "Mejorado",
            cambios: [
              "Fase de grupos con prioridad para los grupos de 3: por ejemplo, 12 competidores forman 4 grupos de 3 en lugar de 3 grupos de 4. Los grupos son de 4 o de 3, con un solo grupo de 2 como máximo.",
              "El número de grupos se elige para que el cuadro eliminatorio no tenga huecos: con 2 clasificados por grupo, 12 competidores pasan a un cuadro completo de 8.",
              "Los byes del cruce solo los reciben primeros de grupo. Antes, con un número de grupos que no era potencia de 2, un primero y un segundo podían pasar directos a la ronda siguiente. Si con un número concreto de participantes no se puede evitar, la aplicación lo avisa.",
              "El PDF de plantilla de grupos refleja exactamente el mismo cruce que el cuadro real."
            ]
          },
          {
            etiqueta: "Corregido",
            cambios: [
              "El Dan ya aparece en el cuadro (pantalla y PDF) cuando está activada la opción «Mostrar el Dan en el cuadro».",
              "El campo «Clasificados por grupo» ya se oculta correctamente cuando se elige eliminatoria directa."
            ]
          }
        ]
      }
    ]
  },
  {
    version: "2.0",
    fecha: "",
    titulo: "Organizador de torneos",
    cambios: [
      "Nueva sección /organizador, enlazada desde el panel junto a Configuración.",
      "Eliminatoria directa: siembra estándar en serpentina, byes priorizados a cabezas de serie (máximo 2) y esfuerzo automático para evitar coincidencias de club en la 1.ª ronda.",
      "Fase de grupos + Eliminatoria: tamaño de grupo calculado automáticamente (2-4 competidores, lo más parecido a 4 posible); nº de clasificados por grupo configurable; reparto evitando coincidencias de club y separando cabezas de serie.",
      "Cruce entre grupos por siembra en serpentina (1.º del primer grupo contra 2.º del último, etc.), de modo que dos clasificados del mismo grupo solo puedan volver a encontrarse en la Final — para cualquier número de grupos.",
      "Clasificación en vivo por grupo (victorias, luego ippones), con detección automática de empates en el corte y resolución mediante combate de desempate.",
      "Botón único «Generar Torneo»: genera y descarga el PDF del cuadro completo (eliminatoria) o de los grupos más el cruce con huecos tipo «1º Grupo A» (grupos + eliminatoria).",
      "PDF a doble ala automático para cuadros de más de 32 plazas.",
      "Los byes ya no se muestran como combate: el competidor aparece directamente en la ronda donde juega.",
      "Guardado automático del torneo en el propio servidor (data/torneo.json)."
    ]
  },
  {
    version: "1.3.1",
    fecha: "",
    titulo: "Instalación en Windows simplificada",
    cambios: [
      "Retirado instalar.bat (el instalador de doble clic para Windows): quedaba desaconsejado en la práctica por los bloqueos de Smart App Control. El método de comandos de terminal es ahora la única vía documentada para Windows.",
      "Manual actualizado: eliminada la sección del instalador de doble clic y simplificados los apartados de solución de problemas relacionados."
    ]
  },
  {
    version: "1.3",
    fecha: "",
    titulo: "Nuevos diseños",
    cambios: [
      "Nuevos diseños de overlay, «Neón» y «Samurai».",
      "Medidas del overlay actualizadas en Clásico y KendoSTREAM (fotos, logos, tipografía y elementos en general, más grandes)."
    ]
  },
  {
    version: "1.2",
    fecha: "",
    titulo: "Modo Campeonato",
    cambios: [
      "Diseño «Modo Campeonato»: categoría, modalidad, fotos de competidores y logos de club.",
      "Límite de 2 puntos por combate y marca de hansoku simplificada.",
      "Paquete de idiomas del panel (español / inglés)."
    ]
  },
  {
    version: "1.1",
    fecha: "",
    titulo: "Identidad de marca",
    cambios: [
      "Identidad de marca y segundo diseño de overlay, «KendoSTREAM».",
      "Tabla de equipos e indicador de Encho/Prórroga.",
      "Instalación en Windows por comandos de terminal, más fiable frente a antivirus."
    ]
  },
  {
    version: "1.0",
    fecha: "",
    titulo: "Primera versión",
    cambios: [
      "Primera versión: marcador, overlay, modo equipos e integración con OBS."
    ]
  }
];

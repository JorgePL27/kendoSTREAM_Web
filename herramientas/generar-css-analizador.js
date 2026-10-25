// generar-css-analizador.js
// Convierte el analizador.css de la herramienta en css/analizador.css para la web:
// antepone ".ks-analizador" a cada selector para que los estilos del analizador
// no afecten al resto de la web (ni al revés).
//
// Uso (desde la raíz de la web, con Node instalado):
//   node herramientas/generar-css-analizador.js ruta/al/analizador.css
// Sin argumento usa herramientas/analizador.original.css.
const fs = require("fs");
const path = require("path");

const entrada = process.argv[2] || path.join(__dirname, "analizador.original.css");
const salida = path.join(__dirname, "..", "css", "analizador.css");
const PREFIJO = ".ks-analizador";

let css = fs.readFileSync(entrada, "utf8");
css = css.replace(/@import\s+url\([^)]*\)\s*;/g, "");          // las fuentes ya las carga la web
css = css.replace(/\/\*[\s\S]*?\*\//g, "");         // fuera comentarios

function prefijar(selector) {
  const s = selector.trim();
  if (!s) return "";
  if (s === ":root" || s === "body" || s === "html") return PREFIJO;
  return `${PREFIJO} ${s}`;
}

let resultado = "";
const reglas = css.split("}");
for (const regla of reglas) {
  const i = regla.indexOf("{");
  if (i === -1) continue;
  const selectores = regla.slice(0, i).split(",").map(prefijar).filter(Boolean).join(",\n");
  const cuerpo = regla.slice(i + 1).trim();
  resultado += `${selectores} { ${cuerpo} }\n`;
}

const cabecera =
  "/* GENERADO con herramientas/generar-css-analizador.js a partir de analizador.css.\n" +
  "   No lo edites a mano: vuelve a generarlo cuando cambie el CSS original. */\n\n";

// Pequeño ajuste para encajar en la web (se añade aquí para sobrevivir a regenerar)
const ajustes = `
/* Ajustes de integración en la web */
${PREFIJO} { line-height: 1.45; background: transparent; }
${PREFIJO} .contenido { margin: 0 auto; padding: 0 20px; max-width: 1200px; }
${PREFIJO} .bloque { padding: 20px; }
${PREFIJO} h2, ${PREFIJO} h3, ${PREFIJO} h4 { line-height: 1.3; }
${PREFIJO} p { margin: 0; }
${PREFIJO} .ayuda { margin: 0 0 14px 0; }
${PREFIJO} button, ${PREFIJO} input, ${PREFIJO} select { font-family: inherit; }
`;

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, cabecera + resultado + ajustes);
console.log("Generado", salida);

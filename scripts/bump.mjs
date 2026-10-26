#!/usr/bin/env node
/**
 * bump.mjs <major|minor|patch> [--desc "descripcion"]
 *
 * Calcula la siguiente version, actualiza VERSION (fuente de verdad),
 * package.json (copia derivada) y TODO.md §Estado, e imprime el asunto de
 * commit listo para usar.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const type = args[0];

if (!["major", "minor", "patch"].includes(type)) {
  console.error("Uso: node bump.mjs <major|minor|patch> [--desc \"descripcion\"]");
  process.exit(1);
}

const descIdx = args.indexOf("--desc");
const desc = descIdx !== -1 ? args[descIdx + 1] ?? "" : "";

const root = process.cwd();
const versionFile = resolve(root, "VERSION");

if (!existsSync(versionFile)) {
  console.error("No existe VERSION en la raiz del repo. Ejecuta init-project.mjs primero.");
  process.exit(1);
}

const current = readFileSync(versionFile, "utf8").trim().replace(/^v/, "");
const [maj, min, pat] = current.split(".").map(Number);

if ([maj, min, pat].some(Number.isNaN)) {
  console.error(`VERSION invalido: "${current}". Debe ser semver (X.Y.Z).`);
  process.exit(1);
}

let next;
if (type === "major") next = [maj + 1, 0, 0];
else if (type === "minor") next = [maj, min + 1, 0];
else next = [maj, min, pat + 1];

const v = `v${next.join(".")}`;

writeFileSync(versionFile, `${v}\n`);

const pkgPath = resolve(root, "package.json");
if (existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.version = next.join(".");
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  } catch {
    console.warn("Aviso: package.json no es JSON valido, se omite.");
  }
}

const todoPath = resolve(root, "TODO.md");
if (existsSync(todoPath)) {
  const todo = readFileSync(todoPath, "utf8");
  const updated = todo.replace(
    /^(\s*-\s*(?:Versi[oó]n actual|Estado actual)\s*:\s*).*$/m,
    `$1\`${v}\``
  );
  if (updated !== todo) writeFileSync(todoPath, updated);
}

console.log(`\n  version -> ${v}\n`);
console.log(`  git commit -m "${v}: ${desc || "<descripcion>"}" \\`);
console.log(`             -m "Archivos:" \\`);
console.log(`             -m "- <ruta>" \\`);
console.log(`             -m "" \\`);
console.log(`             -m "Detalle:" \\`);
console.log(`             -m "- <por que>"\n`);

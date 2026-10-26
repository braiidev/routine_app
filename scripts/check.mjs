#!/usr/bin/env node
/**
 * check.mjs
 *
 * Verifica la coherencia del proyecto: VERSION <-> package.json <-> TODO.md
 * <-> ultimo commit. Sale con codigo 1 si algo no cuadra.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const problems = [];
const warnings = [];

const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

const read = (p) => (existsSync(resolve(root, p)) ? readFileSync(resolve(root, p), "utf8") : null);

// 1. VERSION
const versionRaw = read("VERSION");
if (versionRaw === null) {
  problems.push("No existe VERSION en la raiz del repo.");
} else {
  const version = versionRaw.trim();
  if (!/^v\d+\.\d+\.\d+$/.test(version)) {
    problems.push(`VERSION invalido: "${version}". Formato esperado: vX.Y.Z`);
  }

  // 2. package.json
  const pkgRaw = read("package.json");
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw);
      if (pkg.version && `v${pkg.version}` !== version) {
        problems.push(`package.json dice "${pkg.version}" pero VERSION dice "${version}".`);
      }
    } catch {
      problems.push("package.json no es JSON valido.");
    }
  }

  // 3. TODO.md
  const todo = read("TODO.md");
  if (todo === null) {
    problems.push("No existe TODO.md.");
  } else {
    const m = todo.match(/^\s*-\s*(?:Versi[oó]n actual|Estado actual)\s*:\s*`?([^`\n]+)`?/m);
    if (!m) {
      problems.push("TODO.md no tiene la linea 'Version actual' en §Estado.");
    } else if (m[1].trim() !== version) {
      problems.push(`TODO.md dice "${m[1].trim()}" pero VERSION dice "${version}".`);
    }
    const reserved = todo.match(/^\s*-\s*Siguiente versi[oó]n reservada\s*:\s*`?([^`\n]+)`?/m);
    if (reserved) {
      const rv = reserved[1].trim();
      const cmp = (a, b) => {
        const pa = a.replace(/^v/, "").split(".").map(Number);
        const pb = b.replace(/^v/, "").split(".").map(Number);
        for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
        return 0;
      };
      if (cmp(rv, version) <= 0) {
        warnings.push(`TODO.md reserva "${rv}" pero la version actual ya es "${version}". Actualiza la reserva.`);
      }
    }

    for (const section of ["Descripcion", "Estado", "Tablero", "En curso", "Siguiente", "Terminado"]) {
      const key = section === "Descripcion" ? /Descripci[oó]n/i : new RegExp(section, "i");
      if (!key.test(todo)) problems.push(`TODO.md no tiene la seccion "${section}".`);
    }
  }

  // 4. Ultimo commit
  const subject = git(["log", "-1", "--format=%s"]);
  if (subject) {
    const m = subject.match(/^(v\d+\.\d+\.\d+):/);
    if (!m) {
      problems.push(`El ultimo commit no lleva prefijo de version: "${subject}"`);
    } else if (m[1] !== version) {
      problems.push(`El ultimo commit es ${m[1]} pero VERSION dice ${version}.`);
    }
  }

}

if (problems.length) {
  console.error("\n  x  Problemas:\n");
  for (const p of problems) console.error(`     - ${p}`);
  console.error("");
  process.exit(1);
}

if (warnings.length) {
  console.warn("\n  !  Avisos:\n");
  for (const w of warnings) console.warn(`     - ${w}`);
  console.warn("");
}

console.log("  ok  Coherencia verificada.\n");

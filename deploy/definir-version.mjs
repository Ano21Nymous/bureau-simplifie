#!/usr/bin/env node
//
// Réécrit la version de l'application dans les trois fichiers qui la portent,
// et met à jour l'adresse du dépôt :
//
//   - package.json
//   - src-tauri/tauri.conf.json   (version + bundle.homepage)
//   - src-tauri/Cargo.toml
//
// Utilisé par la CI (.github/workflows/build.yml), mais utilisable à la main :
//
//   node deploy/definir-version.mjs 0.1.42 https://github.com/moi/bureau-simplifie
//
// À lancer depuis la racine du dépôt.

import { readFileSync, writeFileSync } from "node:fs";

const [, , version, depot] = process.argv;

if (!version) {
  console.error("usage : node deploy/definir-version.mjs <version> [depot]");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`version invalide : « ${version} » (attendu : 0.1.42)`);
  process.exit(1);
}

// package.json
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.version = version;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

// src-tauri/tauri.conf.json — la version du paquet vient aussi de là.
const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
conf.version = version;
if (depot) {
  // Relu par l'installateur pour configurer les mises à jour automatiques.
  conf.bundle.homepage = depot;
}
writeFileSync("src-tauri/tauri.conf.json", JSON.stringify(conf, null, 2) + "\n");

// src-tauri/Cargo.toml — uniquement la ligne « version = "…" » du paquet.
const cargo = readFileSync("src-tauri/Cargo.toml", "utf8").replace(
  /^version = ".*"$/m,
  `version = "${version}"`,
);
writeFileSync("src-tauri/Cargo.toml", cargo);

console.log(
  `version = ${version}${depot ? ` ; dépôt = ${depot}` : ""}`,
);

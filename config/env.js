// Carrega o arquivo .env SEMPRE da pasta do projeto (ao lado do index.js),
// não importa de qual pasta o servidor foi iniciado.
// Este arquivo precisa ser o PRIMEIRO import do index.js.
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const pastaProjeto = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const caminhoEnv = path.join(pastaProjeto, ".env");

if (fs.existsSync(caminhoEnv)) {
    dotenv.config({ path: caminhoEnv, override: true });
    console.log(`📄 .env carregado de: ${caminhoEnv}`);
} else {
    console.error(`⚠️ Arquivo .env NÃO encontrado em: ${caminhoEnv}`);
}

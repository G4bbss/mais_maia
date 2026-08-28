import express from "express";
import path from "path";
import session from "express-session";
import { fileURLToPath } from "url";

// Importação das rotas
import rotasCliente from "./api/clienteRotas.js";
import profissionalRotas from "./api/ProfissionalRotas.js";

// Configuração para recriar o __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = express();

// ===================== Middlewares =====================
backend.use(express.json());
backend.use(express.urlencoded({ extended: true }));

// Configuração da Sessão
backend.use(
  session({
    secret: "troque-esta-chave-em-producao",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 horas de sessão
  })
);

// Arquivos públicos (CSS, imagens, JS do front e páginas HTML)
backend.use(express.static(path.join(__dirname, "public")));

// Middleware de proteção (exige login)
function exigirLogin(req, res, next) {
  if (req.session && req.session.usuarioEmail) {
    return next();
  }
  return res.redirect("/login");
}

// ===================== Rotas das APIs (Dados JSON) =====================
backend.use("/cliente", rotasCliente);
backend.use("/usuario", rotasCliente); // Suporte para rotas atreladas a /usuario
backend.use("/api/profissionais", profissionalRotas);

// ===================== Páginas Públicas =====================
backend.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

backend.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

backend.get("/cadastro", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cadastro.html"));
});

backend.get("/verificacao", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "verificacao.html"));
});

// Página Visual de Profissionais
backend.get("/profissionais", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profissionais.html"));
});

// ===================== Páginas Protegidas =====================
backend.get("/dashboard", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

backend.get("/perfil", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "perfil.html"));
});

// Página de Agendamento (Renders agendamento.html)
backend.get("/agendamento", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "agendamento.html"));
});

// Páginas em construção
const paginasEmConstrucao = [
  "/diario",
  "/rede-apoio",
  "/telemedicina"
];

paginasEmConstrucao.forEach((rota) => {
  backend.get(rota, exigirLogin, (req, res) => {
    res.send("<h2>Página em construção 🛠️</h2>");
  });
});

// ===================== Inicialização =====================
backend.listen(3000, () => {
  console.log("🚀 Servidor rodando em http://localhost:3000");
});
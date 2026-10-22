import "./config/env.js"; // precisa ser o primeiro import (carrega o .env)

import express from "express";
import path from "path";
import session from "express-session";
import { fileURLToPath } from "url";
import { gerarResposta, modelosConfigurados, provedoresConfigurados } from "./config/gemini.js";

// Importação da conexão do banco de dados (ajuste o caminho se necessário)
import db from "./config/banco.js";

// Importação das rotas
import rotasCliente from "./api/clienteRotas.js";
import profissionalRotas from "./api/ProfissionalRotas.js";
import redeApoioRotas from "./api/redeApoioRotas.js";
import diarioRotas from "./api/diarioRotas.js";
import muralRotas from "./api/muralRotas.js";

// Configuração para recriar o __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = express();

// Verificação do carregamento da chave de API (fica só no .env, nunca no front-end)
if (!process.env.GEMINI_API_KEY) {
  console.error("⚠️ AVISO: GEMINI_API_KEY não foi encontrada no arquivo .env!");
} else {
  console.log(`🔑 GEMINI_API_KEY carregada. Serviços: ${provedoresConfigurados().join(" → ")} | Modelos: ${modelosConfigurados().join(" → ")}`);
}

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

// ===================== Contato de Apoio: SOMENTE LEITURA =====================
// O contato de apoio enxerga os dados do usuário que o cadastrou, mas nunca altera nada
// e não acessa o agendamento de consultas. Esta trava vale para todas as rotas.
const ESCRITAS_LIBERADAS_APOIO = [
  "/cliente/logout",
  "/usuario/logout",
  "/cliente/contato-apoio/login",
  "/usuario/contato-apoio/login",
  "/api/chatbot" // só conversa com a IA, não grava dados do usuário
];

// Páginas que o contato de apoio não usa (agendar, profissionais, rede de apoio e telemedicina)
const PAGINAS_BLOQUEADAS_APOIO = [
  "/agendamento", "/agendamento.html",
  "/profissionais", "/profissionais.html",
  "/redeapoio", "/redeapoio.html",
  "/telemedicina", "/telemedicina.html"
];

function somenteLeituraParaContatoApoio(req, res, next) {
  if (req.session?.tipoUsuario !== "contato_apoio") return next();

  const metodo = req.method.toUpperCase();

  if (metodo === "GET" || metodo === "HEAD" || metodo === "OPTIONS") {
    const caminho = req.path.toLowerCase();
    if (PAGINAS_BLOQUEADAS_APOIO.includes(caminho)) {
      return res.redirect("/dashboard-contato-apoio");
    }
    return next();
  }

  if (ESCRITAS_LIBERADAS_APOIO.includes(req.path)) return next();

  return res.status(403).json({
    ok: false,
    erro: "Modo somente visualização: o contato de apoio não pode alterar dados."
  });
}
backend.use(somenteLeituraParaContatoApoio);

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

backend.use("/profissional", profissionalRotas); 
backend.use("/api/profissionais", profissionalRotas);

// Rotas da API da Rede de Apoio e Chamados
backend.use("/api", redeApoioRotas);        // Mapeia /api/rede-apoio e /api/chamados
backend.use("/rede-apoio", redeApoioRotas); // Mapeia /rede-apoio/login, /rede-apoio/perfil, etc.

// Rota do Diário Emocional
backend.use("/diario", diarioRotas);

// API do Mural
backend.use("/api/mural", muralRotas);

// ===================== CHATBOT COM IA (Gemini) =====================
// Usado pelos directs (telemedicina, rede de apoio) e pela assistente Camila do painel.
// Corpo aceito: { mensagem, profissional?, especialidade?, persona?, historico? }
const limiteChatbot = new Map(); // ip -> horários das últimas requisições
function chatbotLiberado(ip) {
  const agora = Date.now();
  const recentes = (limiteChatbot.get(ip) || []).filter(t => agora - t < 60000);
  if (recentes.length >= 20) { limiteChatbot.set(ip, recentes); return false; }
  recentes.push(agora);
  limiteChatbot.set(ip, recentes);
  return true;
}

function montarInstrucaoChatbot({ profissional, especialidade, persona }) {
  if (persona === "camila") {
    return `Você é a Camila, assistente virtual empática e acolhedora da plataforma Maia (voltada para gestantes e puérperas).
Diretrizes:
- Responda em Português do Brasil, com respostas claras, humanas e focadas na saúde materna.
- Seja objetivo (no máximo 1 a 3 parágrafos curtos).
- Se a pessoa mencionar sintomas de alerta (febre alta, dores intensas, sangramentos, tonturas), oriente a buscar atendimento médico presencial imediatamente.
- Lembre, quando fizer sentido, que o chat não substitui consulta médica.`;
  }

  const nomeProf = profissional || "Profissional de Saúde Maia Care";
  const espProf = especialidade || "Saúde Materno-Infantil";
  return `Você é ${nomeProf}, especialista em ${espProf} da plataforma "Maia Care".
Você está conversando diretamente com uma paciente ou familiar pelo chat da plataforma.
Diretrizes de resposta:
- Responda em Português do Brasil com tom acolhedor, empático, seguro e profissional.
- Seja objetivo e conciso (máximo de 1 a 3 parágrafos curtos).
- Forneça orientação em saúde materno-infantil com responsabilidade, destacando que orientações de chat não substituem uma consulta presencial ou emergência médica urgente.`;
}

// Diagnóstico: abra http://localhost:3000/api/chatbot/teste no navegador do computador onde o servidor roda
backend.get("/api/chatbot/teste", async (req, res) => {
  const local = ["::1", "127.0.0.1", "::ffff:127.0.0.1"].includes(req.ip);
  if (!local) return res.status(403).json({ ok: false, erro: "Disponível apenas na máquina do servidor." });

  try {
    const resposta = await gerarResposta({
      systemInstruction: "Responda em português, em uma frase curta.",
      mensagem: "Diga olá para a plataforma Maia."
    });
    return res.json({ ok: true, resposta, modelos: modelosConfigurados() });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      status: error.status || null,
      erro: error.message,
      modelos_tentados: modelosConfigurados(),
      chave_no_env: Boolean(process.env.GEMINI_API_KEY),
      tentativas: error.falhas || []
    });
  }
});

backend.post("/api/chatbot", async (req, res) => {
  const mensagem = String(req.body?.mensagem ?? "").trim();

  if (!mensagem) {
    return res.status(400).json({ erro: "A mensagem é obrigatória.", resposta: "Escreva uma mensagem para eu poder ajudar." });
  }

  if (!chatbotLiberado(req.ip)) {
    return res.status(429).json({ erro: "Muitas mensagens em pouco tempo.", resposta: "Você enviou muitas mensagens seguidas. Aguarde um instante e tente de novo." });
  }

  try {
    const resposta = await gerarResposta({
      systemInstruction: montarInstrucaoChatbot(req.body),
      historico: req.body.historico,
      mensagem
    });

    return res.json({ resposta });
  } catch (error) {
    console.error(`❌ Erro na API do Gemini (status ${error.status || "?"}):`, error.message);
    return res.status(502).json({
      erro: error.message,
      resposta: "Olá! Tive uma breve oscilação de sinal. Pode repetir sua mensagem?"
    });
  }
});

// ===================== Páginas Públicas =====================
backend.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

backend.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

backend.get("/login-profissional", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login-profissional.html"));
});

backend.get("/login-rede-apoio", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login-rede-apoio.html"));
});

backend.get("/login-contato-apoio", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login-contato-apoio.html"));
});


backend.get("/cadastro", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cadastro.html"));
});

backend.get("/verificacao", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "verificacao.html"));
});

backend.get("/profissionais", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profissionais.html"));
});

backend.get("/painel-profissional", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "painel-profissional.html"));
});

backend.get("/painel-rede-apoio", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "painel-rede-apoio.html"));
});

backend.get("/dashboard-contato-apoio", (req, res) => {
  if (req.session?.tipoUsuario !== "contato_apoio") {
    return res.redirect("/login-contato-apoio");
  }
  res.sendFile(path.join(__dirname, "public", "dashboard-contato-apoio.html"));
});

// ===================== Páginas Protegidas =====================
backend.get("/dashboard", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

backend.get("/dashboardapoio", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});


backend.get("/perfil", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "perfil.html"));
});

backend.get("/agendamento", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "agendamento.html"));
});

backend.get("/telemedicina", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "telemedicina.html"));
});

backend.get("/mural", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "mural.html"));
});

// ===================== Inicialização =====================
const PORT = process.env.PORT || 3000;
backend.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import session from "express-session";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Importação das rotas
import rotasCliente from "./api/clienteRotas.js";
import profissionalRotas from "./api/ProfissionalRotas.js";

// Configuração para recriar o __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = express();

// Verificação do carregamento da chave de API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("⚠️ AVISO: GEMINI_API_KEY não foi encontrada no arquivo .env!");
} else {
  console.log("🔑 GEMINI_API_KEY carregada com sucesso.");
}

// Inicialização da IA com a biblioteca oficial
const genAI = new GoogleGenerativeAI(apiKey);

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

// Rota do Chatbot com IA (com tentativas automáticas em caso de oscilação)
backend.post("/api/chatbot", async (req, res) => {
  try {
    const { mensagem, profissional, especialidade } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: "A mensagem é obrigatória." });
    }

    const nomeProf = profissional || "Profissional de Saúde Maia Care";
    const espProf = especialidade || "Saúde Materno-Infantil";

    const systemInstruction = `Você é ${nomeProf}, especialista em ${espProf} da plataforma de telemedicina "Maia Care".
Você está conversando diretamente com uma paciente ou familiar pelo chat da plataforma.
Diretrizes de resposta:
- Responda em Português do Brasil com tom acolhedor, empático, seguro e profissional.
- Seja objetivo e conciso (máximo de 1 a 3 parágrafos curtos).
- Forneça orientação em saúde materno-infantil com responsabilidade, destacando que orientações de chat não substituem uma consulta presencial ou emergência médica urgente.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: systemInstruction
    });

    // Lógica de repetição automática (até 3 tentativas caso a API oscile)
    let respostaTexto = null;
    let tentativas = 0;
    const maxTentativas = 3;

    while (tentativas < maxTentativas && !respostaTexto) {
      try {
        tentativas++;
        const result = await model.generateContent(mensagem);
        const response = await result.response;
        respostaTexto = response.text();
      } catch (err) {
        console.warn(`Tentativa ${tentativas} falhou. Tentando novamente...`);
        if (tentativas >= maxTentativas) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    res.json({ resposta: respostaTexto });
  } catch (error) {
    console.error("Erro na API do Chatbot:", error);
    res.status(500).json({
      resposta: "Olá! Tive uma breve oscilação de sinal. Como posso te orientar hoje?"
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

// Página de Telemedicina
backend.get("/telemedicina", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "telemedicina.html"));
});

// Páginas em construção
const paginasEmConstrucao = [
  "/diario",
  "/rede-apoio"
];

paginasEmConstrucao.forEach((rota) => {
  backend.get(rota, exigirLogin, (req, res) => {
    res.send("<h2>Página em construção 🛠️</h2>");
  });
});

// ===================== Inicialização =====================
const PORT = process.env.PORT || 3000;
backend.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
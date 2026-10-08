import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import session from "express-session";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

backend.use("/profissional", profissionalRotas); 
backend.use("/api/profissionais", profissionalRotas);

// Rotas da API da Rede de Apoio e Chamados
backend.use("/api", redeApoioRotas);        // Mapeia /api/rede-apoio e /api/chamados
backend.use("/rede-apoio", redeApoioRotas); // Mapeia /rede-apoio/login, /rede-apoio/perfil, etc.

// Rota do Diário Emocional
backend.use("/diario", diarioRotas);

// API do Mural
backend.use("/api/mural", muralRotas);

// ===================== ROTA DO PRONTUÁRIO (SALVAR NO MYSQL) =====================
backend.post("/api/prontuarios", async (req, res) => {
  try {
    const {
      nomePaciente,
      fasePaciente,
      sintomas,
      tempoSintomas,
      nivelDor,
      alergias,
      medicamentosUso,
      orientacoes,
      idAgendamento
    } = req.body;

    // Resgata o email da sessão do usuário logado (se existir)
    const emailPaciente = req.session?.usuarioEmail || null;

    // Agrupa os campos do formulário para salvar na coluna 'anamnese'
    const anamneseText = [
      `Fase/Idade: ${fasePaciente || 'Não informado'}`,
      `Sintomas/Queixa: ${sintomas || 'Não informado'}`,
      `Tempo dos Sintomas: ${tempoSintomas || 'Não informado'}`,
      `Intensidade: ${nivelDor || 'Leve'}`,
      `Alergias: ${alergias || 'Nenhuma'}`,
      `Medicamentos em uso: ${medicamentosUso || 'Nenhum'}`
    ].join('\n');

    const condutaText = orientacoes || '';
    const dataRegistro = new Date();

    const sql = `
      INSERT INTO prontuario 
      (email_paciente, nome_paciente, anamnese, conduta, data_registro, id_agendamento) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      emailPaciente,
      nomePaciente || null,
      anamneseText,
      condutaText,
      dataRegistro,
      idAgendamento || null
    ];

    // Executa a instrução no MySQL
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("❌ Erro ao inserir prontuário no MySQL:", err);
        return res.status(500).json({ erro: "Erro ao salvar no banco de dados." });
      }

      console.log("✅ Prontuário gravado com sucesso! ID:", result.insertId);
      return res.status(201).json({
        sucesso: true,
        mensagem: "Prontuário salvo no banco de dados com sucesso!",
        idProntuario: result.insertId
      });
    });

  } catch (error) {
    console.error("❌ Erro interno no servidor ao processar prontuário:", error);
    return res.status(500).json({ erro: "Falha interna do servidor." });
  }
});

// ===================== CHATBOT COM IA =====================
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
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

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

// ===================== Páginas Protegidas =====================
backend.get("/dashboard", exigirLogin, (req, res) => {
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
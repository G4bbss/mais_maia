const express = require("express");
const router = express.Router();

const { enviarEmail } = require("./email");
const pool = require("../config/banco");

// Armazenamento em memória das consultas
let agendamentos = [];

function exigirLoginApi(req, res, next) {
  if (req.session && req.session.usuarioEmail) {
    return next();
  }
  return res.status(401).json({ erro: "Não autenticado" });
}

// ===================== Listar as consultas =====================
router.get("/", (req, res) => {
  const emailLogado = req.session?.usuarioEmail || req.query.email;
  const modalidadeFiltro = req.query.modalidade; // 'online' ou 'presencial'

  let lista = agendamentos.filter(a => a.status !== "cancelada");

  if (emailLogado) {
    lista = lista.filter(a => a.clienteEmail === emailLogado);
  }

  // Filtra por modalidade (Online / Presencial) caso solicitado pelo frontend
  if (modalidadeFiltro) {
    const termo = modalidadeFiltro.toLowerCase();
    lista = lista.filter(a => {
      const mod = String(a.modalidade || a.tipo).toLowerCase();
      return termo === "online" ? mod.includes("online") || mod.includes("telemedicina") : !mod.includes("online");
    });
  }

  lista.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  res.json(lista);
});

// ===================== Criar uma nova consulta =====================
router.post("/", (req, res) => {
  const profissional = req.body.profissional || 
                       req.body.profissional_nome || 
                       req.body.nome_profissional || 
                       req.body.medico_nome || 
                       req.body.nome_medico || 
                       req.body.nome;

  const especialidade = req.body.especialidade || 
                        req.body.esp || 
                        "Psicologia / Atendimento Especializado";

  const tipo = req.body.tipo || 
               req.body.modalidade || 
               req.body.tipo_atendimento || 
               "Presencial";

  const data = req.body.data || 
               req.body.data_consulta || 
               req.body.dataConsulta;

  const hora = req.body.hora || 
               req.body.horario || 
               req.body.horaConsulta;

  const local = req.body.local || 
                req.body.endereco || 
                (String(tipo).toLowerCase().includes("online") || String(tipo).toLowerCase().includes("telemedicina") 
                  ? "Atendimento Online (Telemedicina)" 
                  : "Clínica Maia");

  const convenio = req.body.convenio || null;
  const emailCliente = req.body.email || req.body.paciente_email || req.session?.usuarioEmail;

  if (!profissional || !data || !hora) {
    return res.status(400).json({ 
      erro: "Preencha o profissional, a data e o horário." 
    });
  }

  const idGerado = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const novaConsulta = {
    id: idGerado,
    id_agendamento: idGerado,
    id_profissional: req.body.id_profissional || req.body.idProfissional || null,
    foto: req.body.foto || "carolina.png",
    clienteEmail: emailCliente,
    paciente_nome: req.body.paciente_nome || req.body.nome || req.body.paciente || "Paciente",
    profissional,
    profissional_nome: profissional,
    especialidade,
    esp: especialidade,
    tipo, 
    modalidade: tipo,
    local,
    convenio,
    data,
    data_consulta: data,
    hora,
    horario: hora,
    status: "confirmada"
  };

  agendamentos.push(novaConsulta);
  res.status(201).json(novaConsulta);
});

// ===================== Cancelar uma consulta =====================
router.post("/:id/cancelar", async (req, res) => {
  const idBusca = req.params.id;
  
  const consulta = agendamentos.find(
    a => String(a.id) === String(idBusca) || String(a.id_agendamento) === String(idBusca)
  );

  if (!consulta) {
    return res.status(404).json({ erro: "Consulta não encontrada." });
  }

  if (consulta.status === "cancelada") {
    return res.status(400).json({ erro: "Essa consulta já estava cancelada." });
  }

  // Garantir fallback de busca do e-mail de destino
  const emailDestino = req.body.email || req.session?.usuarioEmail || consulta.clienteEmail;

  consulta.status = "cancelada";

  let nomeCliente = consulta.paciente_nome || "";

  if (emailDestino) {
    try {
      if (pool) {
        const [linhas] = await pool.execute(
          "SELECT paciente_nome AS Nome FROM usuario WHERE email = ?",
          [emailDestino]
        );
        if (linhas && linhas[0]) nomeCliente = linhas[0].Nome;
      }
    } catch (erro) {
      console.error("Erro ao buscar nome da usuária no banco:", erro.message);
    }

    const dataFormatada = consulta.data.includes("-") 
      ? consulta.data.split("-").reverse().join("/") 
      : consulta.data;

    try {
      await enviarEmail({
        para: emailDestino,
        assunto: "Cancelamento de consulta - Maia",
        texto:
          "Olá" + (nomeCliente ? ", " + nomeCliente : "") + ",\n\n" +
          "Confirmamos o cancelamento da sua consulta:\n\n" +
          "Profissional: " + consulta.profissional + "\n" +
          "Especialidade: " + consulta.especialidade + "\n" +
          "Data: " + dataFormatada + " às " + consulta.hora + "\n" +
          "Tipo: " + consulta.tipo + "\n\n" +
          "Se foi um engano, você pode agendar uma nova consulta a qualquer momento pela plataforma.\n\n" +
          "Equipe Maia"
      });
      console.log(`E-mail de cancelamento enviado com sucesso para: ${emailDestino}`);
    } catch (erro) {
      console.error("Não foi possível enviar o e-mail de cancelamento:", erro.message);
    }
  } else {
    console.warn("Aviso: E-mail de destino não fornecido para notificação de cancelamento.");
  }

  res.json({ ok: true, consulta });
});

module.exports = router;
const express = require("express");

const router = express.Router();
 
const { enviarEmail } = require("./email");

const pool = require("../config/banco");
 
// Simulação de banco de dados em memória.

// Cada agendamento pertence a uma usuária (clienteEmail).

let agendamentos = [];
 
function exigirLoginApi(req, res, next) {

  if (req.session && req.session.usuarioEmail) {

    return next();

  }

  return res.status(401).json({ erro: "Não autenticado" });

}
 
// ===================== Listar as consultas da usuária logada =====================

router.get("/", exigirLoginApi, (req, res) => {

  const minhas = agendamentos

    .filter(a => a.clienteEmail === req.session.usuarioEmail)

    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
 
  res.json(minhas);

});
 
// ===================== Criar uma nova consulta =====================

router.post("/", exigirLoginApi, (req, res) => {

  const { profissional, especialidade, tipo, local, convenio, data, hora } = req.body;
 
  if (!profissional || !especialidade || !tipo || !data || !hora) {

    return res.status(400).json({ erro: "Preencha profissional, especialidade, tipo, data e horário." });

  }
 
  const novaConsulta = {

    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),

    clienteEmail: req.session.usuarioEmail,

    profissional,

    especialidade,

    tipo, // "Presencial" ou "Telemedicina"

    local: tipo === "Presencial" ? (local || "") : null,

    convenio: convenio || null,

    data, // formato "AAAA-MM-DD"

    hora, // formato "HH:MM"

    status: "confirmada"

  };
 
  agendamentos.push(novaConsulta);

  res.status(201).json(novaConsulta);

});
 
// ===================== Cancelar uma consulta =====================

router.post("/:id/cancelar", exigirLoginApi, async (req, res) => {

  const consulta = agendamentos.find(

    a => a.id === req.params.id && a.clienteEmail === req.session.usuarioEmail

  );
 
  if (!consulta) {

    return res.status(404).json({ erro: "Consulta não encontrada." });

  }
 
  if (consulta.status === "cancelada") {

    return res.status(400).json({ erro: "Essa consulta já estava cancelada." });

  }
 
  consulta.status = "cancelada";
 
  let nomeCliente = "";

  try {

    const [linhas] = await pool.execute(

      "SELECT paciente_nome AS Nome FROM usuario WHERE email = ?",

      [req.session.usuarioEmail]

    );

    if (linhas[0]) nomeCliente = linhas[0].Nome;

  } catch (erro) {

    console.error("Não foi possível buscar o nome da usuária para o e-mail:", erro.message);

  }
 
  const dataFormatada = consulta.data.split("-").reverse().join("/");
 
  try {

    await enviarEmail({

      para: req.session.usuarioEmail,

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

  } catch (erro) {

    // O cancelamento em si já foi concluído; o e-mail é uma confirmação adicional.

    console.error("Não foi possível enviar o e-mail de cancelamento:", erro.message);

  }
 
  res.json({ ok: true, consulta });

});
 
module.exports = router;
 
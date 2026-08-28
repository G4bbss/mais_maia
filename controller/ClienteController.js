import bcrypt from "bcryptjs";
import pool from "../config/banco.js";
import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";

// --- CONFIGURAÇÕES DO GOOGLE E EMAIL ---
const GOOGLE_CLIENT_ID = "910310455755-ecuctmqtfutt440jbjebr97jdj1pgkk5.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const EMAIL_SISTEMA = "central.equipemaia@gmail.com";
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_SISTEMA,
    pass: "psok rogj tgaq wtuu"
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2"
  }
});

const emailStyle = `
    font-family: sans-serif;
    color: #3b2a25;
    border: 1px solid #eee;
    padding: 25px;
    border-radius: 12px;
    max-width: 500px;
    margin: 0 auto;
    background-color: #fdfdfd;
`;

// ===================== Cadastro de Usuário =====================
export const cadastrar = async (req, res) => {
  try {
    const { Nome, Email, Senha, DataNascimento, Fase, SemanasGestacao, Telefone, Termos, Foto } = req.body;

    if (!Nome || !Email || !Senha) {
      return res.status(400).send("Nome, e-mail e senha são obrigatórios");
    }

    const [existentes] = await pool.execute("SELECT id_usuario FROM usuario WHERE email = ?", [Email]);

    if (existentes.length > 0) {
      return res.status(400).send("E-mail já cadastrado");
    }

    const senhaCriptografada = await bcrypt.hash(Senha, 10);
    const codigoVerificacao = Math.floor(100000 + Math.random() * 900000);

    await pool.execute(
      `INSERT INTO usuario
        (paciente_nome, email, senha, data_nascimento, fase, semanas_gestacao, paciente_telefone, termos_aceitos, codigo_verificacao, foto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Nome,
        Email,
        senhaCriptografada,
        DataNascimento || null,
        Fase || null,
        SemanasGestacao || null,
        Telefone || null,
        Termos ? 1 : 0,
        codigoVerificacao,
        Foto || null
      ]
    );

    console.log(`🔑 CÓDIGO DE VERIFICAÇÃO GERADO PARA [${Email}]: ${codigoVerificacao}`);

    try {
      await transporter.sendMail({
        from: `"Equipe Maia" <${EMAIL_SISTEMA}>`,
        to: Email,
        subject: "Seu Código de Verificação - Maia",
        html: `
          <div style="${emailStyle}">
            <h2 style="color: #8c5a4d; margin-top: 0;">Bem-vinda à Maia!</h2>
            <p>Olá, <b>${Nome}</b>! Use o código abaixo para validar seu acesso:</p>
            <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #8c5a4d;">${codigoVerificacao}</span>
            </div>
            <p style="font-size: 12px; color: #999;">Se você não solicitou este código, ignore este e-mail.</p>
          </div>
        `
      });
      console.log(`✉️ E-mail enviado com sucesso para: ${Email}`);
    } catch (erroEmail) {
      console.error("⚠️ Falha ao enviar o e-mail pelo Nodemailer:", erroEmail.message);
    }

    return res.redirect(`/verificacao?email=${encodeURIComponent(Email)}`);

  } catch (erro) {
    console.error("Erro ao cadastrar usuário:", erro.message);
    return res.status(500).send("Erro ao cadastrar usuário");
  }
};

// ===================== Verificar Código de E-mail =====================
export const verificarCodigo = async (req, res) => {
  try {
    const { email, codigoDigitado } = req.body;

    const [linhas] = await pool.execute(
      "SELECT * FROM usuario WHERE email = ? AND codigo_verificacao = ?",
      [email, codigoDigitado]
    );

    if (linhas.length > 0) {
      req.session.usuarioEmail = email;
      return res.json({ ok: true, mensagem: "E-mail verificado com sucesso!" });
    } else {
      return res.status(401).json({ ok: false, erro: "Código de verificação inválido!" });
    }
  } catch (erro) {
    console.error("Erro ao verificar código:", erro.message);
    return res.status(500).json({ ok: false, erro: "Erro ao verificar código." });
  }
};

// ===================== Autenticação com o Google =====================
export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ erro: "Token do Google não enviado." });
    }

    let email, nome, foto;

    if (typeof token === 'string' && token.split('.').length === 3) {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      nome = payload.name;
      foto = payload.picture;
    } else {
      const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await googleRes.json();
      email = payload.email;
      nome = payload.name;
      foto = payload.picture;
    }

    const [linhas] = await pool.execute("SELECT * FROM usuario WHERE email = ?", [email]);

    if (linhas.length > 0) {
      req.session.usuarioEmail = email;
      return res.json({
        ok: true,
        cadastrado: true,
        redirect: "/dashboard"
      });
    } else {
      return res.json({
        ok: true,
        cadastrado: false,
        redirect: "/cadastro",
        nome: nome,
        email: email,
        foto: foto
      });
    }

  } catch (erro) {
    console.error("❌ Erro no Google Auth:", erro.message);
    return res.status(403).json({ erro: "Falha na autenticação do Google." });
  }
};

// ===================== Login =====================
export const login = async (req, res) => {
  try {
    const { Email, Senha } = req.body;

    if (!Email || !Senha) {
      return res.status(400).send("E-mail e senha são obrigatórios");
    }

    const [linhas] = await pool.execute("SELECT * FROM usuario WHERE email = ?", [Email]);
    const usuario = linhas[0];

    if (!usuario) {
      return res.status(401).send("Credenciais inválidas");
    }

    const senhaCorreta = await bcrypt.compare(Senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).send("Credenciais inválidas");
    }

    req.session.usuarioEmail = usuario.email;
    return res.redirect("/dashboard");

  } catch (erro) {
    console.error("Erro ao fazer login:", erro.message);
    return res.status(500).send("Erro ao fazer login");
  }
};

// ===================== Logout =====================
export const logout = (req, res) => {
  req.session.destroy(() => {
    return res.redirect("/");
  });
};

// ===================== Dados do usuário logado =====================
export const meusDados = async (req, res) => {
  try {
    const [linhas] = await pool.execute(
      `SELECT id_usuario, paciente_nome AS Nome, email AS Email, data_nascimento AS DataNascimento,
              fase AS Fase, semanas_gestacao AS SemanasGestacao, paciente_telefone AS Telefone,
              status_risco AS StatusRisco, foto AS Foto
         FROM usuario WHERE email = ?`,
      [req.session.usuarioEmail]
    );

    const usuario = linhas[0];
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });

    return res.json(usuario);

  } catch (erro) {
    console.error("Erro ao buscar dados do usuário:", erro.message);
    return res.status(500).json({ erro: "Erro ao buscar dados do usuário" });
  }
};

// ===================== Página de perfil =====================
export const paginaPerfil = async (req, res) => {
  try {
    const [linhas] = await pool.execute(
      `SELECT id_usuario, paciente_nome AS Nome, email AS Email, data_nascimento AS DataNascimento,
              fase AS Fase, semanas_gestacao AS SemanasGestacao, paciente_telefone AS Telefone,
              status_risco AS StatusRisco, foto AS Foto
         FROM usuario WHERE email = ?`,
      [req.session.usuarioEmail]
    );

    const usuario = linhas[0];
    if (!usuario) return res.redirect("/login");

    return res.render("perfil", { usuario });

  } catch (erro) {
    console.error("Erro ao carregar página de perfil:", erro.message);
    return res.status(500).send("Erro ao carregar perfil");
  }
};

// ===================== Atualizar perfil =====================
export const atualizarPerfil = async (req, res) => {
  try {
    const { Nome, Telefone, Fase, SemanasGestacao } = req.body;
    const emailUsuario = req.session.usuarioEmail;

    if (!emailUsuario) {
      return res.status(401).json({ ok: false, erro: "Sessão expirada. Faça login novamente." });
    }

    await pool.execute(
      `UPDATE usuario
          SET paciente_nome = COALESCE(?, paciente_nome),
              paciente_telefone = COALESCE(?, paciente_telefone),
              fase = COALESCE(?, fase),
              semanas_gestacao = COALESCE(?, semanas_gestacao)
        WHERE email = ?`,
      [
        Nome || null,
        Telefone || null,
        Fase || null,
        SemanasGestacao === undefined || SemanasGestacao === "" ? null : SemanasGestacao,
        emailUsuario
      ]
    );

    return res.json({ ok: true, mensagem: "Perfil atualizado com sucesso!" });

  } catch (erro) {
    console.error("Erro ao atualizar perfil:", erro.message);
    return res.status(500).json({ ok: false, erro: "Erro interno ao atualizar perfil." });
  }
};

// ===================== Solicitar Recuperação de Senha =====================
export const solicitarRecuperacaoSenha = async (req, res) => {
  try {
    const { Email } = req.body;

    if (!Email) {
      return res.status(400).json({ ok: false, erro: "E-mail é obrigatório." });
    }

    const [linhas] = await pool.execute("SELECT * FROM usuario WHERE email = ?", [Email]);

    if (linhas.length === 0) {
      return res.status(404).json({ ok: false, erro: "E-mail não cadastrado no sistema." });
    }

    const codigoRedefinicao = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.execute("UPDATE usuario SET codigo_verificacao = ? WHERE email = ?", [codigoRedefinicao, Email]);

    await transporter.sendMail({
      from: `"Equipe Maia" <${EMAIL_SISTEMA}>`,
      to: Email,
      subject: "Redefinição de Senha - Maia",
      html: `
        <div style="${emailStyle}">
          <h2 style="color: #8c5a4d; margin-top: 0;">Recuperação de Senha</h2>
          <p>Você solicitou a redefinição de sua senha na plataforma <b>Maia</b>.</p>
          <p>Seu código de verificação é:</p>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #8c5a4d;">${codigoRedefinicao}</span>
          </div>
          <p style="font-size: 12px; color: #999;">Se você não solicitou essa alteração, ignore esta mensagem.</p>
        </div>
      `
    });

    console.log(`🔑 CÓDIGO DE REDEFINIÇÃO ENVIADO PARA [${Email}]: ${codigoRedefinicao}`);
    return res.json({ ok: true, mensagem: "E-mail de redefinição enviado com sucesso!" });

  } catch (erro) {
    console.error("Erro ao solicitar recuperação de senha:", erro.message);
    return res.status(500).json({ ok: false, erro: "Erro ao processar solicitação." });
  }
};

// ===================== Redefinir Senha Com Código =====================
export const redefinirSenha = async (req, res) => {
  try {
    const { Email, Codigo, NovaSenha } = req.body;

    if (!Email || !Codigo || !NovaSenha) {
      return res.status(400).json({ ok: false, erro: "Todos os campos são obrigatórios." });
    }

    const [linhas] = await pool.execute(
      "SELECT * FROM usuario WHERE email = ? AND codigo_verificacao = ?",
      [Email, Codigo]
    );

    if (linhas.length === 0) {
      return res.status(400).json({ ok: false, erro: "Código inválido ou expirado." });
    }

    const novaSenhaCriptografada = await bcrypt.hash(NovaSenha, 10);

    await pool.execute(
      "UPDATE usuario SET senha = ?, codigo_verificacao = NULL WHERE email = ?",
      [novaSenhaCriptografada, Email]
    );

    return res.json({ ok: true, mensagem: "Senha alterada com sucesso! Você já pode fazer login." });

  } catch (erro) {
    console.error("Erro ao redefinir senha:", erro.message);
    return res.status(500).json({ ok: false, erro: "Erro ao redefinir senha." });
  }
};

// ===================== AGENDAMENTOS DE CONSULTAS =====================

// 🟢 Criar Agendamento (Com validação estrita de 11 dígitos no telefone)
export const agendarConsulta = async (req, res) => {
  try {
    const {
      email,
      usuario_email,
      email_cliente,
      paciente_email,
      id_profissional,
      profissional_id,
      profissional_nome,
      profissional,
      data_consulta,
      data_agendamento,
      data,
      data_formatada,
      horario,
      hora,
      paciente_nome,
      nome_paciente,
      paciente,
      nome,
      telefone,
      telefone_paciente,
      observacoes,
      observacao,
      endereco_profissional,
      endereco,
      tipo_atendimento
    } = req.body;

    const emailFinal = email || usuario_email || email_cliente || paciente_email || req.session?.usuarioEmail;
    let dataInput = data_agendamento || data_consulta || data;
    const horarioInput = horario || hora;

    if (!emailFinal || !dataInput || !horarioInput) {
      return res.status(400).json({ ok: false, erro: "E-mail, data e horário são obrigatórios." });
    }

    // Busca dados do cadastro do usuário para garantir Telefone e Nome caso não venham do formulário
    const [usuarios] = await pool.execute(
      "SELECT id_usuario, paciente_nome, paciente_telefone FROM usuario WHERE email = ?",
      [emailFinal]
    );

    const usuarioBd = usuarios.length > 0 ? usuarios[0] : {};
    const idUsuario = usuarioBd.id_usuario || null;

    const nomeFinal = nome_paciente || paciente_nome || paciente || nome || usuarioBd.paciente_nome || "Paciente";
    const rawTelefone = telefone_paciente || telefone || usuarioBd.paciente_telefone || "";

    // 🔴 VALIDAÇÃO OBRIGATÓRIA DE TELEFONE (Apenas números e exatamente 11 dígitos)
    const telApenasNumeros = String(rawTelefone).replace(/\D/g, "");

    if (telApenasNumeros.length !== 11) {
      return res.status(400).json({
        ok: false,
        erro: "O telefone deve ter obrigatoriamente 11 dígitos com o DDD (exemplo: 11987654321)."
      });
    }

    // Formata o telefone para exibição: (XX) XXXXX-XXXX
    const telFormatado = `(${telApenasNumeros.substring(0, 2)}) ${telApenasNumeros.substring(2, 7)}-${telApenasNumeros.substring(7)}`;

    const obsFinal = observacoes || observacao || "Nenhuma.";
    const nomeProf = profissional_nome || profissional || "Dra. Ana Beatriz Mendes (Psicologia Perinatal)";
    const enderecoProf = endereco_profissional || endereco || "Clínica Maia";

    // Trata formatação de data (YYYY-MM-DD para o banco e DD/MM/YYYY para o e-mail)
    let dataBanco = dataInput;
    if (typeof dataBanco === "string" && dataBanco.includes("/")) {
      const partes = dataBanco.split("/");
      if (partes.length === 3) {
        dataBanco = `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
      }
    }

    let dataBR = data_formatada;
    if (!dataBR && typeof dataBanco === "string" && dataBanco.includes("-")) {
      dataBR = dataBanco.split("-").reverse().join("/");
    } else if (!dataBR) {
      dataBR = dataInput;
    }

    let horarioFinal = horarioInput;
    if (typeof horarioFinal === "string" && horarioFinal.length === 5) {
      horarioFinal = `${horarioFinal}:00`;
    }

    const idProf = id_profissional || profissional_id || 1;

    // Salva o agendamento no banco com todas as informações
    const [resultado] = await pool.execute(
      `INSERT INTO agendamento 
        (USUARIO_id_usuario, PROFISSIONAL_id_profissional, data_agendamento, horario, tipo_atendimento, status, observacoes, email_paciente, nome_paciente, telefone_paciente, endereco_profissional)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idUsuario,
        Number(idProf),
        dataBanco,
        horarioFinal,
        tipo_atendimento || "Presencial",
        "Agendado",
        obsFinal,
        emailFinal,
        nomeFinal,
        telFormatado,
        enderecoProf
      ]
    );

    // Envia o e-mail de confirmação contendo todos os detalhes
    try {
      await transporter.sendMail({
        from: `"Equipe Maia" <${EMAIL_SISTEMA}>`,
        to: emailFinal,
        subject: "Confirmação de Agendamento - Maia",
        html: `
          <div style="${emailStyle}">
            <h2 style="color: #8c5a4d; margin-top: 0;">Agendamento Confirmado!</h2>
            <p>Olá, <b>${nomeFinal}</b>!</p>
            <p>Sua consulta foi agendada com sucesso. Confira os detalhes abaixo:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><b>Paciente:</b> ${nomeFinal}</p>
              <p style="margin: 5px 0;"><b>E-mail:</b> ${emailFinal}</p>
              <p style="margin: 5px 0;"><b>Contato:</b> ${telFormatado}</p>
              <p style="margin: 5px 0;"><b>Profissional:</b> ${nomeProf}</p>
              <p style="margin: 5px 0;"><b>Data:</b> ${dataBR}</p>
              <p style="margin: 5px 0;"><b>Horário:</b> ${horarioInput.toString().substring(0, 5)}</p>
              <p style="margin: 5px 0;"><b>Endereço:</b> ${enderecoProf}</p>
              <p style="margin: 5px 0;"><b>Observações:</b> ${obsFinal}</p>
            </div>
            <p style="font-size: 12px; color: #999;">Caso precise cancelar ou remarcar, acesse a aba Agendamentos na plataforma Maia.</p>
          </div>
        `
      });
      console.log(`📧 E-mail de agendamento enviado com sucesso para: ${emailFinal}`);
    } catch (erroEmail) {
      console.error("⚠️ Falha ao enviar e-mail de agendamento:", erroEmail.message);
    }

    return res.status(201).json({
      ok: true,
      sucesso: true,
      mensagem: "Consulta agendada com sucesso!",
      id_agendamento: resultado.insertId
    });

  } catch (erro) {
    console.error("Erro SQL ao agendar consulta:", erro);
    return res.status(500).json({ ok: false, erro: erro.sqlMessage || erro.message });
  }
};

// 🟢 Buscar Agendamentos do Usuário
export const meusAgendamentos = async (req, res) => {
  try {
    const emailParam = req.params.email || req.query.email || req.session?.usuarioEmail;

    if (!emailParam) {
      return res.json([]);
    }

    const [consultas] = await pool.execute(
      `SELECT 
        a.id_agendamento,
        a.USUARIO_id_usuario,
        a.PROFISSIONAL_id_profissional,
        DATE_FORMAT(a.data_agendamento, '%Y-%m-%d') AS data_agendamento,
        DATE_FORMAT(a.data_agendamento, '%Y-%m-%d') AS data_consulta,
        DATE_FORMAT(a.data_agendamento, '%d/%m/%Y') AS data_formatada,
        TIME_FORMAT(a.horario, '%H:%i') AS horario,
        a.tipo_atendimento,
        COALESCE(a.status, 'Agendado') AS status,
        COALESCE(a.observacoes, 'Nenhuma.') AS observacoes,
        COALESCE(a.email_paciente, u.email) AS email_paciente,
        COALESCE(a.email_paciente, u.email) AS email,
        COALESCE(a.nome_paciente, u.paciente_nome, 'Paciente') AS nome_paciente,
        COALESCE(a.nome_paciente, u.paciente_nome, 'Paciente') AS paciente_nome,
        COALESCE(a.telefone_paciente, u.paciente_telefone, 'Não informado') AS telefone_paciente,
        COALESCE(a.telefone_paciente, u.paciente_telefone, 'Não informado') AS telefone,
        COALESCE(a.endereco_profissional, 'Clínica Maia') AS endereco_profissional,
        COALESCE(a.endereco_profissional, 'Clínica Maia') AS endereco,
        'Dra. Ana Beatriz Mendes (Psicologia Perinatal)' AS profissional_nome
       FROM agendamento a
       LEFT JOIN usuario u ON a.USUARIO_id_usuario = u.id_usuario OR a.email_paciente = u.email
       WHERE a.email_paciente = ? 
          OR u.email = ?
       ORDER BY a.data_agendamento ASC, a.horario ASC`,
      [emailParam, emailParam]
    );

    return res.json(consultas);

  } catch (erro) {
    console.error("Erro ao buscar agendamentos:", erro.message);
    return res.status(500).json({ erro: "Erro ao buscar agendamentos." });
  }
};

// 🟢 Cancelar Agendamento e Enviar E-mail
export const cancelarAgendamento = async (req, res) => {
  try {
    const body = req.body || {};
    const idAgendamento = body.id_agendamento || body.id || body.idAgendamento;

    if (!idAgendamento) {
      return res.status(400).json({ ok: false, erro: "ID do agendamento é obrigatório." });
    }

    // Busca os dados do agendamento formatados no MySQL antes de excluir
    const [agendamentos] = await pool.execute(
      `SELECT 
        a.id_agendamento,
        a.email_paciente,
        a.nome_paciente,
        DATE_FORMAT(a.data_agendamento, '%d/%m/%Y') AS data_formatada,
        TIME_FORMAT(a.horario, '%H:%i') AS horario_formatado,
        a.endereco_profissional,
        a.observacoes
       FROM agendamento a
       WHERE a.id_agendamento = ?`,
      [idAgendamento]
    );

    if (agendamentos.length === 0) {
      return res.status(404).json({ ok: false, erro: "Agendamento não encontrado no banco de dados." });
    }

    const dadosConsulta = agendamentos[0];

    const emailDestino = body.email || dadosConsulta.email_paciente;
    const nomePaciente = body.paciente_nome || dadosConsulta.nome_paciente || "Paciente";
    const dataConsulta = body.data_formatada || dadosConsulta.data_formatada || "Data não informada";
    const horaConsulta = body.horario || dadosConsulta.horario_formatado || "Horário não informado";
    const nomeProfissional = body.profissional_nome || body.profissional || "Dra. Ana Beatriz Mendes (Psicologia Perinatal)";
    const motivoCancelamento = body.motivo || "Solicitado via plataforma";

    if (!emailDestino) {
      return res.status(400).json({ ok: false, erro: "E-mail do paciente não encontrado." });
    }

    // Remove a consulta do banco
    await pool.execute("DELETE FROM agendamento WHERE id_agendamento = ?", [idAgendamento]);
    console.log(`🗑️ Agendamento ID ${idAgendamento} deletado do banco.`);

    // Envia o e-mail de cancelamento
    await transporter.sendMail({
      from: `"Equipe Maia" <${EMAIL_SISTEMA}>`,
      to: emailDestino,
      subject: "Cancelamento de Agendamento - Maia",
      html: `
        <div style="${emailStyle}">
          <h2 style="color: #c62828; margin-top: 0;">Consulta Cancelada</h2>
          <p>Olá, <b>${nomePaciente}</b>!</p>
          <p>Confirmamos o cancelamento do seu agendamento conforme solicitado.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><b>Profissional:</b> ${nomeProfissional}</p>
            <p style="margin: 5px 0;"><b>Data da Consulta:</b> ${dataConsulta}</p>
            <p style="margin: 5px 0;"><b>Horário:</b> ${horaConsulta}</p>
            <p style="margin: 5px 0;"><b>Motivo:</b> ${motivoCancelamento}</p>
          </div>
          <p style="font-size: 12px; color: #999;">Se desejar realizar um novo agendamento, acesse nossa plataforma.</p>
        </div>
      `
    });

    console.log(`📧 E-mail de cancelamento enviado com sucesso para: ${emailDestino}`);

    return res.json({ ok: true, mensagem: "Consulta cancelada e e-mail enviado com sucesso!" });

  } catch (erro) {
    console.error("❌ ERRO NO CANCELAMENTO DE AGENDAMENTO:", erro.message);
    return res.status(500).json({ ok: false, erro: "Erro ao processar cancelamento: " + erro.message });
  }
};
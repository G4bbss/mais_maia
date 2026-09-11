import pool from "../config/banco.js";

// --- CONSULTAS JÁ EXISTENTES DE PROFISSIONAIS ---

export const buscarTodosOsProfissionais = async () => {
    const [linhas] = await pool.execute("SELECT * FROM profissional");
    return linhas;
};

export const buscarProfissionalPorId = async (id) => {
    const [linhas] = await pool.execute("SELECT * FROM profissional WHERE id_profissional = ?", [id]);
    return linhas[0] || null;
};

export const criarProfissional = async (dados) => {
    const { nome, especialidade, foto, disponibilidade, tempo_atendimento, modalidade } = dados;
    const [resultado] = await pool.execute(
        `INSERT INTO profissional (nome, especialidade, foto, disponibilidade, tempo_atendimento, modalidade)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nome, especialidade, foto || 'default.png', disponibilidade, tempo_atendimento || '30min', modalidade || 'ambos']
    );
    return resultado.insertId;
};

// --- CONSULTAS DO PAINEL DO PROFISSIONAL ---

// Buscar agendamentos filtrados por profissional (e trazendo dados do profissional)
export const buscarAgendamentosPorProfissional = async (idProfissional) => {
    const [consultas] = await pool.execute(
        `SELECT 
            a.id_agendamento,
            a.USUARIO_id_usuario,
            a.PROFISSIONAL_id_profissional,
            DATE_FORMAT(a.data_agendamento, '%Y-%m-%d') AS data_agendamento,
            DATE_FORMAT(a.data_agendamento, '%d/%m/%Y') AS data_formatada,
            TIME_FORMAT(a.horario, '%H:%i') AS horario,
            a.tipo_atendimento,
            COALESCE(a.status, 'Agendado') AS status,
            COALESCE(a.observacoes, 'Nenhuma.') AS observacoes,
            a.email_paciente,
            a.nome_paciente,
            a.telefone_paciente,
            a.endereco_profissional
         FROM agendamento a
         WHERE a.PROFISSIONAL_id_profissional = ?
         ORDER BY a.data_agendamento DESC, a.horario ASC`,
        [idProfissional]
    );
    return consultas;
};




export const atualizarStatusAgendamentoBanco = async (id_agendamento, status) => {
    await pool.execute(
        "UPDATE agendamento SET status = ? WHERE id_agendamento = ?",
        [status, id_agendamento]
    );
};

export const salvarProntuarioBanco = async (dados) => {
    const { email_paciente, nome_paciente, anamnese, conduta, id_agendamento } = dados;

    // Criar tabela de prontuário se não existir
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS prontuario (
        id_prontuario INT AUTO_INCREMENT PRIMARY KEY,
        email_paciente VARCHAR(255) NOT NULL,
        nome_paciente VARCHAR(255),
        anamnese TEXT NOT NULL,
        conduta TEXT,
        data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        id_agendamento INT
      )
    `);

    await pool.execute(
        `INSERT INTO prontuario (email_paciente, nome_paciente, anamnese, conduta, id_agendamento)
         VALUES (?, ?, ?, ?, ?)`,
        [email_paciente, nome_paciente || "Paciente", anamnese, conduta || "", id_agendamento || null]
    );

    if (id_agendamento) {
        await pool.execute(
            "UPDATE agendamento SET status = 'Realizada' WHERE id_agendamento = ?",
            [id_agendamento]
        );
    }
};

export const buscarProntuariosPorEmail = async (email) => {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS prontuario (
        id_prontuario INT AUTO_INCREMENT PRIMARY KEY,
        email_paciente VARCHAR(255) NOT NULL,
        nome_paciente VARCHAR(255),
        anamnese TEXT NOT NULL,
        conduta TEXT,
        data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        id_agendamento INT
      )
    `);

    const [historico] = await pool.execute(
        `SELECT id_prontuario, email_paciente, nome_paciente, anamnese, conduta, 
                DATE_FORMAT(data_registro, '%d/%m/%Y %H:%i') AS data_formatada
         FROM prontuario 
         WHERE email_paciente = ? 
         ORDER BY data_registro DESC`,
        [email]
    );
    return historico;
};

// --- AUTENTICAÇÃO ---

export const buscarProfissionalPorEmail = async (email) => {
    const [linhas] = await pool.execute(
        "SELECT * FROM profissional WHERE email = ?",
        [email]
    );
    return linhas[0] || null;
};
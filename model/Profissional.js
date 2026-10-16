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

// --- AUTENTICAÇÃO ---

export const buscarProfissionalPorEmail = async (email) => {
    const [linhas] = await pool.execute(
        "SELECT * FROM profissional WHERE email = ?",
        [email]
    );
    return linhas[0] || null;
};
import pool from "../config/banco.js";

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
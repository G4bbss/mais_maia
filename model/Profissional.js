import conexao from "../config/banco.js";

export const buscarTodosOsProfissionais = async () => {
    // Alterado 'profissionais' para 'profissional'
    const [linhas] = await conexao.query("SELECT * FROM profissional");
    return linhas;
};

export const buscarProfissionalPorId = async (id) => {
    // Alterado 'profissionais' para 'profissional'
    const [linhas] = await conexao.query("SELECT * FROM profissional WHERE id_profissional = ?", [id]);
    return linhas[0];
};
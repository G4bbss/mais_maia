import db from "../config/banco.js";

// Procura todos os chamados recebidos por uma rede de apoio específica, juntando dados da utilizadora que chamou
export const buscarChamadosPorRede = async (idRedeApoio) => {
    const sql = `
        SELECT 
            c.id_chamado,
            c.endereco_usuario,
            c.motivo,
            'Pendente' AS status, -- 👈 Criamos um valor fixo 'Pendente' para o front-end não quebrar
            DATE_FORMAT(c.data_chamado, '%d/%m/%Y') AS data_chamado,
            c.horario,
            u.nome AS nome_usuario,
            u.telefone AS telefone_usuario,
            u.email AS email_usuario
        FROM chamado c
        LEFT JOIN usuario u ON c.USUARIO_id_usuario = u.id_usuario
        WHERE c.REDE_APOIO_id_rede_apoio = ?
        ORDER BY c.data_chamado DESC, c.horario DESC
    `;
    const [linhas] = await db.query(sql, [idRedeApoio]);
    return linhas;
};
// Procura o perfil da rede de apoio pelo ID
export const buscarPerfilPorId = async (idRedeApoio) => {
    const sql = `
        SELECT id_rede_apoio, nome, telefone, email, distancia, disponibilidade, 
               pode_ajudar_com, ativo, foto, horarios_disponiveis 
        FROM rede_apoio 
        WHERE id_rede_apoio = ?
    `;
    const [linhas] = await db.query(sql, [idRedeApoio]);
    return linhas[0];
};

// Atualiza os dados do perfil na tabela rede_apoio
export const atualizarPerfilBanco = async (idRedeApoio, dados) => {
    const sql = `
        UPDATE rede_apoio SET 
            nome = ?, 
            telefone = ?, 
            email = ?, 
            distancia = ?, 
            disponibilidade = ?, 
            pode_ajudar_com = ?, 
            ativo = ?, 
            foto = ?, 
            horarios_disponiveis = ?
        WHERE id_rede_apoio = ?
    `;
    await db.query(sql, [
        dados.nome,
        dados.telefone,
        dados.email,
        dados.distancia,
        dados.disponibilidade,
        dados.pode_ajudar_com,
        dados.ativo,
        dados.foto,
        dados.horarios_disponiveis,
        idRedeApoio
    ]);
};

// Procura rede de apoio pelo e-mail para autenticação
export const buscarPorEmail = async (email) => {
    const sql = `SELECT * FROM rede_apoio WHERE email = ?`;
    const [linhas] = await db.query(sql, [email]);
    return linhas[0];
};
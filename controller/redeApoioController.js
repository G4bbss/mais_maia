import db from "../config/banco.js";
import * as RedeApoioModel from "../model/redeApoio.js";

// 🔹 Controller untuk menyenaraikan chamados
export const listarChamados = async (req, res) => {
    try {
        const idRedeApoio = req.session?.redeApoioId;

        const sql = `
            SELECT 
                c.id_chamado,
                c.endereco_usuario,
                c.motivo,
                DATE_FORMAT(c.data_chamado, '%d/%m/%Y') AS data_chamado,
                c.horario,
                u.paciente_nome AS nome_usuario,
                u.paciente_telefone AS telefone_usuario,
                u.email AS email_usuario,
                ra.nome AS nome_rede_apoio -- 👈 Ambil nama dari jadual rede_apoio
            FROM chamado c
            INNER JOIN usuario u ON c.USUARIO_id_usuario = u.id_usuario
            LEFT JOIN rede_apoio ra ON c.REDE_APOIO_id_rede_apoio = ra.id_rede_apoio
            ${idRedeApoio ? "WHERE c.REDE_APOIO_id_rede_apoio = ?" : ""}
            ORDER BY c.id_chamado DESC
        `;

        const params = idRedeApoio ? [idRedeApoio] : [];
        const [chamados] = await db.query(sql, params);

        return res.json(chamados);

    } catch (erro) {
        console.error("❌ Erro ao buscar chamados no MySQL:", erro.message);
        return res.status(500).json({ 
            mensagem: "Erro ao buscar chamados no banco de dados.",
            detalhe: erro.message 
        });
    }
};

// Obter os dados do perfil da rede de apoio logada
export const obterPerfil = async (req, res) => {
    try {
        const idRedeApoio = req.session?.redeApoioId;

        if (!idRedeApoio) {
            return res.status(401).json({ erro: "Utilizador não autenticado." });
        }

        const perfil = await RedeApoioModel.buscarPerfilPorId(idRedeApoio);
        if (!perfil) {
            return res.status(404).json({ erro: "Perfil não encontrado." });
        }

        return res.json(perfil);
    } catch (erro) {
        console.error("❌ Erro ao obter perfil:", erro.message);
        return res.status(500).json({ erro: "Erro ao procurar perfil." });
    }
};

// Guardar alterações do perfil
export const salvarPerfil = async (req, res) => {
    try {
        const idRedeApoio = req.session?.redeApoioId;

        if (!idRedeApoio) {
            return res.status(401).json({ ok: false, erro: "Sessão expirada." });
        }

        const dados = req.body;
        await RedeApoioModel.atualizarPerfilBanco(idRedeApoio, dados);

        return res.json({ ok: true, mensagem: "Perfil atualizado com sucesso!" });
    } catch (erro) {
        console.error("❌ Erro ao atualizar perfil:", erro.message);
        return res.status(500).json({ ok: false, erro: "Erro interno ao atualizar perfil." });
    }
};

// Login da Rede de Apoio
export const loginRedeApoio = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ ok: false, erro: "E-mail e senha são obrigatórios." });
        }

        const rede = await RedeApoioModel.buscarPorEmail(email);

        if (!rede || rede.senha !== senha) {
            return res.status(401).json({ ok: false, erro: "E-mail ou senha incorretos." });
        }

        req.session.usuarioEmail = rede.email;
        req.session.redeApoioId = rede.id_rede_apoio;
        req.session.tipoUsuario = "rede_apoio";

        return res.json({
            ok: true,
            redirect: "/painel-rede-apoio"
        });
    } catch (erro) {
        console.error("❌ Erro no login da rede de apoio:", erro);
        return res.status(500).json({ ok: false, erro: "Erro interno ao processar o login." });
    }
};
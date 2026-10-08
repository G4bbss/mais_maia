import db from "../config/banco.js";

const DiarioController = {
    async obterIdUsuario(req) {
        if (!req.session) return null;

        const idDireto = req.session.usuario?.id || 
                         req.session.usuario?.id_usuario || 
                         req.session.cliente?.id || 
                         req.session.cliente?.id_usuario || 
                         req.session.id_usuario || 
                         req.session.usuarioId;

        if (idDireto) return idDireto;

        const email = req.session.usuarioEmail || req.session.usuario?.email;
        if (email) {
            try {
                const [rows] = await db.query(
                    "SELECT id_usuario FROM usuario WHERE email = ?", 
                    [email]
                );
                if (rows && rows.length > 0) {
                    return rows[0].id_usuario;
                }
            } catch (erro) {
                console.error("Erro ao procurar id_usuario pelo e-mail:", erro);
            }
        }

        return null;
    },

    async salvar(req, res) {
        try {
            const idUsuario = await DiarioController.obterIdUsuario(req);
            const { texto, emocao } = req.body;

            if (!idUsuario) {
                return res.status(401).json({ mensagem: "Usuário não autenticado." });
            }

            // Tratamento para não enviar NULL para a coluna 'texto'
            const textoTratado = (texto && texto.trim() !== "") ? texto.trim() : "";

            // Garante que pelo menos um dos dois campos (texto ou emoção) foi enviado
            if (!textoTratado && !emocao) {
                return res.status(400).json({ mensagem: "Selecione um humor ou digite uma mensagem." });
            }

            const sql = `
                INSERT INTO diario_emocional (USUARIO_id_usuario, data_registro, texto, emocao) 
                VALUES (?, NOW(), ?, ?)
            `;

            await db.query(sql, [idUsuario, textoTratado, emocao || null]);

            return res.status(201).json({ mensagem: "Registro salvo com sucesso!" });
        } catch (erro) {
            console.error("Erro ao salvar diário:", erro);
            return res.status(500).json({ mensagem: "Erro interno no servidor ao salvar registro." });
        }
    },

    async listar(req, res) {
        try {
            const idUsuario = await DiarioController.obterIdUsuario(req);

            if (!idUsuario) {
                return res.status(401).json({ mensagem: "Usuário não autenticado." });
            }

            const sql = `
                SELECT id_diario, USUARIO_id_usuario, data_registro, texto, emocao 
                FROM diario_emocional 
                WHERE USUARIO_id_usuario = ? 
                ORDER BY data_registro DESC
            `;

            const [registros] = await db.query(sql, [idUsuario]);

            return res.json(registros);
        } catch (erro) {
            console.error("Erro ao buscar histórico do diário:", erro);
            return res.status(500).json({ mensagem: "Erro ao buscar histórico do diário." });
        }
    }
};

export default DiarioController;
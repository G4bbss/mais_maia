import db from "../config/banco.js";

const MuralController = {
    // Obtém o ID do usuário conectado
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
                if (rows && rows.length > 0) return rows[0].id_usuario;
            } catch (erro) {
                console.error("Erro ao obter id_usuario:", erro);
            }
        }
        return null;
    },

    // Lista todos os posts e suas respectivas respostas
    async listar(req, res) {
        try {
            const [posts] = await db.query(`
                SELECT id_post, USUARIO_id_usuario, nome_exibicao, e_anonimo, texto, curtidas, data_criacao 
                FROM mural_post 
                ORDER BY data_criacao DESC
            `);

            // Apelida 'POST_id_post AS id_post' para bater com o nome da coluna no seu banco
            const [respostas] = await db.query(`
                SELECT id_resposta, POST_id_post AS id_post, nome_exibicao, texto, data_criacao 
                FROM mural_resposta 
                ORDER BY data_criacao ASC
            `);

            const postsComRespostas = posts.map(post => ({
                ...post,
                respostas: respostas.filter(r => r.id_post === post.id_post)
            }));

            return res.json(postsComRespostas);
        } catch (erro) {
            console.error("Erro ao listar mural:", erro);
            return res.status(500).json({ mensagem: "Erro ao buscar posts do mural." });
        }
    },

    // Salva uma nova publicação no mural
    async salvarPost(req, res) {
        try {
            const idUsuario = await MuralController.obterIdUsuario(req);
            const { texto, e_anonimo, nome_exibicao } = req.body;

            if (!texto || !texto.trim()) {
                return res.status(400).json({ mensagem: "O texto é obrigatório." });
            }

            // Calculates the next id_post manually
            const [maxResult] = await db.query(
                "SELECT COALESCE(MAX(id_post), 0) + 1 AS proximoId FROM mural_post"
            );
            const proximoId = maxResult[0].proximoId;

            const sql = `
                INSERT INTO mural_post (id_post, USUARIO_id_usuario, nome_exibicao, e_anonimo, texto, curtidas, data_criacao)
                VALUES (?, ?, ?, ?, ?, 0, NOW())
            `;

            await db.query(sql, [
                proximoId,
                idUsuario || null,
                nome_exibicao || "Anônima",
                e_anonimo ? 1 : 0,
                texto.trim()
            ]);

            return res.status(201).json({ mensagem: "Post criado com sucesso!" });
        } catch (erro) {
            console.error("Erro ao criar post no mural:", erro);
            return res.status(500).json({ mensagem: "Erro interno ao salvar relato." });
        }
    },

    // Incrementa uma curtida
    async curtirPost(req, res) {
        try {
            const { id } = req.params;
            await db.query("UPDATE mural_post SET curtidas = curtidas + 1 WHERE id_post = ?", [id]);
            return res.json({ mensagem: "Curtida registrada com sucesso!" });
        } catch (erro) {
            console.error("Erro ao curtir post:", erro);
            return res.status(500).json({ mensagem: "Erro ao curtir o post." });
        }
    },

    // Salva uma resposta em um post (Sem precisar de AUTO_INCREMENT no banco)
    async salvarResposta(req, res) {
        try {
            const { id } = req.params;
            const { texto, nome_exibicao } = req.body;

            if (!texto || !texto.trim()) {
                return res.status(400).json({ mensagem: "O comentário não pode ser vazio." });
            }

            // 1. Calcula o próximo id_resposta manualmente
            const [maxResult] = await db.query(
                "SELECT COALESCE(MAX(id_resposta), 0) + 1 AS proximoId FROM mural_resposta"
            );
            const proximoId = maxResult[0].proximoId;

            // 2. Insere informando o id_resposta e usando a coluna POST_id_post
            const sql = `
                INSERT INTO mural_resposta (id_resposta, POST_id_post, nome_exibicao, texto, data_criacao)
                VALUES (?, ?, ?, ?, NOW())
            `;

            await db.query(sql, [
                proximoId,
                id,
                nome_exibicao || "Anônima",
                texto.trim()
            ]);

            return res.status(201).json({ mensagem: "Comentário enviado!" });
        } catch (erro) {
            console.error("Erro ao responder post:", erro);
            return res.status(500).json({ mensagem: "Erro ao salvar resposta." });
        }
    }
};

export default MuralController;
import * as ProfissionalModel from "../model/profissional.js";

export const listarProfissionais = async (req, res) => {
    try {
        const profissionais = await ProfissionalModel.buscarTodosOsProfissionais();
        res.json(profissionais);
    } catch (erro) {
        console.error("❌ Erro ao listar profissionais:", erro);
        res.status(500).json({ erro: "Erro interno ao buscar profissionais" });
    }
};

export const buscarProfissionalPorId = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ erro: "ID inválido fornecido" });
        }

        const profissional = await ProfissionalModel.buscarProfissionalPorId(id);

        if (!profissional) {
            return res.status(404).json({ erro: "Profissional não encontrado" });
        }

        res.json(profissional);
    } catch (error) {
        console.error("❌ Erro na busca por ID:", error);
        res.status(500).json({ 
            erro: "Erro interno no servidor", 
            detalhe: error.message 
        });
    }
};

export const filtrarPorEspecialidade = async (req, res) => {
    try {
        const nome = req.params.nome.toLowerCase();
        const todos = await ProfissionalModel.buscarTodosOsProfissionais();
        const filtrados = todos.filter(p =>
            p.especialidade && p.especialidade.toLowerCase().includes(nome)
        );
        res.json(filtrados);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao filtrar profissionais" });
    }
};

export const adicionarProfissional = async (req, res) => {
    try {
        const novo = req.body;
        await ProfissionalModel.criarProfissional(novo);
        res.json({ mensagem: "Profissional adicionado com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao adicionar profissional" });
    }
};

export const atualizarProfissional = async (req, res) => {
    res.json({ mensagem: "Atualização solicitada" });
};

export const deletarProfissional = async (req, res) => {
    res.json({ mensagem: "Remoção solicitada" });
};

// --- NOVOS CONTROLADORES DO PAINEL DO PROFISSIONAL ---
export const listarAgendamentosProfissional = async (req, res) => {
    try {
        const idProfissional = req.session?.profissionalId;

        if (!idProfissional) {
            return res.status(401).json({ erro: "Sessão expirada ou profissional não autenticado." });
        }

        const consultas = await ProfissionalModel.buscarAgendamentosPorProfissional(idProfissional);

        // Injeta o e-mail salvo na sessão para preencher o cabeçalho no front-end
        const resultado = consultas.map(c => ({
            ...c,
            email_profissional: req.session.usuarioEmail || ""
        }));

        return res.json(resultado);
    } catch (erro) {
        console.error("Erro ao buscar agendamentos do profissional:", erro.message);
        return res.status(500).json({ erro: "Erro ao buscar consultas do profissional." });
    }
};

export const atualizarStatusAgendamento = async (req, res) => {
    try {
        const { id_agendamento, status } = req.body;

        if (!id_agendamento || !status) {
            return res.status(400).json({ ok: false, erro: "ID e status são obrigatórios." });
        }

        await ProfissionalModel.atualizarStatusAgendamentoBanco(id_agendamento, status);
        return res.json({ ok: true, mensagem: `Status atualizado para: ${status}` });
    } catch (erro) {
        console.error("Erro ao atualizar status:", erro.message);
        return res.status(500).json({ ok: false, erro: "Erro interno ao atualizar status." });
    }
};

export const salvarProntuario = async (req, res) => {
    try {
        const { email_paciente, nome_paciente, anamnese, conduta, id_agendamento } = req.body;

        if (!email_paciente || !anamnese) {
            return res.status(400).json({ ok: false, erro: "E-mail do paciente e anamnese são obrigatórios." });
        }

        await ProfissionalModel.salvarProntuarioBanco({
            email_paciente,
            nome_paciente,
            anamnese,
            conduta,
            id_agendamento
        });

        return res.json({ ok: true, mensagem: "Prontuário salvo com sucesso!" });
    } catch (erro) {
        console.error("Erro ao salvar prontuário:", erro.message);
        return res.status(500).json({ ok: false, erro: "Erro ao salvar prontuário." });
    }
};

export const buscarProntuariosPaciente = async (req, res) => {
    try {
        const { email } = req.params;
        const historico = await ProfissionalModel.buscarProntuariosPorEmail(email);
        return res.json(historico);
    } catch (erro) {
        console.error("Erro ao buscar prontuários:", erro.message);
        return res.status(500).json({ erro: "Erro ao buscar prontuários." });
    }
};

// --- AUTENTICAÇÃO / LOGIN DO PROFISSIONAL ---

export const loginProfissional = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ ok: false, erro: "E-mail e senha são obrigatórios." });
        }

        // Busca o profissional no banco via Model
        const profissional = await ProfissionalModel.buscarProfissionalPorEmail(email);

        if (!profissional) {
            return res.status(401).json({ ok: false, erro: "E-mail ou senha incorretos." });
        }

        // Validação da senha em texto simples (ou compare com bcrypt se utilizar hash)
        if (profissional.senha !== senha) {
            return res.status(401).json({ ok: false, erro: "E-mail ou senha incorretos." });
        }

        // Armazena na sessão do Express
        req.session.usuarioEmail = profissional.email;
        req.session.profissionalId = profissional.id_profissional;
        req.session.tipoUsuario = "profissional";

        return res.json({
            ok: true,
            redirect: "/painel-profissional"
        });

    } catch (erro) {
        console.error("❌ Erro no login do profissional:", erro);
        return res.status(500).json({ ok: false, erro: "Erro interno ao processar o login." });
    }
};
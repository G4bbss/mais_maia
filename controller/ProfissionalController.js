import * as ProfissionalModel from "../model/Profissional.js";

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
        // Se já tiver uma função no Model:
        // const resultado = await ProfissionalModel.criarProfissional(novo);
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
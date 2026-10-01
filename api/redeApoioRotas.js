import express from "express";
import db from "../config/banco.js"; // Conexão com o MySQL
import { 
    listarChamados, 
    obterPerfil, 
    salvarPerfil, 
    loginRedeApoio 
} from "../controller/redeApoioController.js";

const router = express.Router();

// Rotas de Autenticação e Perfil
router.post("/login", loginRedeApoio);
router.get("/perfil", obterPerfil);
router.put("/perfil", salvarPerfil);

// 🔹 GET /api/chamados -> Listar chamados existentes
router.get("/chamados", listarChamados);

/**
 * Função auxiliar para converter o nome do dia da semana (ex: "Segunda-feira")
 * na próxima data válida no formato YYYY-MM-DD, cravado no Horário de Brasília (UTC-3).
 */
function obterProximaDataPorDiaSemana(diaTexto) {
    const dias = {
        "Domingo": 0,
        "Segunda-feira": 1,
        "Terça-feira": 2,
        "Quarta-feira": 3,
        "Quinta-feira": 4,
        "Sexta-feira": 5,
        "Sábado": 6
    };

    const diaDesejado = dias[diaTexto];

    // Obtém o momento atual garantindo o fuso horário de Brasília (America/Sao_Paulo)
    const agora = new Date();
    const dataSP = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

    // Função interna para formatar como YYYY-MM-DD
    const formatarYYYYMMDD = (d) => {
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, "0");
        const dia = String(d.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
    };

    // Caso o dia passado não esteja no mapeamento, retorna a data atual de SP
    if (diaDesejado === undefined) {
        return formatarYYYYMMDD(dataSP);
    }

    const diaAtual = dataSP.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    let diferenca = diaDesejado - diaAtual;

    // Se o dia escolhido for hoje ou já tiver passado na semana, agenda para a próxima semana
    if (diferenca <= 0) {
        diferenca += 7;
    }

    dataSP.setDate(dataSP.getDate() + diferenca);

    return formatarYYYYMMDD(dataSP);
}

// 🔹 POST /api/chamados -> Criar novo chamado no MySQL
router.post("/chamados", async (req, res) => {
    try {
        const { id_rede_apoio, endereco_usuario, motivo, data_chamado, horario } = req.body;
        const id_usuario = req.session?.usuarioId || req.session?.usuario?.id_usuario || 1;

        // Se já for uma data enviada no formato YYYY-MM-DD, mantém.
        // Se for texto como "Segunda-feira", calcula no fuso de Brasília.
        const dataFormatada = (data_chamado && data_chamado.includes("-") && data_chamado.length === 10)
            ? data_chamado 
            : obterProximaDataPorDiaSemana(data_chamado);

        const sql = `
            INSERT INTO chamado 
            (USUARIO_id_usuario, REDE_APOIO_id_rede_apoio, endereco_usuario, motivo, data_chamado, horario) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            id_usuario,
            id_rede_apoio,
            endereco_usuario,
            motivo,
            dataFormatada,
            horario
        ]);

        return res.status(201).json({ mensagem: "Chamado agendado com sucesso!" });
    } catch (erro) {
        console.error("Erro ao salvar chamado no MySQL:", erro);
        return res.status(500).json({ mensagem: "Erro ao salvar chamado no banco de dados." });
    }
});

// 🔹 GET /api/rede-apoio -> Listar voluntárias cadastradas no MySQL
router.get("/rede-apoio", async (req, res) => {
    try {
        const [linhas] = await db.query("SELECT * FROM rede_apoio");
        return res.json(linhas);
    } catch (erro) {
        console.error("Erro ao buscar rede de apoio:", erro);
        return res.status(500).json({ mensagem: "Erro ao buscar rede de apoio." });
    }
});

export default router;
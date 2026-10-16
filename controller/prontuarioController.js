import db from "../config/banco.js";

// Colunas reais da tabela `prontuario`:
// id_prontuario (AI), AGENDAMENTO_id_agendamento, nome_paciente, fase_paciente,
// sintomas, tempo_sintomas, nivel_dor, alergias, medicamentos_uso, orientacoes

const ProntuarioController = {
    // POST /api/profissionais/prontuario  (também /profissional/prontuario)
    // Aceita o formulário da telemedicina e o do painel do profissional.
    async salvar(req, res) {
        try {
            const b = req.body || {};

            const idAgendamentoBruto =
                b.AGENDAMENTO_id_agendamento ?? b.id_agendamento ?? b.idAgendamento ?? null;
            const idAgendamento =
                idAgendamentoBruto !== null && idAgendamentoBruto !== "" && !isNaN(Number(idAgendamentoBruto))
                    ? Number(idAgendamentoBruto)
                    : null;

            // Painel do profissional manda "anamnese" e "conduta"
            const sintomas = String(b.sintomas ?? b.anamnese ?? "").trim();
            const orientacoes = String(b.orientacoes ?? b.conduta ?? "").trim();

            if (!sintomas) {
                return res.status(400).json({
                    ok: false,
                    erro: "Queixa principal / anamnese é obrigatória."
                });
            }

            const nivelDor = ["Leve", "Moderada", "Moderado", "Intensa", "Intenso"].includes(b.nivel_dor)
                ? b.nivel_dor
                : (b.nivel_dor || "Leve");

            const sql = `
                INSERT INTO prontuario
                (AGENDAMENTO_id_agendamento, nome_paciente, fase_paciente, sintomas,
                 tempo_sintomas, nivel_dor, alergias, medicamentos_uso, orientacoes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [resultado] = await db.query(sql, [
                idAgendamento,
                b.nome_paciente || null,
                b.fase_paciente || null,
                sintomas,
                b.tempo_sintomas || null,
                nivelDor,
                b.alergias || null,
                b.medicamentos_uso || null,
                orientacoes || null
            ]);

            // Marca a consulta como realizada, exceto quando for apenas rascunho
            if (idAgendamento && b.finalizado !== false) {
                try {
                    await db.query(
                        "UPDATE agendamento SET status = 'Realizada' WHERE id_agendamento = ?",
                        [idAgendamento]
                    );
                } catch (e) {
                    console.warn("Prontuário salvo, mas não foi possível atualizar o status:", e.message);
                }
            }

            return res.status(201).json({
                ok: true,
                id_prontuario: resultado.insertId,
                mensagem: "Prontuário salvo com sucesso!"
            });
        } catch (erro) {
            console.error("Erro ao salvar prontuário:", erro);
            return res.status(500).json({
                ok: false,
                erro: "Erro ao salvar no banco: " + (erro.sqlMessage || erro.message)
            });
        }
    },

    // GET /profissional/prontuario/:email  -> histórico do paciente (via agendamento)
    async buscarPorEmail(req, res) {
        try {
            const { email } = req.params;
            const [linhas] = await db.query(
                `SELECT p.id_prontuario,
                        p.nome_paciente,
                        p.fase_paciente,
                        p.sintomas,
                        p.tempo_sintomas,
                        p.nivel_dor,
                        p.alergias,
                        p.medicamentos_uso,
                        p.orientacoes,
                        DATE_FORMAT(a.data_agendamento, '%d/%m/%Y') AS data_formatada
                   FROM prontuario p
                   JOIN agendamento a ON a.id_agendamento = p.AGENDAMENTO_id_agendamento
                  WHERE a.email_paciente = ?
                  ORDER BY p.id_prontuario DESC`,
                [email]
            );

            const historico = linhas.map(h => ({
                ...h,
                anamnese: [
                    h.fase_paciente && `Fase: ${h.fase_paciente}`,
                    h.sintomas && `Queixa: ${h.sintomas}`,
                    h.tempo_sintomas && `Tempo: ${h.tempo_sintomas}`,
                    h.nivel_dor && `Intensidade: ${h.nivel_dor}`,
                    h.alergias && `Alergias: ${h.alergias}`,
                    h.medicamentos_uso && `Medicamentos: ${h.medicamentos_uso}`
                ].filter(Boolean).join(" | "),
                conduta: h.orientacoes
            }));

            return res.json(historico);
        } catch (erro) {
            console.error("Erro ao buscar prontuários:", erro);
            return res.status(500).json({ erro: "Erro ao buscar prontuários." });
        }
    }
};

export default ProntuarioController;

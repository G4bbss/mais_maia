import db from "../config/banco.js";

const ProntuarioController = {
    async salvar(req, res) {
        try {
            const { email_paciente, nome_paciente, anamnese, conduta, id_agendamento } = req.body;

            // email_paciente NOT NULL kasqanrayku hallch'ana
            const emailTratado = (email_paciente && email_paciente.trim() !== "") 
                ? email_paciente.trim() 
                : (req.session?.usuarioEmail || req.session?.usuario?.email || "");

            if (!emailTratado) {
                return res.status(400).json({ mensagem: "E-mail do paciente é obrigatório." });
            }

            // anamnese NOT NULL kasqanrayku chusaqlla kachun mana null kanankama
            const anamneseTratada = (anamnese && anamnese.trim() !== "") 
                ? anamnese.trim() 
                : "Sem anamnese registrada.";

            const condutaTratada = (conduta && conduta.trim() !== "") ? conduta.trim() : null;

            const sql = `
                INSERT INTO prontuario (email_paciente, nome_paciente, anamnese, conduta, id_agendamento, data_registro) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `;

            await db.query(sql, [
                emailTratado,
                nome_paciente || null,
                anamneseTratada,
                condutaTratada,
                id_agendamento || null
            ]);

            return res.status(201).json({ mensagem: "Prontuário salvo com sucesso!" });
        } catch (erro) {
            console.error("Erro ao salvar prontuário:", erro);
            return res.status(500).json({ mensagem: "Erro interno no servidor ao salvar prontuário." });
        }
    }
};

export default ProntuarioController;
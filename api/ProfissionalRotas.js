import { Router } from "express";
import * as profissionalController from "../controller/profissionalController.js";
import ProntuarioController from "../controller/prontuarioController.js";

const router = Router();

// Rota de Login do Profissional
router.post("/login", profissionalController.loginProfissional);

// CRUD e Filtros Gerais
router.get("/", profissionalController.listarProfissionais);
router.get("/especialidade/:nome", profissionalController.filtrarPorEspecialidade);

// Rotas do Painel Médico / Profissional (Rotas estáticas antes das rotas com :id)
router.get("/agendamentos", profissionalController.listarAgendamentosProfissional);
router.post("/agendamento/status", profissionalController.atualizarStatusAgendamento);
router.post("/prontuario", ProntuarioController.salvar);
router.get("/prontuario/:email", ProntuarioController.buscarPorEmail);

// Rotas com Parâmetros Dinâmicos
router.get("/:id", profissionalController.buscarProfissionalPorId);
router.post("/", profissionalController.adicionarProfissional);
router.put("/:id", profissionalController.atualizarProfissional);
router.delete("/:id", profissionalController.deletarProfissional);

export default router;
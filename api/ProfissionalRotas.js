// profissionalRoutes.js
import { Router } from "express";
import * as profissionalController from "../controller/profissionalController.js";

const router = Router();

router.get("/", profissionalController.listarProfissionais);
router.get("/:id", profissionalController.buscarProfissionalPorId);
router.get("/especialidade/:nome", profissionalController.filtrarPorEspecialidade);
router.post("/", profissionalController.adicionarProfissional);
router.put("/:id", profissionalController.atualizarProfissional);
router.delete("/:id", profissionalController.deletarProfissional);

export default router;
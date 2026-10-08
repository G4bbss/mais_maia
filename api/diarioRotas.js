import express from "express";
import DiarioController from "../controller/diarioController.js";

const router = express.Router();

// Rota para salvar um novo registro no diário
router.post("/", DiarioController.salvar);

// Rota para listar o histórico do diário do usuário
router.get("/", DiarioController.listar);

export default router;
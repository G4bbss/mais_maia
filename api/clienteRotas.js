import express from "express";
// Importamos todas as funções exportadas do controller (com a extensão .js obrigatória)
import * as clienteController from "../controller/ClienteController.js";

const router = express.Router();

// Middleware para as rotas de API que exigem login (retorna JSON em vez de redirecionar)
function exigirLoginApi(req, res, next) {
  if (req.session && req.session.usuarioEmail) {
    return next();
  }
  return res.status(401).json({ erro: "Não autenticado. Faça login novamente." });
}

// ===================== Autenticação Tradicional =====================
router.post("/cadastro", clienteController.cadastrar);
router.post("/login", clienteController.login);
router.post("/logout", clienteController.logout);

// ===================== Autenticação Google e E-mail =====================
router.post("/google-auth", clienteController.googleAuth);
router.post("/verificar", clienteController.verificarCodigo);

// ===================== Recuperação de Senha =====================
router.post("/esqueci-senha", clienteController.solicitarRecuperacaoSenha);
router.post("/redefinir-senha", clienteController.redefinirSenha);

// ===================== Perfil e Dados do Usuário Logado =====================
router.get("/me", exigirLoginApi, clienteController.meusDados);
router.get("/perfil", exigirLoginApi, clienteController.paginaPerfil);

// Aceita tanto /perfil quanto /atualizar-perfil para salvar os dados
router.post("/perfil", exigirLoginApi, clienteController.atualizarPerfil);
router.post("/atualizar-perfil", exigirLoginApi, clienteController.atualizarPerfil);

// ===================== Agendamentos =====================
router.post("/agendamento", clienteController.agendarConsulta);
router.get("/meus-agendamento/:email", clienteController.meusAgendamentos);
router.post("/cancelar-agendamento", clienteController.cancelarAgendamento);

// ✅ Exportação padrão para funcionar com ES Modules
export default router;
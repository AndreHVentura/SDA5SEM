import { Router } from "express";
import {
  login,
  atualizarIptu,
  novoLogin,
  getIptuPorIdUsuario,
  getQRCodeOrCodBarras,
  requireAuth,
} from "../controllers/usuarioController";

const router = Router();

// Rotas públicas
router.post("/login", login);
router.post("/novo-login", novoLogin);
router.get("/codigo-qr-ou-barra", getQRCodeOrCodBarras);

// Rotas protegidas
router.get("/iptu-por-usuario", requireAuth, getIptuPorIdUsuario);
router.post("/atualizar-iptu", requireAuth, atualizarIptu);

// Rota de logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao fazer logout" });
    }
    res.json({ success: true, message: "Logout realizado" });
  });
});

export default router;

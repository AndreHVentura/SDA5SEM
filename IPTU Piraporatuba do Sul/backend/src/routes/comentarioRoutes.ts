import { Router } from "express";
import { criarComentario, listarComentarios, deletarComentario } from "../controllers/comentarioController";
import { requireAuth } from "../controllers/usuarioController";

const router = Router();

// Rotas públicas
router.get("/", listarComentarios);

// Rotas protegidas
router.post("/", requireAuth, criarComentario);
router.delete("/:id", requireAuth, deletarComentario);

export default router;
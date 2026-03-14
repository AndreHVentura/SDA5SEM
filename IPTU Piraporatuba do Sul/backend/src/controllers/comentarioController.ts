import { Request, Response } from "express";
import db from "../database";
import xss from "xss";

interface Comentario {
  id: number;
  texto: string;
  usuario_id: number;
  created_at?: Date;
}

export const criarComentario = async (req: Request, res: Response) => {
  const { texto, usuarioId } = req.body;

  // Validação básica
  if (!texto || !usuarioId) {
    return res.status(400).json({ error: "Texto e usuário são obrigatórios" });
  }

  // Validar se usuarioId é número
  if (isNaN(Number(usuarioId))) {
    return res.status(400).json({ error: "ID de usuário inválido" });
  }

  // Validar tamanho do texto
  if (texto.length > 500) {
    return res
      .status(400)
      .json({ error: "Texto muito longo (máx 500 caracteres)" });
  }

  // Sanitizar texto contra XSS
  const textoSanitizado = xss(texto, {
    whiteList: {}, // Não permitir nenhuma tag HTML
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script"],
  });

  const query = `INSERT INTO comentario (texto, usuario_id, created_at) VALUES ($1, $2, NOW()) RETURNING *`;

  try {
    const result = await db.query<Comentario>(query, [
      textoSanitizado,
      usuarioId,
    ]);
    res.status(201).json({
      message: "Comentário criado",
      comentario: result.rows[0],
    });
  } catch (err: any) {
    console.error("Erro ao criar comentário:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const listarComentarios = async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT c.*, u.nome as usuario_nome 
      FROM comentario c 
      JOIN usuario u ON c.usuario_id = u.id 
      ORDER BY c.id DESC 
      LIMIT 100
    `;
    const result = await db.query(query);

    // Sanitizar textos antes de enviar
    const comentariosSanitizados = result.rows.map((comentario: any) => ({
      ...comentario,
      texto: xss(comentario.texto, {
        whiteList: {},
        stripIgnoreTag: true,
      }),
    }));

    res.json(comentariosSanitizados);
  } catch (err: any) {
    console.error("Erro ao listar comentários:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deletarComentario = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const query = "DELETE FROM comentario WHERE id = $1 RETURNING *";
    const result = await db.query(query, [id]);

    if (result.rowCount && result.rowCount > 0) {
      res.json({ message: "Comentário deletado" });
    } else {
      res.status(404).json({ error: "Comentário não encontrado" });
    }
  } catch (err: any) {
    console.error("Erro ao deletar comentário:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

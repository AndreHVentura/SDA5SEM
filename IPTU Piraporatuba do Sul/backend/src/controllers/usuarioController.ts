import { Request, Response } from "express";
import db from "../database";
import bcrypt from "bcrypt";

// Interfaces para tipagem
interface User {
  id: number;
  email: string;
  nome: string;
  senha: string;
  tipo_usuario_id: number;
}

interface Iptu {
  id: number;
  nome: string;
  usuario_id: number | null;
  valor: number;
}

// Função auxiliar para validar email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função auxiliar para normalizar nome
export function normalizarNome(nome: string): string {
  if (!nome) return "";

  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " "); // Remove espaços extras
}

// Função auxiliar para escapar HTML (usada apenas no getQRCodeOrCodBarras)
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validação básica
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email e senha obrigatórios" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Email inválido" });
  }

  const query = `SELECT * FROM usuario WHERE email = $1`;

  try {
    const result = await db.query<User>(query, [email]);

    if (result.rowCount && result.rowCount > 0) {
      const user = result.rows[0];

      // Comparar senha com bcrypt
      const senhaValida = await bcrypt.compare(password, user.senha);

      if (senhaValida) {
        // Criar sessão
        (req.session as any).userId = user.id;
        (req.session as any).userEmail = user.email;

        const { senha, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
      } else {
        // Atraso proposital para dificultar brute force
        await new Promise((resolve) => setTimeout(resolve, 1000));
        res.status(401).json({ success: false, message: "Falha no login" });
      }
    } else {
      // Atraso proposital para dificultar brute force
      await new Promise((resolve) => setTimeout(resolve, 1000));
      res.status(401).json({ success: false, message: "Falha no login" });
    }
  } catch (err: any) {
    console.error("Erro no login:", err);
    res
      .status(500)
      .json({ success: false, message: "Erro interno do servidor" });
  }
};

export const novoLogin = async (req: Request, res: Response) => {
  const { email, password, nome } = req.body;

  // Validações
  if (!email || !password || !nome) {
    return res
      .status(400)
      .json({ success: false, message: "Todos os campos são obrigatórios" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Email inválido" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Senha deve ter no mínimo 6 caracteres",
      });
  }

  if (nome.length > 120) {
    return res
      .status(400)
      .json({ success: false, message: "Nome muito longo" });
  }

  const nomeNormalizado = normalizarNome(nome);

  try {
    // Verifica se email já existe
    const emailExiste = await db.query(
      "SELECT id FROM usuario WHERE email = $1",
      [email],
    );
    if (emailExiste.rowCount && emailExiste.rowCount > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Email já cadastrado" });
    }

    const queryNomeIpuExiste = "SELECT * FROM iptu WHERE nome = $1";
    const iptuResult = await db.query<Iptu>(queryNomeIpuExiste, [
      nomeNormalizado,
    ]);

    if (iptuResult.rowCount && iptuResult.rowCount > 0) {
      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Query parameterizada
      const query = `INSERT INTO usuario (email, senha, nome, tipo_usuario_id) VALUES ($1, $2, $3, 3) RETURNING id`;
      const result = await db.query<{ id: number }>(query, [
        email,
        hashedPassword,
        nome,
      ]);

      const usuarioId = result.rows[0].id;

      // Query parameterizada
      const queryUpdateTabelaIptu = `UPDATE iptu SET usuario_id = $1 WHERE nome = $2`;
      await db.query(queryUpdateTabelaIptu, [usuarioId, nomeNormalizado]);

      res.json({
        success: true,
        message: "Usuário criado com sucesso",
        user: { id: usuarioId, email, nome },
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Nome '${nome}' não encontrado no cadastro de munícipes`,
      });
    }
  } catch (err: any) {
    console.error("Erro no cadastro:", err);
    res
      .status(500)
      .json({ success: false, message: "Erro interno do servidor" });
  }
};

export const atualizarIptu = async (req: Request, res: Response) => {
  const { usuarioId, novoValor } = req.body;

  if (!usuarioId || !novoValor) {
    return res
      .status(400)
      .json({ error: "usuarioId e novoValor são obrigatórios" });
  }

  // Validar se usuarioId é número
  if (isNaN(Number(usuarioId))) {
    return res.status(400).json({ error: "ID de usuário inválido" });
  }

  // Validar se novoValor é número
  if (isNaN(Number(novoValor))) {
    return res.status(400).json({ error: "Valor inválido" });
  }

  // Query parameterizada
  const query = `UPDATE iptu SET valor = $1 WHERE usuario_id = $2`;

  try {
    const result = await db.query(query, [novoValor, usuarioId]);

    if (result.rowCount && result.rowCount > 0) {
      res.json({ message: "IPTU atualizado" });
    } else {
      res.status(404).json({ error: "IPTU não encontrado para este usuário" });
    }
  } catch (err: any) {
    console.error("Erro ao atualizar IPTU:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getIptuPorIdUsuario = async (req: Request, res: Response) => {
  const usuarioId = req.query.usuarioId as string;

  if (!usuarioId) {
    return res.status(400).json({ error: "usuarioId é obrigatório" });
  }

  // Validar se usuarioId é número
  if (isNaN(Number(usuarioId))) {
    return res.status(400).json({ error: "ID de usuário inválido" });
  }

  // Query parameterizada
  const query = `SELECT * FROM iptu WHERE usuario_id = $1`;

  try {
    const result = await db.query<Iptu>(query, [usuarioId]);
    res.json({ iptu: result.rows });
  } catch (err: any) {
    console.error("Erro ao buscar IPTU:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getQRCodeOrCodBarras = async (req: Request, res: Response) => {
  const tipo = req.query.tipo as string;

  // Validação do tipo
  const tiposPermitidos = ["codigoDeBarras", "qrcode"];
  if (!tiposPermitidos.includes(tipo)) {
    return res.status(400).send("Tipo inválido");
  }

  let codigoHtml = "";
  if (tipo === "codigoDeBarras") {
    codigoHtml = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=123456789" alt="Código de barras" />`;
  } else if (tipo === "qrcode") {
    codigoHtml = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=QRCodeDemo" alt="QR Code" />`;
  }

  // Escape do tipo para evitar XSS
  const tipoEscapado = escapeHtml(tipo);

  res.send(`
    <h2>Tipo selecionado: ${tipoEscapado}</h2>
    ${codigoHtml}
  `);
};

// Middleware de autenticação
export const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!(req.session as any).userId) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
};

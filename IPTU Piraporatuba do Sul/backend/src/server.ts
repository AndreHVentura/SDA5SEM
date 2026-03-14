import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import dotenv from "dotenv";
import userRoutes from "./routes/usuarioRoutes";
import commentRoutes from "./routes/comentarioRoutes";

dotenv.config();

const app = express();

// Segurança com Helmet
app.use(helmet());

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: "Muitas requisições deste IP, tente novamente mais tarde.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting mais restrito para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentativas de login a cada 15 minutos
  message: "Muitas tentativas de login, tente novamente mais tarde.",
});
app.use("/usuario/login", loginLimiter);
app.use("/usuario/novo-login", loginLimiter);

// CORS configurado
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Session para gerenciar login
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret-temporario",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 horas
    },
  }),
);

app.use(express.json({ limit: "10mb" }));

// Rotas
app.use("/usuario", userRoutes);
app.use("/comentario", commentRoutes);

// Rota de saúde para testes
app.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Middleware de erro global
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Erro não tratado:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  },
);

app.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});

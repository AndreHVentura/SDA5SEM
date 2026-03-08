import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
    const navigate = useNavigate();
    const [isRegistering, setIsRegistering] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nome, setNome] = useState("");
    const [message, setMessage] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                "http://localhost:3001/usuario/login",
                { email, password }
            );
            const user = response.data.user;

            // salvando no localStorage
            localStorage.setItem("user", JSON.stringify(user));

            navigate("/dashboard");
        } catch {
            setMessage("Erro no login");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                "http://localhost:3001/usuario/novo-login",
                { email, password, nome }
            );
            if (response.data.success) {
                setMessage("Usuário criado com sucesso!");
                setIsRegistering(false);
            }
        } catch {
            setMessage("Erro no cadastro");
        }
    };

    return (
        <div style={styles.container}>
            <h1>{isRegistering ? "Criar Conta" : "Login"}</h1>

            <form
                onSubmit={isRegistering ? handleRegister : handleLogin}
                style={styles.form}
            >
                {isRegistering && (
                    <input
                        type="text"
                        placeholder="Nome Completo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        maxLength={120}
                        required
                    />
                )}

                <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={100}
                    required
                />

                <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={8}
                    required
                />

                <button type="submit" style={styles.button}>
                    {isRegistering ? "Cadastrar" : "Entrar"}
                </button>
            </form>

            <p style={{ marginTop: 10 }}>{message}</p>

            <button
                onClick={() => {
                    setMessage("");
                    setIsRegistering(!isRegistering);
                }}
                style={styles.linkButton}
            >
                {isRegistering
                    ? "Já tem conta? Fazer login"
                    : "Não tem conta? Criar uma"}
            </button>
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "Arial",
    },
    form: {
        display: "flex",
        flexDirection: "column" as const,
        width: "320px",
    },
    input: {
        marginBottom: "10px",
        padding: "8px",
        fontSize: "16px",
    },
    button: {
        padding: "10px",
        fontSize: "16px",
        cursor: "pointer",
    },
    linkButton: {
        marginTop: "15px",
        background: "none",
        border: "none",
        color: "blue",
        cursor: "pointer",
        textDecoration: "underline",
    },
};

export default Login;
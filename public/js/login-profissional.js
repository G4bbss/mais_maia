// =========================================================================
// 1. GOOGLE SIGN-IN
// =========================================================================

/**
 * Processa o token JWT enviado pelo Google Sign-In e redireciona o utilizador
 */
async function lidarComRespostaGoogle(response) {
    try {
        const res = await fetch("/cliente/google-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: response.credential })
        });

        const data = await res.json();

        if (data.ok) {
            if (data.cadastrado) {
                window.location.href = data.redirect || "/";
            } else {
                const query = `?nome=${encodeURIComponent(data.nome || '')}&email=${encodeURIComponent(data.email || '')}&foto=${encodeURIComponent(data.foto || '')}`;
                window.location.href = (data.redirect || "/cadastro") + query;
            }
        } else {
            alert(data.erro || "Erro ao verificar autenticação com o Google.");
        }
    } catch (erro) {
        console.error("Erro no login Google:", erro);
        alert("Erro ao conectar com o servidor. Tente novamente mais tarde.");
    }
}

// Disponibiliza no escopo global para a API do Google
window.lidarComRespostaGoogle = lidarComRespostaGoogle;

/**
 * Inicializa a biblioteca Google Identity Services e renderiza o botão
 */
function inicializarGoogleSignIn() {
    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
            client_id: "388467000446-ourhp19ai6janfmbcg1tjjes0gbht3gi.apps.googleusercontent.com",
            callback: lidarComRespostaGoogle
        });

        const containerBotao = document.getElementById("buttonDiv") || document.querySelector(".g_id_signin");
        if (containerBotao) {
            google.accounts.id.renderButton(containerBotao, {
                theme: "outline",
                size: "large",
                width: "100%"
            });
        }
    }
}


// =========================================================================
// 3. EVENTOS DOM (INICIALIZAÇÃO E FORMULÁRIO)
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializa o botão Google Sign-In
    inicializarGoogleSignIn();

    // 2. Restaura dados salvos pelo "Lembrar-me"
    const savedEmail = localStorage.getItem("email");
    const savedCheck = localStorage.getItem("lembrar");
    const emailInput = document.querySelector('input[name="Email"]');
    const lembrarCheck = document.getElementById("lembrar");

    if (savedEmail && savedCheck === "true") {
        if (emailInput) emailInput.value = savedEmail;
        if (lembrarCheck) lembrarCheck.checked = true;
    }

    // 3. Submissão do formulário consultando o banco via API
    const formLogin = document.querySelector("form");
    if (formLogin) {
        formLogin.addEventListener("submit", async function (e) {
            e.preventDefault(); // Impede a navegação direta do HTML

            const senhaInput = document.querySelector('input[name="Senha"]');
            const email = emailInput ? emailInput.value.trim() : "";
            const senha = senhaInput ? senhaInput.value.trim() : "";

            if (!email || !senha) {
                alert("Por favor, preencha o e-mail e a senha.");
                return;
            }

            try {
                const res = await fetch("/profissional/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, senha })
                });

                const data = await res.json();

                if (res.ok && data.ok) {
                    // Gerenciamento do "Lembrar-me"
                    if (lembrarCheck) {
                        if (lembrarCheck.checked && email) {
                            localStorage.setItem("email", email);
                            localStorage.setItem("lembrar", "true");
                        } else {
                            localStorage.removeItem("email");
                            localStorage.removeItem("lembrar");
                        }
                    }

                    // Redireciona para a página do cliente
                    window.location.href = data.redirect || "/painel-profissional.html";
                } else {
                    alert(data.erro || "E-mail ou senha incorretos.");
                }
            } catch (erro) {
                console.error("Erro no login:", erro);
                alert("Erro ao conectar com o servidor.");
            }
        });
    }
});
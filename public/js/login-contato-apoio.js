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
            client_id: "910310455755-ecuctmqtfutt440jbjebr97jdj1pgkk5.apps.googleusercontent.com",
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
// 2. EVENTOS DOM (LOGIN DO CONTATO DE APOIO VIA CHAVE)
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializa o botão Google Sign-In (caso exista na página)
    inicializarGoogleSignIn();

    // 2. Restaura dados salvos pelo "Lembrar-me"
    const savedEmail = localStorage.getItem("email_apoio");
    const savedCheck = localStorage.getItem("lembrar_apoio");
    const emailInput = document.querySelector('input[name="Email"]') || document.querySelectorAll('input')[0];
    const lembrarCheck = document.getElementById("lembrar");

    if (savedEmail && savedCheck === "true") {
        if (emailInput) emailInput.value = savedEmail;
        if (lembrarCheck) lembrarCheck.checked = true;
    }

    // 3. Submissão do formulário do Contato de Apoio
    const formLogin = document.querySelector("form");
    if (formLogin) {
        formLogin.addEventListener("submit", async function (e) {
            e.preventDefault(); // Impede o envio tradicional do HTML

            const inputs = formLogin.querySelectorAll("input");
            const emailElem = document.querySelector('input[name="Email"]') || inputs[0];
            
            // Pega o segundo campo de texto (chave de 10 dígitos)
            const chaveElem = document.querySelector('input[name="chaveAcesso"]') || 
                              document.querySelector('input[name="chave"]') || 
                              document.querySelector('input[name="Senha"]') || 
                              inputs[1];

            const email = emailElem ? emailElem.value.trim() : "";
            const chaveAcesso = chaveElem ? chaveElem.value.trim() : "";

            if (!email || !chaveAcesso) {
                alert("Por favor, preencha o e-mail e a chave de acesso.");
                return;
            }

            try {
                // Rota exata do backend: /cliente/contato-apoio/login
                const res = await fetch("/cliente/contato-apoio/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, chaveAcesso })
                });

                const data = await res.json();

                if (res.ok && data.ok) {
                    // Gerenciamento do "Lembrar-me"
                    if (lembrarCheck) {
                        if (lembrarCheck.checked && email) {
                            localStorage.setItem("email_apoio", email);
                            localStorage.setItem("lembrar_apoio", "true");
                        } else {
                            localStorage.removeItem("email_apoio");
                            localStorage.removeItem("lembrar_apoio");
                        }
                    }

                    // Redireciona para o painel do contato de apoio
                    window.location.href = data.redirect || "/dashboard-contato-apoio.html";
                } else {
                    alert(data.erro || "E-mail ou chave de acesso inválidos.");
                }
            } catch (erro) {
                console.error("Erro no login do contato de apoio:", erro);
                alert("Erro ao conectar com o servidor.");
            }
        });
    }
});
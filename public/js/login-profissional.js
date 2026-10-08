

// =========================================================================
// 2. RECUPERAÇÃO DE SENHA
// =========================================================================

/**
 * Fluxo de esquecimento e redefinição de senha via prompt/API
 */
async function esqueciMinhaSenha(e) {
    if (e) e.preventDefault();

    const emailInput = document.querySelector('input[name="Email"]');
    const emailValor = emailInput ? emailInput.value.trim() : "";
    const email = prompt("Digite seu e-mail cadastrado para redefinir a senha:", emailValor);

    if (!email || !email.trim()) return;

    try {
        const res = await fetch("/cliente/esqueci-senha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Email: email.trim() })
        });

        const data = await res.json();

        if (data.ok) {
            alert("Enviamos um código de verificação para o seu e-mail!");

            const codigo = prompt("Digite o código recebido no seu e-mail:");
            if (!codigo || !codigo.trim()) return;

            const novaSenha = prompt("Digite a sua nova senha:");
            if (!novaSenha || !novaSenha.trim()) return;

            const resRedefinir = await fetch("/cliente/redefinir-senha", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Email: email.trim(),
                    Codigo: codigo.trim(),
                    NovaSenha: novaSenha
                })
            });

            const dataRedefinir = await resRedefinir.json();

            if (dataRedefinir.ok) {
                alert(dataRedefinir.mensagem || "Senha alterada com sucesso! Você já pode entrar.");
            } else {
                alert(dataRedefinir.erro || "Não foi possível alterar a senha.");
            }
        } else {
            alert(data.erro || "Não foi possível processar a solicitação.");
        }
    } catch (erro) {
        console.error("Erro na recuperação de senha:", erro);
        alert("Erro ao conectar com o servidor.");
    }
}

window.esqueciMinhaSenha = esqueciMinhaSenha;

/// =========================================================================
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
            e.preventDefault();

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

                    // Redireciona para o painel do profissional
                    window.location.href = data.redirect || "/painel-profissional";
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

// =========================================================================
// 1. RECUPERAÇÃO DE SENHA (REDE DE APOIO)
// =========================================================================

/**
 * Fluxo de esquecimento e redefinição de senha via prompt/API
 */
async function esqueciMinhaSenha(e) {
    if (e) e.preventDefault();

    const emailInput = document.querySelector('input[name="Email"]');
    const emailValor = emailInput ? emailInput.value.trim() : "";
    const email = prompt("Digite seu e-mail cadastrado na Rede de Apoio para redefinir a senha:", emailValor);

    if (!email || !email.trim()) return;

    try {
        const res = await fetch("/rede-apoio/esqueci-senha", {
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

            const resRedefinir = await fetch("/rede-apoio/redefinir-senha", {
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
        console.error("Erro na recuperação de senha da Rede de Apoio:", erro);
        alert("Erro ao conectar com o servidor.");
    }
}

window.esqueciMinhaSenha = esqueciMinhaSenha;

// =========================================================================
// 2. EVENTOS DOM (INICIALIZAÇÃO E FORMULÁRIO)
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {

    // 1. Restaura dados salvos pelo "Lembrar-me" (Usando chave exclusiva para Rede de Apoio)
    const savedEmail = localStorage.getItem("email_rede_apoio");
    const savedCheck = localStorage.getItem("lembrar_rede_apoio");
    const emailInput = document.querySelector('input[name="Email"]');
    const lembrarCheck = document.getElementById("lembrar");

    if (savedEmail && savedCheck === "true") {
        if (emailInput) emailInput.value = savedEmail;
        if (lembrarCheck) lembrarCheck.checked = true;
    }

    // 2. Submissão do formulário consultando o banco na tabela rede_apoio via API
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
                const res = await fetch("/rede-apoio/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, senha })
                });

                const data = await res.json();

                if (res.ok && data.ok) {
                    // Gerenciamento do "Lembrar-me"
                    if (lembrarCheck) {
                        if (lembrarCheck.checked && email) {
                            localStorage.setItem("email_rede_apoio", email);
                            localStorage.setItem("lembrar_rede_apoio", "true");
                        } else {
                            localStorage.removeItem("email_rede_apoio");
                            localStorage.removeItem("lembrar_rede_apoio");
                        }
                    }

                    // Redireciona para o painel exclusivo da Rede de Apoio
                    window.location.href = data.redirect || "/painel-rede-apoio";
                } else {
                    alert(data.erro || "E-mail ou senha incorretos.");
                }
            } catch (erro) {
                console.error("Erro no login da Rede de Apoio:", erro);
                alert("Erro ao conectar com o servidor.");
            }
        });
    }
});
// Função para tratar a resposta do Google Sign-In
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
                window.location.href = data.redirect;
            } else {
                const query = `?nome=${encodeURIComponent(data.nome)}&email=${encodeURIComponent(data.email)}&foto=${encodeURIComponent(data.foto || '')}`;
                window.location.href = data.redirect + query;
            }
        } else {
            alert(data.erro || "Erro ao verificar com o Google.");
        }
    } catch (erro) {
        console.error("Erro no login Google:", erro);
        alert("Erro ao conectar com o servidor.");
    }
}

// Torna a função globalmente acessível para a API do Google
window.lidarComRespostaGoogle = lidarComRespostaGoogle;

// Executado quando a página carrega
window.onload = function () {
    // 1. Inicializa e Renderiza o Botão do Google
    if (window.google && google.accounts) {
        google.accounts.id.initialize({
            client_id: "910310455755-ecuctmqtfutt440jbjebr97jdj1pgkk5.apps.googleusercontent.com",
            callback: lidarComRespostaGoogle
        });

        const containerBotao = document.getElementById("buttonDiv") || document.querySelector(".g_id_signin");
        if (containerBotao) {
            google.accounts.id.renderButton(containerBotao, {
                theme: "outline",
                size: "large"
            });
        }
    }

    // 2. Verifica e-mail salvo pelo "Lembrar-me"
    const savedEmail = localStorage.getItem("email");
    const savedCheck = localStorage.getItem("lembrar");

    if (savedEmail && savedCheck === "true") {
        const emailInput = document.querySelector('input[name="Email"]');
        const lembrarCheck = document.getElementById("lembrar");
        if (emailInput) emailInput.value = savedEmail;
        if (lembrarCheck) lembrarCheck.checked = true;
    }
};

// Captura o envio do formulário tradicional
const formLogin = document.querySelector("form");
if (formLogin) {
    formLogin.addEventListener("submit", function () {
        const emailInput = document.querySelector('input[name="Email"]');
        const lembrarCheck = document.getElementById("lembrar");

        if (emailInput && lembrarCheck) {
            if (lembrarCheck.checked) {
                localStorage.setItem("email", emailInput.value);
                localStorage.setItem("lembrar", "true");
            } else {
                localStorage.removeItem("email");
                localStorage.removeItem("lembrar");
            }
        }
    });
}

// ===================== FUNÇÃO ESQUECI MINHA SENHA =====================
async function esqueciMinhaSenha(e) {
    if (e) e.preventDefault();

    const emailInput = document.querySelector('input[name="Email"]');
    const emailValor = emailInput ? emailInput.value : "";
    const email = prompt("Digite seu e-mail cadastrado para redefinir a senha:", emailValor);

    if (!email) return;

    try {
        const res = await fetch("/cliente/esqueci-senha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Email: email })
        });

        const data = await res.json();

        if (data.ok) {
            alert("Enviamos um código de verificação para o seu e-mail!");

            const codigo = prompt("Digite o código recebido no seu e-mail:");
            if (!codigo) return;

            const novaSenha = prompt("Digite a sua nova senha:");
            if (!novaSenha) return;

            const resRedefinir = await fetch("/cliente/redefinir-senha", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Email: email, Codigo: codigo, NovaSenha: novaSenha })
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
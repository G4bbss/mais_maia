// =========================================================================
// 1. GOOGLE SIGN-IN
// =========================================================================

/**
 * Processa o token JWT enviado pelo Google Sign-In e redireciona o usuário
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
                window.location.href = data.redirect || "/dashboard";
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

// Torna a função visível globalmente para o script da Google
window.lidarComRespostaGoogle = lidarComRespostaGoogle;

/**
 * Inicializa a biblioteca do Google Identity Services
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
// 2. RECUPERAÇÃO DE SENHA (3 PASSOS COM CORREÇÃO DE CÓDIGO)
// =========================================================================

function esqueciMinhaSenha(e) {
    if (e) e.preventDefault();

    const emailInput = document.querySelector('input[name="Email"]');
    const emailValor = emailInput ? emailInput.value.trim() : "";

    const inputModal = document.getElementById("emailRecuperacao");
    if (inputModal) inputModal.value = emailValor;

    document.getElementById("codigoRecuperacao").value = "";
    document.getElementById("novaSenhaRecuperacao").value = "";

    ocultarMensagensModal();
    document.getElementById("passo1Recuperacao").style.display = "block";
    document.getElementById("passo2Recuperacao").style.display = "none";
    document.getElementById("passo3Recuperacao").style.display = "none";
    document.getElementById("modalRecuperarSenha").style.display = "flex";
}

function fecharModalRecuperacao() {
    document.getElementById("modalRecuperarSenha").style.display = "none";
}

function ocultarMensagensModal() {
    const msgs = document.querySelectorAll('.msg-status');
    msgs.forEach(m => m.style.display = 'none');
}

function voltarParaPasso1() {
    ocultarMensagensModal();
    document.getElementById("passo2Recuperacao").style.display = "none";
    document.getElementById("passo1Recuperacao").style.display = "block";
}

function voltarParaPasso2(mensagemErro = null) {
    ocultarMensagensModal();
    document.getElementById("passo3Recuperacao").style.display = "none";
    document.getElementById("passo2Recuperacao").style.display = "block";

    if (mensagemErro) {
        const msgErro2 = document.getElementById("msgErroPasso2");
        msgErro2.textContent = mensagemErro;
        msgErro2.style.display = "block";
    }
}

async function enviarCodigoRecuperacao() {
    ocultarMensagensModal();
    const email = document.getElementById("emailRecuperacao").value.trim();
    const msgErro1 = document.getElementById("msgErroPasso1");

    if (!email) {
        msgErro1.textContent = "Por favor, digite o seu e-mail.";
        msgErro1.style.display = "block";
        return;
    }

    try {
        const res = await fetch("/cliente/esqueci-senha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Email: email })
        });

        const data = await res.json();

        if (data.ok) {
            document.getElementById("passo1Recuperacao").style.display = "none";
            document.getElementById("passo2Recuperacao").style.display = "block";
        } else {
            msgErro1.textContent = data.erro || "Não foi possível processar a solicitação.";
            msgErro1.style.display = "block";
        }
    } catch (erro) {
        console.error("Erro na recuperação de senha:", erro);
        msgErro1.textContent = "Erro ao conectar com o servidor.";
        msgErro1.style.display = "block";
    }
}

function validarEContinuarCodigo() {
    ocultarMensagensModal();
    const codigo = document.getElementById("codigoRecuperacao").value.trim();
    const msgErro2 = document.getElementById("msgErroPasso2");

    if (!codigo) {
        msgErro2.textContent = "Por favor, digite o código de verificação.";
        msgErro2.style.display = "block";
        return;
    }

    document.getElementById("passo2Recuperacao").style.display = "none";
    document.getElementById("passo3Recuperacao").style.display = "block";
}

async function redefinirSenha() {
    ocultarMensagensModal();
    const email = document.getElementById("emailRecuperacao").value.trim();
    const codigo = document.getElementById("codigoRecuperacao").value.trim();
    const novaSenha = document.getElementById("novaSenhaRecuperacao").value.trim();

    const msgErro3 = document.getElementById("msgErroPasso3");
    const msgSucesso3 = document.getElementById("msgSucessoPasso3");

    if (!novaSenha) {
        msgErro3.textContent = "Por favor, digite a sua nova senha.";
        msgErro3.style.display = "block";
        return;
    }

    try {
        const resRedefinir = await fetch("/cliente/redefinir-senha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                Email: email,
                Codigo: codigo,
                NovaSenha: novaSenha
            })
        });

        const dataRedefinir = await resRedefinir.json();

        if (dataRedefinir.ok) {
            msgSucesso3.textContent = dataRedefinir.mensagem || "Senha alterada com sucesso! Você já pode entrar.";
            msgSucesso3.style.display = "block";
            
            setTimeout(() => {
                fecharModalRecuperacao();
            }, 2000);
        } else {
            const erroTxt = dataRedefinir.erro || "Não foi possível alterar a senha.";
            
            if (erroTxt.toLowerCase().includes("código") || erroTxt.toLowerCase().includes("expirado")) {
                voltarParaPasso2(erroTxt);
            } else {
                msgErro3.textContent = erroTxt;
                msgErro3.style.display = "block";
            }
        }
    } catch (erro) {
        console.error("Erro ao redefinir senha:", erro);
        msgErro3.textContent = "Erro ao conectar com o servidor.";
        msgErro3.style.display = "block";
    }
}

// Disponibiliza as funções no escopo do window
window.esqueciMinhaSenha = esqueciMinhaSenha;
window.fecharModalRecuperacao = fecharModalRecuperacao;
window.enviarCodigoRecuperacao = enviarCodigoRecuperacao;
window.validarEContinuarCodigo = validarEContinuarCodigo;
window.redefinirSenha = redefinirSenha;
window.voltarParaPasso1 = voltarParaPasso1;
window.voltarParaPasso2 = voltarParaPasso2;

// =========================================================================
// 3. EVENTOS DOM (INICIALIZAÇÃO E FORMULÁRIO TRADICIONAL)
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializa o Google Sign-In
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

    // 3. Intercepta o envio do formulário de login tradicional
    const formLogin = document.getElementById("formLogin") || document.querySelector("form");
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
                const res = await fetch("/cliente/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, senha })
                });

                const data = await res.json();

                if (res.ok && data.ok) {
                    if (lembrarCheck) {
                        if (lembrarCheck.checked && email) {
                            localStorage.setItem("email", email);
                            localStorage.setItem("lembrar", "true");
                        } else {
                            localStorage.removeItem("email");
                            localStorage.removeItem("lembrar");
                        }
                    }

                    window.location.href = data.redirect || "/dashboard";
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
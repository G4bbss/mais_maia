/* =========================================================================
   LOGIN DO CONTATO DE APOIO
   Entra somente com: e-mail cadastrado pela usuária + chave de 10 dígitos
   (enviada por e-mail quando a usuária cadastrou o contato).
   ========================================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formLoginContato");
    const campoEmail = document.getElementById("email");
    const campoChave = document.getElementById("chaveAcesso");
    const caixaErro = document.getElementById("mensagemErro");
    const btnEntrar = document.getElementById("btnEntrar");

    if (!form) return;

    function mostrarErro(texto) {
        caixaErro.textContent = texto;
        caixaErro.style.display = "block";
    }

    function limparErro() {
        caixaErro.textContent = "";
        caixaErro.style.display = "none";
    }

    // A chave é sempre exibida em maiúsculas e sem espaços
    campoChave.addEventListener("input", () => {
        campoChave.value = campoChave.value.replace(/\s/g, "").toUpperCase();
        limparErro();
    });
    campoEmail.addEventListener("input", limparErro);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        limparErro();

        const email = campoEmail.value.trim().toLowerCase();
        const chaveAcesso = campoChave.value.trim().toUpperCase();

        if (!email || !chaveAcesso) {
            mostrarErro("Preencha o e-mail e a chave de acesso.");
            return;
        }

        if (chaveAcesso.length !== 10) {
            mostrarErro("A chave de acesso tem 10 dígitos.");
            campoChave.focus();
            return;
        }

        btnEntrar.disabled = true;
        const textoOriginal = btnEntrar.value;
        btnEntrar.value = "Entrando...";

        try {
            const resposta = await fetch("/cliente/contato-apoio/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, chaveAcesso })
            });

            const dados = await resposta.json().catch(() => ({}));

            if (resposta.ok && dados.ok) {
                window.location.href = dados.redirect || "/dashboard-contato-apoio";
                return;
            }

            mostrarErro(dados.erro || "E-mail ou chave de acesso inválidos.");
        } catch (erro) {
            console.error("Erro no login do contato de apoio:", erro);
            mostrarErro("Não foi possível conectar ao servidor. Tente novamente.");
        } finally {
            btnEntrar.disabled = false;
            btnEntrar.value = textoOriginal;
        }
    });
});

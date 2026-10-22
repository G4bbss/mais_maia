let nomeUsuarioLogado = "Usuária";
let inicialUsuarioLogado = "U";

document.addEventListener("DOMContentLoaded", () => {
    carregarUsuario();
    configurarMenuConta();
    mostrarRelatos();
});

// Função auxiliar para prevenir ataques XSS (injeção de código malicioso no HTML)
function escaparHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 1. Carregar Perfil do Usuário Logado
function carregarUsuario() {
    fetch("/cliente/me")
        .then(res => {
            if (!res.ok) throw new Error("Falha ao carregar usuário");
            return res.json();
        })
        .then(usuario => {
            const primeiroNome = (usuario.Nome || usuario.nome || "Mamãe").split(" ")[0];
            nomeUsuarioLogado = primeiroNome;
            inicialUsuarioLogado = primeiroNome.charAt(0).toUpperCase();

            const nomeMini = document.getElementById("nomeMini");
            const avatarMini = document.getElementById("avatarMini");
            const nomeUsuario = document.getElementById("nomeUsuario");

            if (nomeMini) nomeMini.textContent = primeiroNome;
            if (avatarMini) avatarMini.textContent = inicialUsuarioLogado;
            if (nomeUsuario && !nomeUsuario.value) nomeUsuario.value = primeiroNome;
        })
        .catch(err => console.warn("Aviso: Não foi possível carregar o perfil logado.", err));
}

// 2. Menu de Conta
function configurarMenuConta() {
    const botaoConta = document.getElementById("botaoConta");
    const menuConta = document.getElementById("menuConta");

    if (botaoConta && menuConta) {
        botaoConta.addEventListener("click", function (e) {
            e.stopPropagation();
            menuConta.classList.toggle("aberto");
        });

        document.addEventListener("click", function () {
            menuConta.classList.remove("aberto");
        });
    }

    const botaoSair = document.getElementById("botaoSair");
    if (botaoSair) {
        botaoSair.addEventListener("click", function () {
            fetch("/cliente/logout", { method: "POST" }).finally(() => {
                window.location.href = "/";
            });
        });
    }
}

function verificarTipoUsuario() {
    let tipoSelect = document.getElementById("tipoUsuario");
    let inputNome = document.getElementById("nomeUsuario");

    if (!tipoSelect || !inputNome) return;

    if (tipoSelect.value === "nome") {
        inputNome.style.display = "inline-block";
        if (!inputNome.value) inputNome.value = nomeUsuarioLogado;
    } else {
        inputNome.style.display = "none";
    }
}

// 3. Enviar Novo Relato para o Banco de Dados
async function enviarRelato() {
    let textoInput = document.getElementById("relatoTexto");
    let texto = textoInput ? textoInput.value.trim() : "";
    let tipoSelect = document.getElementById("tipoUsuario");
    let tipo = tipoSelect ? tipoSelect.value : "anonimo";
    let nomeInput = document.getElementById("nomeUsuario");

    if (!texto) {
        alert("Por favor, escreva algo antes de publicar.");
        return;
    }

    if (texto.toLowerCase().includes("matar") || texto.toLowerCase().includes("suic")) {
        alert("Você não está sozinha 💛\nSe estiver passando por um momento difícil, ligue 188 (CVV) – apoio emocional gratuito 24h.");
    }

    let eAnonimo = (tipo === "anonimo");
    let nomeExibicao = eAnonimo ? "Anônima" : (nomeInput?.value?.trim() || nomeUsuarioLogado || "Usuária");

    try {
        const resposta = await fetch("/api/mural", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                texto: texto,
                e_anonimo: eAnonimo,
                nome_exibicao: nomeExibicao
            })
        });

        if (resposta.ok) {
            textoInput.value = "";
            mostrarRelatos();
        } else {
            const erroData = await resposta.json().catch(() => ({}));
            alert(`Erro ao publicar no mural: ${erroData.mensagem || "Falha no servidor"}`);
        }
    } catch (erro) {
        console.error("Erro ao enviar post:", erro);
        alert("Falha na conexão com o servidor.");
    }
}

// 4. Carregar e Renderizar Posts do Banco de Dados
async function mostrarRelatos() {
    let lista = document.getElementById("lista-relatos");
    if (!lista) return;

    try {
        const resposta = await fetch("/api/mural");
        if (!resposta.ok) {
            throw new Error(`Erro na resposta do servidor (código ${resposta.status})`);
        }

        const relatos = await resposta.json();

        if (!Array.isArray(relatos) || relatos.length === 0) {
            lista.innerHTML = "<div class='item-relato' style='text-align:center; color:#6b5744;'>Seja a primeira a compartilhar uma mensagem no mural! 💛</div>";
            return;
        }

        let htmlAcumulado = "";

        relatos.forEach(r => {
            const eAnonimo = Boolean(r.e_anonimo) || r.nome_exibicao === "Anônima";
            const nomeExibido = escaparHTML(r.nome_exibicao || "Anônima");
            const textoRelato = escaparHTML(r.texto || "");
            const idPost = r.id_post;

            const avatarHTML = eAnonimo
                ? `<div class="avatar avatar-anonimo"><img src="img/maiaFavicon.png" alt="Anônima"></div>`
                : `<div class="avatar avatar-conta">${escaparHTML((r.nome_exibicao || "U").charAt(0).toUpperCase())}</div>`;

            let htmlRespostas = "";
            if (Array.isArray(r.respostas) && r.respostas.length > 0) {
                r.respostas.forEach(resp => {
                    htmlRespostas += `<div class="item-resposta"><strong>${escaparHTML(resp.nome_exibicao)}:</strong> ${escaparHTML(resp.texto)}</div>`;
                });
            }

            htmlAcumulado += `
                <div class="item-relato">
                    <div class="post-header">
                        <div class="post-header-user">
                            ${avatarHTML}
                            <span class="nome-usuario">${nomeExibido}</span>
                        </div>
                        <button class="btn-curtir-topo" onclick="curtir(${idPost})">
                            💖 <span>${r.curtidas || 0}</span>
                        </button>
                    </div>
                    
                    <p class="texto-relato">${textoRelato}</p>

                    <div class="respostas-container">
                        ${htmlRespostas}
                        <div class="campo-responder">
                            <input type="text" id="nome-${idPost}" placeholder="Seu nome (opcional)">
                            <input type="text" id="input-${idPost}" placeholder="Escreva um comentário carinhoso...">
                            <button onclick="adicionarResposta(${idPost})">Enviar</button>
                        </div>
                    </div>
                </div>
            `;
        });

        lista.innerHTML = htmlAcumulado;
    } catch (erro) {
        console.error("Erro ao carregar relatos:", erro);
        lista.innerHTML = "<div class='item-relato' style='text-align:center; color:#d9534f;'>Erro ao carregar mensagens do mural.</div>";
    }
}

// 5. Curtir um Post
async function curtir(idPost) {
    if (!idPost) return;
    try {
        const resposta = await fetch(`/api/mural/${idPost}/curtir`, { method: "POST" });
        if (resposta.ok) {
            mostrarRelatos();
        }
    } catch (erro) {
        console.error("Erro ao curtir:", erro);
    }
}

// 6. Adicionar Comentário/Resposta
// 6. Adicionar Comentário/Resposta
async function adicionarResposta(idPost) {
    if (!idPost) return;

    let input = document.getElementById(`input-${idPost}`);
    let inputNome = document.getElementById(`nome-${idPost}`);

    if (!input || !input.value.trim()) return;

    let texto = input.value.trim();
    
    // Se o usuário digitou algo no campo de nome, usa o nome digitado.
    // Se deixou em branco, define automaticamente como "Anônima".
    let nome = inputNome && inputNome.value.trim() ? inputNome.value.trim() : "Anônima";

    try {
        const resposta = await fetch(`/api/mural/${idPost}/resposta`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                texto: texto,
                nome_exibicao: nome
            })
        });

        if (resposta.ok) {
            mostrarRelatos(); // Recarrega a lista com a nova resposta
        } else {
            alert("Erro ao enviar comentário.");
        }
    } catch (erro) {
        console.error("Erro ao responder:", erro);
        alert("Falha de conexão ao enviar resposta.");
    }
}
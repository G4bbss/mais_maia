let nomeUsuarioLogado = "Usuária";
let inicialUsuarioLogado = "U";

document.addEventListener("DOMContentLoaded", () => {
    carregarUsuario();
    configurarMenuConta();
    mostrarRelatos();
});

// 1. Carregar Perfil do Usuário Logado
function carregarUsuario() {
    fetch("/cliente/me")
        .then(res => res.json())
        .then(usuario => {
            const primeiroNome = (usuario.Nome || usuario.nome || "Mamãe").split(" ")[0];
            nomeUsuarioLogado = primeiroNome;
            inicialUsuarioLogado = primeiroNome.charAt(0).toUpperCase();

            const nomeMini = document.getElementById("nomeMini");
            const avatarMini = document.getElementById("avatarMini");
            const nomeUsuario = document.getElementById("nomeUsuario");

            if (nomeMini) nomeMini.textContent = primeiroNome;
            if (avatarMini) avatarMini.textContent = inicialUsuarioLogado;
            if (nomeUsuario) nomeUsuario.value = primeiroNome;
        })
        .catch(() => {});
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
            fetch("/cliente/logout", { method: "POST" }).then(() => {
                window.location.href = "/";
            });
        });
    }
}

function verificarTipoUsuario() {
    let tipo = document.getElementById("tipoUsuario").value;
    let inputNome = document.getElementById("nomeUsuario");

    if (tipo === "nome") {
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
    let tipo = document.getElementById("tipoUsuario").value;
    let nomeInput = document.getElementById("nomeUsuario");

    if (!texto) {
        alert("Por favor, escreva algo antes de publicar.");
        return;
    }

    if (texto.toLowerCase().includes("matar") || texto.toLowerCase().includes("suic")) {
        alert("Você não está sozinha 💛\nSe estiver passando por um momento difícil, ligue 188 (CVV) – apoio emocional gratuito 24h.");
    }

    let eAnonimo = (tipo === "anonimo");
    let nomeExibicao = eAnonimo ? "Anônima" : (nomeInput?.value || nomeUsuarioLogado || "Usuária");

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
            alert("Erro ao publicar no mural.");
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
        if (!resposta.ok) throw new Error("Erro ao buscar publicações");

        const relatos = await resposta.json();
        lista.innerHTML = "";

        if (!Array.isArray(relatos) || relatos.length === 0) {
            lista.innerHTML = "<div class='item-relato' style='text-align:center; color:#6b5744;'>Seja a primeira a compartilhar uma mensagem no mural! 💛</div>";
            return;
        }

        relatos.forEach(r => {
            const eAnonimo = Boolean(r.e_anonimo) || r.nome_exibicao === "Anônima";

            const avatarHTML = eAnonimo
                ? `<div class="avatar avatar-anonimo"><img src="img/maiaFavicon.png" alt="Anônima"></div>`
                : `<div class="avatar avatar-conta">${(r.nome_exibicao || "U").charAt(0).toUpperCase()}</div>`;

            let htmlRespostas = "";
            if (r.respostas && r.respostas.length > 0) {
                r.respostas.forEach(resp => {
                    htmlRespostas += `<div class="item-resposta"><strong>${resp.nome_exibicao}:</strong> ${resp.texto}</div>`;
                });
            }

            lista.innerHTML += `
                <div class="item-relato">
                    <div class="post-header">
                        <div class="post-header-user">
                            ${avatarHTML}
                            <span class="nome-usuario">${r.nome_exibicao}</span>
                        </div>
                        <button class="btn-curtir-topo" onclick="curtir(${r.id_post})">
                            💖 <span>${r.curtidas || 0}</span>
                        </button>
                    </div>
                    
                    <p class="texto-relato">${r.texto}</p>

                    <div class="respostas-container">
                        ${htmlRespostas}
                        <div class="campo-responder">
                            <input type="text" id="nome-${r.id_post}" placeholder="Seu nome (opcional)">
                            <input type="text" id="input-${r.id_post}" placeholder="Escreva um comentário carinhoso...">
                            <button onclick="adicionarResposta(${r.id_post})">Enviar</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (erro) {
        console.error("Erro ao carregar relatos:", erro);
        lista.innerHTML = "<div class='item-relato' style='text-align:center; color:#d9534f;'>Erro ao carregar mensagens do mural.</div>";
    }
}

// 5. Curtir um Post
async function curtir(idPost) {
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
async function adicionarResposta(idPost) {
    let input = document.getElementById(`input-${idPost}`);
    let inputNome = document.getElementById(`nome-${idPost}`);

    if (!input || !input.value.trim()) return;

    let texto = input.value.trim();
    let nome = inputNome && inputNome.value.trim() ? inputNome.value.trim() : (nomeUsuarioLogado || "Anônima");

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
            mostrarRelatos();
        }
    } catch (erro) {
        console.error("Erro ao responder:", erro);
    }
}
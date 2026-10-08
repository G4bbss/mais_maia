let humorSelecionado = null;

// Mapeamento dos nomes para os emojis correspondentes
const mapaEmojis = {
    'Tranquila': '😌',
    'Cansada': '😴',
    'Ansiosa': '😟',
    'Triste': '😢',
    'Feliz': '🥰'
};

// Inicializa os eventos e carrega dados ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    configurarMenuConta();
    carregarUsuario();
});

// 1. Controle do Menu de Conta (Abrir/Fechar Dropdown)
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

// 2. Carrega dados do usuário logado
function carregarUsuario() {
    fetch("/cliente/me")
        .then(res => {
            if (!res.ok) throw new Error("Usuário não autenticado");
            return res.json();
        })
        .then(usuario => {
            const primeiroNome = (usuario.Nome || usuario.nome || "Mamãe").split(" ")[0];
            const nomeMini = document.getElementById("nomeMini");
            const avatarMini = document.getElementById("avatarMini");

            if (nomeMini) nomeMini.textContent = primeiroNome;
            if (avatarMini) avatarMini.textContent = primeiroNome.charAt(0).toUpperCase();

            mostrarHistoricoPrivado();
        })
        .catch(() => {
            mostrarHistoricoPrivado();
        });
}

// 3. Seleção de Humor na Interface
function selecionarHumor(rotulo, emoji, elemento) {
    document.querySelectorAll("#botoesHumor button").forEach(b => b.classList.remove("selecionado"));
    elemento.classList.add("selecionado");
    humorSelecionado = rotulo;
}

// 4. Salvar Registro no Banco de Dados
async function salvarRegistroPrivado() {
    const textoInput = document.getElementById("textoPrivado");
    const texto = textoInput ? textoInput.value.trim() : "";

    if (!humorSelecionado && !texto) {
        alert("Selecione um emoji e escreva uma mensagem antes de salvar.");
        return;
    }

    try {
        const resposta = await fetch("/diario", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                texto: texto,
                emocao: humorSelecionado
            })
        });

        if (resposta.ok) {
            if (textoInput) textoInput.value = "";
            document.querySelectorAll("#botoesHumor button").forEach(b => b.classList.remove("selecionado"));
            humorSelecionado = null;

            mostrarHistoricoPrivado();
        } else {
            const erroData = await resposta.json().catch(() => ({}));
            alert(erroData.mensagem || "Erro ao salvar o registro.");
        }
    } catch (erro) {
        console.error("Erro ao conectar com a API:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}

// 5. Buscar e Exibir Histórico do Banco de Dados
async function mostrarHistoricoPrivado() {
    const container = document.getElementById("listaHistoricoPrivado");
    if (!container) return;

    try {
        const resposta = await fetch("/diario");

        if (!resposta.ok) {
            container.innerHTML = "<p style='font-size: 13px; color: #6b5744; text-align: center; padding: 10px 0;'>Faça login para visualizar seu histórico.</p>";
            return;
        }

        const registros = await resposta.json();
        container.innerHTML = "";

        if (!Array.isArray(registros) || registros.length === 0) {
            container.innerHTML = "<p style='font-size: 13px; color: #6b5744; text-align: center; padding: 10px 0;'>Você ainda não tem nenhum registro no seu diário privado.</p>";
            return;
        }

        registros.forEach(item => {
            const div = document.createElement("div");
            div.className = "item-registro-privado";

            const dataObjeto = new Date(item.data_registro);
            const dataFormatada = isNaN(dataObjeto.getTime())
                ? item.data_registro
                : dataObjeto.toLocaleDateString("pt-BR", {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

            // Pega o emoji mapeado ou exibe 📝 caso seja apenas texto
            const emoji = mapaEmojis[item.emocao] || "📝";
            const tituloEmocao = item.emocao || "Anotação";

            div.innerHTML = `
                <div class="registro-topo">
                    <div class="registro-humor-badge">
                        <span>${emoji}</span>
                        <span>${tituloEmocao}</span>
                    </div>
                    <span class="registro-data">${dataFormatada}</span>
                </div>
                ${item.texto ? `<p class="registro-texto">${item.texto}</p>` : ''}
            `;
            container.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro ao carregar histórico do diário:", erro);
        container.innerHTML = "<p style='font-size: 13px; color: #d9534f; text-align: center; padding: 10px 0;'>Erro ao carregar o histórico de registros.</p>";
    }
}
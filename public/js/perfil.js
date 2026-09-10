let listaContatos = [];

fetch("/cliente/me")
    .then(function (resposta) {
        if (!resposta.ok) throw new Error("Não autenticado");
        return resposta.json();
    })
    .then(function (usuario) {
        document.getElementById("nome").value = usuario.Nome || "";
        document.getElementById("telefone").value = usuario.Telefone || "";
        document.getElementById("fase").value = usuario.Fase || "gestante";
        document.getElementById("semanas").value = usuario.SemanasGestacao || "";

        document.getElementById("nomeCabecalho").textContent = usuario.Nome || "Meu perfil";
        document.getElementById("emailCabecalho").textContent = usuario.Email || "";
        document.getElementById("avatarGrande").textContent =
            (usuario.Nome || "?").charAt(0).toUpperCase();

        listaContatos = (usuario.contatos || []).map(c => ({
            ...c,
            aberto: false
        }));
        
        renderizarContatos();
    })
    .catch(function () {
        window.location.href = "/login";
    });

function renderizarContatos() {
    const container = document.getElementById("containerContatos");
    container.innerHTML = "";

    if (listaContatos.length === 0) {
        container.innerHTML = `<p class="ajuda" style="margin-bottom: 15px;">Nenhum contato de apoio cadastrado.</p>`;
        return;
    }

    listaContatos.forEach((contato, index) => {
        const estaAberto = contato.aberto || false;
        const nomeExibicao = contato.nome ? ` - ${contato.nome}` : "";

        const itemHtml = document.createElement("div");
        itemHtml.className = "bloco-contato";
        itemHtml.innerHTML = `
            <div class="cabecalho-contato" onclick="alternarContato(${index})">
                <span class="titulo-contato" id="titulo-contato-${index}">Contato ${index + 1}${nomeExibicao}</span>
                <span class="icone-seta">${estaAberto ? '▲' : '▼'}</span>
            </div>

            <div class="corpo-contato" style="display: ${estaAberto ? 'block' : 'none'};">
                <label>Nome do contato</label>
                <input type="text" value="${contato.nome || ''}" oninput="atualizarCampoContato(${index}, 'nome', this.value)" placeholder="Nome da pessoa">

                <label>E-mail do contato</label>
                <input type="email" value="${contato.email || ''}" oninput="atualizarCampoContato(${index}, 'email', this.value)" placeholder="email@exemplo.com">

                <label>Telefone do contato (11 dígitos)</label>
                <input type="tel" maxlength="11" value="${contato.telefone || ''}" oninput="aplicarMascaraTelefone(${index}, this)" placeholder="11999999999">

                <label>Parentesco / Relação</label>
                <input type="text" value="${contato.parentesco || ''}" oninput="atualizarCampoContato(${index}, 'parentesco', this.value)" placeholder="Ex: Mãe, Cônjuge, Amigo(a)">

                <button type="button" class="btn-remover-contato" onclick="removerContato(${index})">Remover contato</button>
            </div>
        `;
        container.appendChild(itemHtml);
    });
}

function alternarContato(index) {
    listaContatos[index].aberto = !listaContatos[index].aberto;
    renderizarContatos();
}

function atualizarCampoContato(index, campo, valor) {
    listaContatos[index][campo] = valor;
    if (campo === 'nome') {
        const titulo = document.getElementById(`titulo-contato-${index}`);
        if (titulo) {
            titulo.textContent = `Contato ${index + 1}${valor ? ' - ' + valor : ''}`;
        }
    }
}

function aplicarMascaraTelefone(index, input) {
    let valor = input.value.replace(/\D/g, "");
    if (valor.length > 11) valor = valor.slice(0, 11);
    input.value = valor;
    listaContatos[index].telefone = valor;
}

document.getElementById("btnAdicionarContato").addEventListener("click", function () {
    listaContatos.push({ nome: "", email: "", telefone: "", parentesco: "", aberto: true });
    renderizarContatos();
});

function removerContato(index) {
    listaContatos.splice(index, 1);
    renderizarContatos();
}

document.getElementById("formPerfil").addEventListener("submit", function (evento) {
    evento.preventDefault();

    const dados = {
        Nome: document.getElementById("nome").value,
        Telefone: document.getElementById("telefone").value,
        Fase: document.getElementById("fase").value,
        SemanasGestacao: document.getElementById("semanas").value,
        contatos: listaContatos
    };

    fetch("/cliente/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    })
        .then(function (resposta) {
            if (!resposta.ok) throw new Error("Erro ao salvar");
            return resposta.json();
        })
        .then(function () {
            document.getElementById("mensagemErro").style.display = "none";
            document.getElementById("mensagemSucesso").style.display = "block";
            setTimeout(() => window.location.reload(), 1200);
        })
        .catch(function () {
            document.getElementById("mensagemSucesso").style.display = "none";
            document.getElementById("mensagemErro").style.display = "block";
        });
});
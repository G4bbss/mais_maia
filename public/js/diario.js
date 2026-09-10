
    let humorSelecionado = null;
    let emojiSelecionado = null;
    let usuarioAtualChave = "convidado"; // Chave padrão caso não haja login

    // Carrega dados do usuário logado e isola o diário pelo ID ou E-mail
    fetch("/cliente/me")
        .then(res => res.json())
        .then(usuario => {
            const primeiroNome = (usuario.Nome || usuario.nome || "Mamãe").split(" ")[0];
            document.getElementById("nomeMini").textContent = primeiroNome;
            document.getElementById("avatarMini").textContent = primeiroNome.charAt(0).toUpperCase();

            // Define uma chave única para a conta logada (ex: id, email ou nome)
            usuarioAtualChave = usuario.id || usuario.email || primeiroNome;
            
            // Recarrega o histórico específico deste usuário
            mostrarHistoricoPrivado();
        })
        .catch(() => {
            mostrarHistoricoPrivado();
        });

    // Controle do menu de conta
    const botaoConta = document.getElementById("botaoConta");
    const menuConta = document.getElementById("menuConta");

    botaoConta.addEventListener("click", function (e) {
        e.stopPropagation();
        menuConta.classList.toggle("aberto");
    });

    document.addEventListener("click", function () {
        menuConta.classList.remove("aberto");
    });

    document.getElementById("botaoSair").addEventListener("click", function () {
        fetch("/cliente/logout", { method: "POST" }).then(() => {
            window.location.href = "/";
        });
    });

    // Seleção de Humor
    function selecionarHumor(rotulo, emoji, elemento) {
        document.querySelectorAll("#botoesHumor button").forEach(b => b.classList.remove("selecionado"));
        elemento.classList.add("selecionado");
        humorSelecionado = rotulo;
        emojiSelecionado = emoji;
    }

    // Salvar Registro Privado (Salva apenas na chave deste usuário)
    function salvarRegistroPrivado() {
        const texto = document.getElementById("textoPrivado").value.trim();

        if (!humorSelecionado && !texto) {
            alert("Selecione um emoji ou escreva uma mensagem antes de salvar.");
            return;
        }

        // Alerta de apoio emocional
        if (texto.toLowerCase().includes("matar") || texto.toLowerCase().includes("suic")) {
            alert("Você não está sozinha 💛\nSe estiver passando por um momento difícil, ligue 188 (CVV) – apoio emocional gratuito 24h.");
        }

        const chaveUsuario = `maia_diario_privado_${usuarioAtualChave}`;
        let registros = JSON.parse(localStorage.getItem(chaveUsuario)) || [];
        
        const novoRegistro = {
            id: Date.now(),
            humor: humorSelecionado || "Registro",
            emoji: emojiSelecionado || "📝",
            texto: texto,
            data: new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        };

        registros.unshift(novoRegistro);
        localStorage.setItem(chaveUsuario, JSON.stringify(registros));

        // Limpa os campos
        document.getElementById("textoPrivado").value = "";
        document.querySelectorAll("#botoesHumor button").forEach(b => b.classList.remove("selecionado"));
        humorSelecionado = null;
        emojiSelecionado = null;

        mostrarHistoricoPrivado();
    }

    // Mostrar Histórico Privado (Carrega apenas o diário da conta ativa)
    function mostrarHistoricoPrivado() {
        const container = document.getElementById("listaHistoricoPrivado");
        const chaveUsuario = `maia_diario_privado_${usuarioAtualChave}`;
        const registros = JSON.parse(localStorage.getItem(chaveUsuario)) || [];

        container.innerHTML = "";

        if (registros.length === 0) {
            container.innerHTML = "<p style='font-size: 13px; color: #6b5744; text-align: center; padding: 10px 0;'>Você ainda não tem nenhum registro no seu diário privado.</p>";
            return;
        }

        registros.forEach(item => {
            const div = document.createElement("div");
            div.className = "item-registro-privado";
            div.innerHTML = `
                <div class="registro-topo">
                    <div class="registro-humor-badge">
                        <span>${item.emoji}</span>
                        <span>${item.humor}</span>
                    </div>
                    <span class="registro-data">${item.data}</span>
                </div>
                ${item.texto ? `<p class="registro-texto">${item.texto}</p>` : ''}
            `;
            container.appendChild(div);
        });
    }

    mostrarHistoricoPrivado();

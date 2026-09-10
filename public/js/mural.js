        let nomeUsuarioLogado = "Usuária";
        let inicialUsuarioLogado = "U";

        // Carregar Perfil do Usuário Logado
        fetch("/cliente/me")
            .then(res => res.json())
            .then(usuario => {
                const primeiroNome = (usuario.Nome || usuario.nome || "Mamãe").split(" ")[0];
                nomeUsuarioLogado = primeiroNome;
                inicialUsuarioLogado = primeiroNome.charAt(0).toUpperCase();

                document.getElementById("nomeMini").textContent = primeiroNome;
                document.getElementById("avatarMini").textContent = inicialUsuarioLogado;
                document.getElementById("nomeUsuario").value = primeiroNome;
            })
            .catch(() => {});

        // Controle do Menu da Conta
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

        // ===================== FEED DE RELATOS =====================
        let relatos = JSON.parse(localStorage.getItem("relatos")) || [];

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

        function enviarRelato() {
            let texto = document.getElementById("relatoTexto").value;
            let tipo = document.getElementById("tipoUsuario").value;
            let nome = document.getElementById("nomeUsuario").value;

            if (!texto.trim()) {
                alert("Por favor, escreva algo antes de publicar.");
                return;
            }

            // Alerta de apoio emocional / prevenção
            if (texto.toLowerCase().includes("matar") || texto.toLowerCase().includes("suic")) {
                alert("Você não está sozinha 💛\nSe estiver passando por um momento difícil, ligue 188 (CVV) – apoio emocional gratuito 24h.");
            }

            let eAnonimo = (tipo === "anonimo");
            let nomeExibicao = eAnonimo ? "Anônima" : (nome || nomeUsuarioLogado || "Usuária");

            relatos.push({
                usuario: nomeExibicao,
                eAnonimo: eAnonimo,
                texto: texto,
                curtidas: 0,
                respostas: []
            });

            localStorage.setItem("relatos", JSON.stringify(relatos));
            mostrarRelatos();

            document.getElementById("relatoTexto").value = "";
        }

        function mostrarRelatos() {
            let lista = document.getElementById("lista-relatos");
            if (!lista) return;

            lista.innerHTML = "";

            if (relatos.length === 0) {
                lista.innerHTML = "<div class='item-relato' style='text-align:center; color:#6b5744;'>Seja a primeira a compartilhar uma mensagem no mural! 💛</div>";
                return;
            }

            relatos.slice().reverse().forEach((r, index) => {
                const indexReal = relatos.length - 1 - index;
                const eAnonimo = r.eAnonimo || r.usuario === "Anônima";

                // Avatar de anônimo usa a imagem maiaFavicon.png; usuária identificada usa a inicial da conta
                const avatarHTML = eAnonimo
                    ? `<div class="avatar avatar-anonimo"><img src="img/maiaFavicon.png" alt="Anônima"></div>`
                    : `<div class="avatar avatar-conta">${r.usuario.charAt(0).toUpperCase()}</div>`;

                let htmlRespostas = "";
                if (r.respostas && r.respostas.length > 0) {
                    r.respostas.forEach(resp => {
                        htmlRespostas += `<div class="item-resposta"><strong>${resp.user}:</strong> ${resp.texto}</div>`;
                    });
                }

                lista.innerHTML += `
                <div class="item-relato">
                    <div class="post-header">
                        <div class="post-header-user">
                            ${avatarHTML}
                            <span class="nome-usuario">${r.usuario}</span>
                        </div>
                        <button class="btn-curtir-topo" onclick="curtir(${indexReal})">
                            💖 <span>${r.curtidas || 0}</span>
                        </button>
                    </div>
                    
                    <p class="texto-relato">${r.texto}</p>

                    <div class="respostas-container">
                        ${htmlRespostas}
                        <div class="campo-responder">
                            <input type="text" id="nome-${indexReal}" placeholder="Seu nome (opcional)">
                            <input type="text" id="input-${indexReal}" placeholder="Escreva um comentário carinhoso...">
                            <button onclick="adicionarResposta(${indexReal})">Enviar</button>
                        </div>
                    </div>
                </div>
                `;
            });
        }

        function adicionarResposta(index) {
            let input = document.getElementById(`input-${index}`);
            let inputNome = document.getElementById(`nome-${index}`);

            if (!input) return;

            let texto = input.value;
            let nome = inputNome && inputNome.value.trim() ? inputNome.value : "Anônima";

            if (!texto.trim()) return;

            if (!relatos[index].respostas) relatos[index].respostas = [];

            relatos[index].respostas.push({
                user: nome,
                texto: texto
            });

            localStorage.setItem("relatos", JSON.stringify(relatos));
            mostrarRelatos();
        }

        function curtir(index) {
            relatos[index].curtidas = (relatos[index].curtidas || 0) + 1;
            localStorage.setItem("relatos", JSON.stringify(relatos));
            mostrarRelatos();
        }


        mostrarRelatos();
    
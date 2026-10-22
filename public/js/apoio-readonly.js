/* =========================================================================
   MODO CONTATO DE APOIO (SOMENTE LEITURA)
   Carregue este script no <head> das páginas do usuário (antes dos demais).
   - Descobre se quem está logado é um contato de apoio (via /cliente/me).
   - Se for: bloqueia qualquer gravação (POST/PUT/DELETE...), esconde o que
     é de edição e remove "Agendamentos" do menu.
   - A trava de verdade está no servidor (index.js); aqui é só experiência de uso.
   ========================================================================= */
(function () {
    "use strict";

    var fetchOriginal = window.fetch.bind(window);
    var MSG = "Modo somente visualização: o contato de apoio não pode alterar dados.";
    var ESCRITAS_LIBERADAS = ["/cliente/logout", "/usuario/logout", "/api/chatbot"];

    // Resolve uma única vez quem está logado
    var estado = fetchOriginal("/cliente/me", { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (u) {
            return { apoio: !!(u && u.tipoUsuario === "contato_apoio"), usuario: u };
        });
    window.maiaModoApoio = estado;

    /* ---------- aviso visual (toast) ---------- */
    function avisar(texto) {
        var el = document.getElementById("toastApoio");
        if (!el) {
            el = document.createElement("div");
            el.id = "toastApoio";
            el.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);" +
                "background:#3b2a25;color:#fff;padding:12px 20px;border-radius:10px;font:14px sans-serif;" +
                "z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90%;text-align:center;";
            document.body.appendChild(el);
        }
        el.textContent = texto;
        el.style.display = "block";
        clearTimeout(el._t);
        el._t = setTimeout(function () { el.style.display = "none"; }, 3500);
    }

    /* ---------- trava de gravação no front ---------- */
    window.fetch = function (input, init) {
        var metodo = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
        if (metodo === "GET" || metodo === "HEAD" || metodo === "OPTIONS") {
            return fetchOriginal(input, init);
        }

        var url = typeof input === "string" ? input : (input && input.url) || "";
        var alvo = null;
        try { alvo = new URL(url, window.location.href); } catch (e) { /* ignora */ }

        // Chamadas para outros sites (Jitsi, mapas...) e rotas liberadas passam direto
        if (alvo && alvo.origin !== window.location.origin) return fetchOriginal(input, init);
        if (alvo && ESCRITAS_LIBERADAS.indexOf(alvo.pathname) >= 0) return fetchOriginal(input, init);

        return estado.then(function (e) {
            if (!e.apoio) return fetchOriginal(input, init);
            avisar(MSG);
            return new Response(JSON.stringify({ ok: false, erro: MSG }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        });
    };

    /* ---------- ajustes de interface ---------- */
    var CSS =
        ".modo-apoio .caixa-escrita, .modo-apoio .caixa-postar, .modo-apoio .campo-responder," +
        ".modo-apoio .checkin," +
        ".modo-apoio #btnAdicionarContato, .modo-apoio .btn-remover-contato," +
        ".modo-apoio #formPerfil input[type=submit]," +
        ".modo-apoio .btn-salvar-rascunho, .modo-apoio .btn-finalizar-tudo" +
        "{display:none !important;}" +
        ".modo-apoio .btn-curtir-topo{pointer-events:none;cursor:default;}" +
        ".modo-apoio main.conteudo{flex-wrap:wrap;align-content:flex-start;}" +
        ".banner-apoio{flex:0 0 100%;width:100%;max-width:1100px;margin:0 auto 22px auto;box-sizing:border-box;" +
        "background:#f0f7f7;border-left:5px solid #2a9d8f;color:#264653;padding:16px 20px;border-radius:10px;}" +
        ".banner-apoio h2{margin:0 0 6px 0;font-size:20px;line-height:1.3;color:#264653;}" +
        ".banner-apoio p{margin:0;font-size:14px;line-height:1.45;color:#264653;}";

    // Campos que ficam travados (somente leitura) para o contato de apoio
    var CAMPOS_TRAVADOS = [
        "#formPerfil input", "#formPerfil select", "#formPerfil textarea",
        "#boxTabForm input", "#boxTabForm textarea", "#boxTabForm select"
    ].join(",");

    function travarCampos() {
        document.querySelectorAll(CAMPOS_TRAVADOS).forEach(function (campo) {
            campo.disabled = true;
        });
    }

    function ajustarInterface(e) {
        var usuario = e.usuario || {};
        var caminho = window.location.pathname.toLowerCase();

        // Páginas que o contato de apoio não usa: volta para o painel dele
        if (/\/(dashboard|agendamento|profissionais|redeapoio|telemedicina)(\.html)?$/.test(caminho)) {
            window.location.replace("/dashboard-contato-apoio");
            return;
        }

        document.documentElement.classList.add("modo-apoio");
        document.body.classList.add("modo-apoio");

        var estilo = document.createElement("style");
        estilo.textContent = CSS;
        document.head.appendChild(estilo);

        // Menu lateral: apenas Painel, Diário, Perfil e Mural
        var REMOVIDOS = ["agendamento", "profissionais", "redeapoio", "telemedicina"];
        document.querySelectorAll(".sidebar nav").forEach(function (nav) {
            var linkPainel = null;
            nav.querySelectorAll("a").forEach(function (a) {
                var href = (a.getAttribute("href") || "").toLowerCase();
                if (REMOVIDOS.some(function (r) { return href.indexOf(r) >= 0; })) {
                    a.remove();
                } else if (href.indexOf("dashboard") >= 0) {
                    a.setAttribute("href", "/dashboard-contato-apoio");
                    linkPainel = a;
                }
                a.classList.remove("ativo");
            });
            // Painel sempre em primeiro lugar
            if (linkPainel) nav.insertBefore(linkPainel, nav.firstChild);
            // Marca como ativa a página em que a pessoa está
            nav.querySelectorAll("a").forEach(function (a) {
                var destino = (a.getAttribute("href") || "").split("/").pop().replace(".html", "").toLowerCase();
                if (destino && caminho.indexOf(destino) >= 0) a.classList.add("ativo");
            });
        });
        document.querySelectorAll(".sidebar .logo").forEach(function (a) {
            a.setAttribute("href", "/dashboard-contato-apoio");
        });

        // Menu da conta: sem "Editar perfil"
        document.querySelectorAll(".conta-menu a").forEach(function (a) { a.remove(); });

        // Nome no topo: mostra quem é o contato de apoio
        var nomeContato = usuario.contatoNome || "Apoio";
        var primeiro = String(nomeContato).split(" ")[0];
        function aplicarNome() {
            var nomeMini = document.getElementById("nomeMini");
            var avatarMini = document.getElementById("avatarMini");
            if (nomeMini) nomeMini.textContent = primeiro;
            if (avatarMini) avatarMini.textContent = primeiro.charAt(0).toUpperCase();
        }
        aplicarNome();
        setTimeout(aplicarNome, 600);
        setTimeout(aplicarNome, 1800);

        // Título fixo no topo do conteúdo
        var principal = document.querySelector("main.conteudo") || document.querySelector("main");
        if (principal && !document.querySelector(".banner-apoio")) {
            var banner = document.createElement("div");
            banner.className = "banner-apoio";
            banner.innerHTML = "<h2>Você está acompanhando o perfil de <span></span></h2>" +
                "<p>👁️ Modo somente visualização: não é possível alterar dados nem agendar consultas.</p>";
            banner.querySelector("span").textContent = usuario.Nome || "usuária";

            // Na tela de perfil o conteúdo é um cartão estreito: o título acompanha a largura dele
            var cartaoCentral = principal.querySelector(":scope > .container");
            if (cartaoCentral) banner.style.maxWidth = "560px";

            principal.insertBefore(banner, principal.firstChild);
        }

        travarCampos();
        new MutationObserver(travarCampos).observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener("DOMContentLoaded", function () {
        estado.then(function (e) { if (e.apoio) ajustarInterface(e); });
    });
})();

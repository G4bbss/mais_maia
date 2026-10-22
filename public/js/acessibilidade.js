/* =========================================================================
   ACESSIBILIDADE COMPARTILHADA (Contraste/Tema + VLibras)
   Mesmas opções da tela do painel, para todas as abas do site.
   - Botão 🌓: Claro / Escuro / Alto Contraste (preferência salva no navegador)
   - VLibras: tradução em Libras
   É seguro incluir em qualquer página: se ela já tiver o botão ou o
   VLibras, o script não duplica.
   ========================================================================= */
(function () {
    "use strict";

    var CHAVE = "maia_tema_preferido";

    var CSS = [
        /* Barra flutuante (igual à do painel) */
        ".barra-acessibilidade{position:fixed;right:0;top:35%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px;z-index:1000;}",
        ".btn-acessibilidade{width:44px;height:44px;background-color:var(--accent-color,#7f5539);color:var(--bg-card,#fffaf6);border:1px solid var(--border-color,#e6ccb2);border-radius:8px 0 0 8px;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:-2px 2px 8px rgba(0,0,0,.15);transition:transform .2s,background-color .2s;}",
        ".btn-acessibilidade:hover{background-color:var(--accent-hover,#633e24);transform:translateX(-4px);}",
        ".painel-ajuste-tema{position:absolute;right:50px;top:0;background-color:var(--bg-card,#fffaf6);color:var(--text-primary,#4a3c31);border:1px solid var(--border-color,#e6ccb2);padding:12px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.2);display:none;z-index:1001;white-space:nowrap;font:14px 'Segoe UI',Arial,sans-serif;}",
        ".painel-ajuste-tema select{margin-top:6px;padding:6px 10px;border-radius:4px;border:1px solid var(--border-color,#e6ccb2);background-color:var(--bg-element,#f5ebe0);color:var(--text-primary,#4a3c31);width:100%;outline:none;}",

        /* Tema escuro: inverte as cores da página e preserva imagens, mapas e vídeo */
        "html.maia-tema-escuro{filter:invert(1) hue-rotate(180deg);background:#fff;}",
        "html.maia-tema-escuro img,html.maia-tema-escuro video,html.maia-tema-escuro iframe,html.maia-tema-escuro canvas,html.maia-tema-escuro .leaflet-container,html.maia-tema-escuro [vw]{filter:invert(1) hue-rotate(180deg);}",

        /* Alto contraste: fundo preto, texto branco, links e botões em ciano */
        "html.maia-tema-alto-contraste body,html.maia-tema-alto-contraste body *:not(img):not(svg):not(video):not(iframe):not(canvas):not([vw]):not([vw] *):not(.leaflet-container *){background-color:#000 !important;background-image:none !important;color:#fff !important;border-color:#fff !important;box-shadow:none !important;text-shadow:none !important;}",
        "html.maia-tema-alto-contraste a,html.maia-tema-alto-contraste a *,html.maia-tema-alto-contraste button,html.maia-tema-alto-contraste button *{color:#0ff !important;}",
        "html.maia-tema-alto-contraste button,html.maia-tema-alto-contraste input,html.maia-tema-alto-contraste select,html.maia-tema-alto-contraste textarea{border:1px solid #fff !important;}",
        "html.maia-tema-alto-contraste .btn-acessibilidade{border:2px solid #0ff !important;}"
    ].join("\n");

    function aplicarTema(nome) {
        var html = document.documentElement;
        html.classList.remove("maia-tema-escuro", "maia-tema-alto-contraste");
        if (nome === "escuro") html.classList.add("maia-tema-escuro");
        if (nome === "alto-contraste") html.classList.add("maia-tema-alto-contraste");
        try { localStorage.setItem(CHAVE, nome); } catch (e) { /* ignora */ }
    }

    function temaSalvo() {
        try { return localStorage.getItem(CHAVE) || "claro"; } catch (e) { return "claro"; }
    }

    // Aplica o tema salvo o quanto antes para a página não "piscar"
    aplicarTema(temaSalvo());

    function criarBarra() {
        if (document.querySelector(".barra-acessibilidade")) return;

        var barra = document.createElement("div");
        barra.className = "barra-acessibilidade";
        barra.innerHTML =
            '<div style="position:relative;">' +
            '  <button type="button" class="btn-acessibilidade" id="btnTemaMaia" title="Aparência e Contraste" aria-label="Aparência e Contraste">🌓</button>' +
            '  <div id="painelTemaMaia" class="painel-ajuste-tema">' +
            '    <label for="selectTemaMaia">Aparência</label>' +
            '    <select id="selectTemaMaia">' +
            '      <option value="claro">Claro</option>' +
            '      <option value="escuro">Escuro</option>' +
            '      <option value="alto-contraste">Alto Contraste</option>' +
            '    </select>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(barra);

        var painel = document.getElementById("painelTemaMaia");
        var botao = document.getElementById("btnTemaMaia");
        var seletor = document.getElementById("selectTemaMaia");
        seletor.value = temaSalvo();

        botao.addEventListener("click", function (e) {
            e.stopPropagation();
            painel.style.display = painel.style.display === "block" ? "none" : "block";
        });
        painel.addEventListener("click", function (e) { e.stopPropagation(); });
        seletor.addEventListener("change", function () { aplicarTema(seletor.value); });
        document.addEventListener("click", function () { painel.style.display = "none"; });
    }

    function criarVLibras() {
        if (document.querySelector("[vw]")) return; // a página já tem o VLibras

        var caixa = document.createElement("div");
        caixa.setAttribute("vw", "");
        caixa.className = "enabled";
        caixa.innerHTML =
            '<div vw-access-button class="active"></div>' +
            '<div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
        document.body.appendChild(caixa);

        var script = document.createElement("script");
        script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
        script.onload = function () {
            try { new window.VLibras.Widget("https://vlibras.gov.br/app"); }
            catch (e) { console.warn("VLibras indisponível:", e); }
        };
        document.body.appendChild(script);
    }

    document.addEventListener("DOMContentLoaded", function () {
        var estilo = document.createElement("style");
        estilo.id = "estiloAcessibilidadeMaia";
        estilo.textContent = CSS;
        document.head.appendChild(estilo);

        criarBarra();
        criarVLibras();
    });
})();

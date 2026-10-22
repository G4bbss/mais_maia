/* ===================== CONTROLE DE TEMAS ===================== */
function toggleMenuTema() {
    const painel = document.getElementById("painelTema");
    if (painel) {
        painel.style.display = painel.style.display === "block" ? "none" : "block";
    }
}

function mudarTema(nomeTema) {
    const html = document.documentElement;
    html.classList.remove("tema-claro", "tema-escuro", "tema-alto-contraste");
    html.classList.add(`tema-${nomeTema}`);
    localStorage.setItem("maia_tema_preferido", nomeTema);
}

document.addEventListener("DOMContentLoaded", function () {
    const temaSalvo = localStorage.getItem("maia_tema_preferido") || "claro";
    mudarTema(temaSalvo);
    const selectEl = document.getElementById("selectTema");
    if (selectEl) selectEl.value = temaSalvo;
});

document.addEventListener("click", function (e) {
    const painel = document.getElementById("painelTema");
    const btnTema = e.target.closest(".btn-acessibilidade");
    if (painel && !painel.contains(e.target) && !btnTema) {
        painel.style.display = "none";
    }
});

/* ===================== UTILITÁRIOS ===================== */
function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];
const mapaEmojis = { Tranquila: "😌", Cansada: "😴", Ansiosa: "😟", Triste: "😢", Feliz: "🥰" };

let dataAtual = new Date();
let compromissosMap = {};

/* ===================== CARREGAMENTO DOS DADOS ===================== */
fetch("/cliente/me")
    .then(function (resposta) {
        if (!resposta.ok) throw new Error("Não autenticado");
        return resposta.json();
    })
    .then(function (dados) {
        // Só o contato de apoio usa este painel
        if (dados.tipoUsuario !== "contato_apoio") {
            window.location.href = "/dashboard";
            return;
        }

        const nomeMae = dados.Nome || "Usuária Maia";
        const nomeContato = dados.contatoNome || "Apoio";
        const primeiroNome = nomeContato.split(" ")[0];

        document.getElementById("saudacaoContato").textContent = `Olá, ${primeiroNome}!`;
        document.getElementById("saudacaoMae").textContent = `Você está acompanhando o perfil de ${nomeMae}`;
        document.getElementById("nomeMini").textContent = primeiroNome;
        document.getElementById("avatarMini").textContent = primeiroNome.charAt(0).toUpperCase();

        const fase = dados.Fase === "gestante" ? "Gestante" : "Puérpera";
        const semanas = dados.SemanasGestacao ? ` (${escaparHTML(dados.SemanasGestacao)} semanas)` : "";
        document.getElementById("infoStatusMae").innerHTML =
            `Você está conectado(a) como contato de apoio de <strong>${escaparHTML(nomeMae)}</strong>.<br>` +
            `<strong>Fase atual:</strong> ${fase}${semanas}.`;

        carregarCompromissos(dados.Email);
        carregarHumorRecente();
    })
    .catch(function () {
        window.location.href = "/login-contato-apoio.html";
    });

async function carregarCompromissos(email) {
    desenharCalendario();
    if (!email) return;

    try {
        // O servidor devolve sempre os agendamentos da usuária vinculada a este contato
        const res = await fetch(`/cliente/meus-agendamento/${encodeURIComponent(email)}`);
        if (!res.ok) return;

        const dados = await res.json();
        const lista = Array.isArray(dados) ? dados : (dados.consultas || dados.agendamentos || []);

        compromissosMap = {};
        lista.forEach(c => {
            const dataRaw = (c.data_consulta || c.data_agendamento || c.data || "").toString().substring(0, 10);
            if (!dataRaw) return;
            if (!compromissosMap[dataRaw]) compromissosMap[dataRaw] = [];

            const horario = c.horario || c.hora || "";
            compromissosMap[dataRaw].push({
                titulo: c.profissional_nome || c.profissional || "Consulta agendada",
                detalhe: (horario ? horario + " - " : "") + (c.status || "Agendado")
            });
        });

        desenharCalendario();
    } catch (err) {
        console.error("Erro ao carregar compromissos:", err);
    }
}

async function carregarHumorRecente() {
    const container = document.getElementById("listaHumor");
    try {
        const res = await fetch("/diario");
        if (!res.ok) throw new Error("Falha ao buscar diário");

        const registros = await res.json();
        container.innerHTML = "";

        if (!Array.isArray(registros) || registros.length === 0) {
            container.innerHTML = `<p class="vazio">Nenhum registro no diário emocional ainda.</p>`;
            return;
        }

        registros.slice(0, 4).forEach(item => {
            const data = new Date(item.data_registro);
            const dataFmt = isNaN(data.getTime())
                ? ""
                : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            const emoji = mapaEmojis[item.emocao] || "📝";

            const div = document.createElement("div");
            div.className = "feed-item";
            div.innerHTML = `
                <div class="feed-texto">
                    <strong>${emoji} ${escaparHTML(item.emocao || "Anotação")} <small style="font-weight: normal;">· ${escaparHTML(dataFmt)}</small></strong>
                    ${item.texto ? `<span>${escaparHTML(item.texto)}</span>` : ""}
                </div>`;
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Erro ao carregar diário:", err);
        container.innerHTML = `<p class="vazio">Não foi possível carregar os registros.</p>`;
    }
}

function desenharCalendario() {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    const hoje = new Date();

    document.getElementById("mesAtual").textContent = nomesMeses[mes] + " " + ano;

    const grade = document.getElementById("grade");
    grade.innerHTML = "";

    diasSemana.forEach(function (letra) {
        const cabecalho = document.createElement("div");
        cabecalho.className = "dia-semana";
        cabecalho.textContent = letra;
        grade.appendChild(cabecalho);
    });

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();

    for (let i = 0; i < primeiroDiaSemana; i++) {
        const vazio = document.createElement("div");
        vazio.className = "dia vazio";
        grade.appendChild(vazio);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
        const celula = document.createElement("div");
        celula.className = "dia";

        if (ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate()) {
            celula.classList.add("hoje");
        }

        const dataIso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        if (compromissosMap[dataIso] && compromissosMap[dataIso].length > 0) {
            celula.classList.add("compromisso");
        }

        celula.textContent = dia;
        grade.appendChild(celula);
    }

    const lista = document.getElementById("listaCompromissos");
    lista.innerHTML = "";

    const prefixoMes = `${ano}-${String(mes + 1).padStart(2, "0")}`;
    const diasComCompromisso = Object.keys(compromissosMap)
        .filter(d => d.startsWith(prefixoMes) && compromissosMap[d].length > 0)
        .sort();

    if (diasComCompromisso.length === 0) {
        lista.innerHTML = `<p class="vazio">Nenhum compromisso agendado para este mês.</p>`;
        return;
    }

    diasComCompromisso.forEach(function (dataIso) {
        const numDia = parseInt(dataIso.split("-")[2], 10);
        compromissosMap[dataIso].forEach(info => {
            const item = document.createElement("div");
            item.className = "compromisso-item";
            item.innerHTML = `
                <div class="compromisso-data">${numDia} ${nomesMeses[mes].substring(0, 3)}</div>
                <div><strong>${escaparHTML(info.titulo)}</strong><span>${escaparHTML(info.detalhe)}</span></div>`;
            lista.appendChild(item);
        });
    });
}

/* ===================== NAVEGAÇÃO DO CALENDÁRIO ===================== */
document.getElementById("mesAnterior").addEventListener("click", function () {
    dataAtual.setDate(1);
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    desenharCalendario();
});

document.getElementById("mesSeguinte").addEventListener("click", function () {
    dataAtual.setDate(1);
    dataAtual.setMonth(dataAtual.getMonth() + 1);
    desenharCalendario();
});

/* ===================== MENU DA CONTA E SAÍDA ===================== */
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
    fetch("/cliente/logout", { method: "POST" }).finally(function () {
        window.location.href = "/";
    });
});

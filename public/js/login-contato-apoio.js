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

/* ===================== CARREGAMENTO DOS DADOS ===================== */
const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

let dataAtual = new Date();
let compromissosMap = {};

fetch("/cliente/me")
    .then(function (resposta) {
        if (!resposta.ok) throw new Error("Não autenticado");
        return resposta.json();
    })
    .then(function (usuario) {
        // 1. Nome do Contato de Apoio logado
        const nomeContato = usuario.nomeContato || usuario.nome_contato || usuario.nomeApoio || usuario.nome_apoio || usuario.contatoNome || "Contato de Apoio";
        const inicialContato = nomeContato.charAt(0).toUpperCase();

        // 2. Nome e detalhes da Mãe acompanhada
        const nomeMae = usuario.Nome || usuario.nome || "Usuária Maia";
        const fase = (usuario.Fase || usuario.fase) === "gestante" ? "Gestante" : "Puérpera";
        const semanasVal = usuario.SemanasGestacao || usuario.semanas_gestacao;
        const semanas = semanasVal ? ` (${semanasVal} semanas)` : "";

        // Atualizar Saudação e Header com o Nome do Contato de Apoio
        document.getElementById("saudacaoContato").textContent = `Olá, ${nomeContato}!`;
        document.getElementById("avatarMini").textContent = inicialContato;
        document.getElementById("nomeMini").textContent = nomeContato;

        // Atualizar informações da Mãe
        document.getElementById("saudacaoMae").textContent = `Acompanhando: ${nomeMae}`;
        document.getElementById("infoStatusMae").innerHTML = `
            Você está conectado(a) como contato de apoio de <strong>${nomeMae}</strong>.<br>
            <strong>Fase atual:</strong> ${fase}${semanas}.
        `;

        // Ativar flag de modo visualização/somente leitura na sessão
        sessionStorage.setItem("modoSomenteLeitura", "true");

        const emailMae = usuario.Email || usuario.email;
        carregarCompromissosDoServidor(emailMae);
    })
    .catch(function () {
        window.location.href = "/login-contato-apoio.html";
    });

async function carregarCompromissosDoServidor(email) {
    if (!email) return;

    try {
        let res = await fetch(`/usuario/meus-agendamento/${email}`);
        if (!res.ok) res = await fetch(`/cliente/meus-agendamento/${email}`);

        if (res.ok) {
            const dados = await res.json();
            const lista = Array.isArray(dados) ? dados : (dados.consultas || dados.agendamentos || []);

            compromissosMap = {};
            lista.forEach(c => {
                const dataRaw = (c.data_consulta || c.data || c.data_agendamento || "").toString().substring(0, 10);
                if (!dataRaw) return;

                if (!compromissosMap[dataRaw]) {
                    compromissosMap[dataRaw] = [];
                }

                compromissosMap[dataRaw].push({
                    titulo: c.profissional_nome || c.profissional || "Consulta Agendada",
                    horario: c.horario || c.hora || "",
                    detalhe: (c.horario || c.hora ? (c.horario || c.hora) + " - " : "") +
                        "Paciente: " + (c.paciente_nome || c.paciente || c.nome || "Mãe")
                });
            });

            desenharCalendario();
        }
    } catch (err) {
        console.error("Erro ao carregar compromissos:", err);
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

        const ehHoje = ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate();
        if (ehHoje) celula.classList.add("hoje");

        const mesFmt = String(mes + 1).padStart(2, '0');
        const diaFmt = String(dia).padStart(2, '0');
        const dataIso = `${ano}-${mesFmt}-${diaFmt}`;

        if (compromissosMap[dataIso] && compromissosMap[dataIso].length > 0) {
            celula.classList.add("compromisso");
        }

        celula.textContent = dia;
        grade.appendChild(celula);
    }

    const lista = document.getElementById("listaCompromissos");
    lista.innerHTML = "";

    const prefixoMes = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const diasComCompromisso = Object.keys(compromissosMap)
        .filter(d => d.startsWith(prefixoMes) && compromissosMap[d].length > 0)
        .sort();

    if (diasComCompromisso.length === 0) {
        lista.innerHTML = `<p class="vazio">Nenhum compromisso agendado para este mês.</p>`;
        return;
    }

    diasComCompromisso.forEach(function (dataIso) {
        const numDia = parseInt(dataIso.split('-')[2]);
        const listaItems = compromissosMap[dataIso];

        listaItems.forEach(info => {
            const item = document.createElement("div");
            item.className = "compromisso-item";
            item.innerHTML = `
                <div class="compromisso-data">${numDia} ${nomesMeses[mes].substring(0, 3)}</div>
                <div><strong>${info.titulo}</strong><span>${info.detalhe}</span></div>
            `;
            lista.appendChild(item);
        });
    });
}

/* NAVEGAÇÃO CALENDÁRIO */
document.getElementById("mesAnterior").addEventListener("click", function () {
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    desenharCalendario();
});

document.getElementById("mesSeguinte").addEventListener("click", function () {
    dataAtual.setMonth(dataAtual.getMonth() + 1);
    desenharCalendario();
});

/* MENU E SAÍDA */
const botaoConta = document.getElementById("botaoConta");
const menuConta = document.getElementById("menuConta");

if (botaoConta) {
    botaoConta.addEventListener("click", function (e) {
        e.stopPropagation();
        menuConta.classList.toggle("aberto");
    });
}

document.addEventListener("click", function () {
    if (menuConta) menuConta.classList.remove("aberto");
});

document.getElementById("botaoSair").addEventListener("click", function () {
    sessionStorage.removeItem("modoSomenteLeitura");
    fetch("/cliente/logout", { method: "POST" }).then(function () {
        window.location.href = "/";
    });
});
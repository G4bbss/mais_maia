console.log("📅 Módulo de Agendamentos e Calendário carregado!");

/* BASE DE PROFISSIONAIS DA PLATAFORMA */
const PROFISSIONAIS_PROJETO = [
    { id: 1, nome: "Dra. Ana Beatriz Mendes", esp: "Psicologia Perinatal", foto: "ana.png", disponibilidade: "segunda a sexta: 08:00 as 18:00", tempo: "30min" },
    { id: 2, nome: "Dra. Carolina Figueiredo Lima", esp: "Pediatria Materna", foto: "carolina.png", disponibilidade: "segunda a sexta: 08:00 as 18:00", tempo: "30min" },
    { id: 3, nome: "Dra. Rafaela Souza Costa", esp: "Ginecologia & Obstetrícia", foto: "rafaela.png", disponibilidade: "segunda a sexta: 08:00 as 18:00", tempo: "30min" },
    { id: 4, nome: "Dr. Ricardo Almeida Neto", esp: "Pediatria Neonatal", foto: "ricardo.png", disponibilidade: "segunda a sexta: 08:00 as 18:00", tempo: "30min" },
    { id: 5, nome: "Dra. Juliana Martins Oliveira", esp: "Nutrição Infantil", foto: "juliana.png", disponibilidade: "segunda a sexta: 08:00 as 18:00", tempo: "30min" },
    { id: 6, nome: "Camila Rocha Ferreira", esp: "Plantão Emergencial", foto: "camila.png", disponibilidade: "segunda a domingo: 00:00 as 23:59", tempo: "30min" },
    { id: 7, nome: "Dra. Patrícia Oliveira Santos", esp: "Mastologia & Amamentação", foto: "patricia.png", disponibilidade: "segunda a sexta: 08:00 as 18:00", tempo: "30min" },
    { id: 8, nome: "Mariana Castro Mendes", esp: "Apoio Emocional & Enfermagem", foto: "mariana.png", disponibilidade: "segunda a sexta: 08:00 as 18:00", tempo: "30min" }
];

// =======================================
// 🟢 VARIÁVEIS DE ESTADO
// =======================================
const calendario = document.getElementById("calendario");
let dataAtual = new Date();
let diaSelecionadoStr = null; 
let horarioSelecionado = null;
let modalidadeSelecionada = null;
let consultas = [];
let profissionalAtual = null;
let consultaSelecionadaParaCancelar = null;

const params = new URLSearchParams(window.location.search);
let profissionalIdSel = params.get("id") || params.get("profissional");

function obterSelectModalidadeHTML() {
    return document.getElementById("modalidade") || 
           document.getElementById("select-modalidade") || 
           document.getElementById("modalidade-atendimento") || 
           document.querySelector('select[name="modalidade"]');
}

// =======================================
// 🟢 SINCRONIZADOR COM O DASHBOARD
// =======================================
function atualizarLocalStorageParaDashboard() {
    const compromissosFormatados = {};

    consultas.forEach(c => {
        if (c.status === "cancelada") return;
        const dataLimpa = (c.data_consulta || c.data || c.data_agendamento || "").toString().substring(0, 10);
        if (!dataLimpa) return;

        if (!compromissosFormatados[dataLimpa]) {
            compromissosFormatados[dataLimpa] = [];
        }

        const modIcone = (c.tipo_atendimento || c.tipo || c.modalidade || "").toLowerCase().includes("presencial") ? "🏢 Presencial" : "💻 Online";

        compromissosFormatados[dataLimpa].push({
            titulo: c.profissional_nome || c.profissional || "Consulta Agendada",
            horario: c.horario || c.hora || "",
            detalhe: `Paciente: ${c.paciente_nome || c.paciente || c.nome || c.usuario || "Não informado"} (${modIcone})`
        });
    });

    localStorage.setItem("maia_compromissos", JSON.stringify(compromissosFormatados));
    localStorage.setItem("maia_consultas_raw", JSON.stringify(consultas));
}

function atualizarOpcoesModalidade(prof) {
    const containerModalidade = document.getElementById("container-modalidade");
    const selectHTML = obterSelectModalidadeHTML();

    modalidadeSelecionada = null;

    if (!prof) {
        if (containerModalidade) containerModalidade.innerHTML = "<p style='color: gray; font-size: 13px;'>Selecione um profissional primeiro.</p>";
        if (selectHTML) selectHTML.value = "";
        return;
    }

    const modalidadeTexto = (prof.modalidade || prof.modalidades || prof.tipo_atendimento || prof.atendimento || "ambos").toLowerCase();
    
    let podeOnline = modalidadeTexto.includes("online") || modalidadeTexto.includes("ambos") || modalidadeTexto.includes("híbrido") || modalidadeTexto.includes("hibrido") || prof.online === true;
    let podePresencial = modalidadeTexto.includes("presencial") || modalidadeTexto.includes("pessoalmente") || modalidadeTexto.includes("ambos") || modalidadeTexto.includes("híbrido") || modalidadeTexto.includes("hibrido") || prof.presencial === true;

    if (!podeOnline && !podePresencial) {
        podeOnline = true;
        podePresencial = true;
    }

    if (containerModalidade) {
        containerModalidade.innerHTML = "";
        const opcoes = [];
        if (podeOnline) opcoes.push({ valor: "online", texto: "💻 Online" });
        if (podePresencial) opcoes.push({ valor: "presencial", texto: "🏢 Pessoalmente" });

        opcoes.forEach((opt, index) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-modalidade";
            btn.innerText = opt.texto;
            btn.dataset.valor = opt.valor;

            btn.onclick = () => {
                document.querySelectorAll(".btn-modalidade").forEach(b => b.classList.remove("selecionado"));
                btn.classList.add("selecionado");
                modalidadeSelecionada = opt.valor;
            };

            if (opcoes.length === 1 && index === 0) {
                btn.classList.add("selecionado");
                modalidadeSelecionada = opt.valor;
            }

            containerModalidade.appendChild(btn);
        });
    }

    if (selectHTML) {
        if (selectHTML.value) {
            modalidadeSelecionada = selectHTML.value;
        }
        selectHTML.onchange = (e) => {
            modalidadeSelecionada = e.target.value;
        };
    }
}

function processarDadosProfissional(prof) {
    if (!prof || !prof.disponibilidade) return null;

    const mapaDias = { 
        "domingo": 0, "segunda": 1, "terca": 2, "terça": 2, 
        "quarta": 3, "quinta": 4, "sexta": 5, "sabado": 6, "sábado": 6 
    };
    let regrasGeradas = {};

    const tempoMatch = prof.tempo ? prof.tempo.match(/\d+/) : null;
    prof.tempoMinutos = tempoMatch ? parseInt(tempoMatch[0]) : 30;

    const blocos = prof.disponibilidade.toLowerCase().split(';');

    blocos.forEach(bloco => {
        const horasMatch = bloco.match(/(\d{1,2})(h|:)(\d{2})?/g);
        if (horasMatch && horasMatch.length >= 2) {
            const formatarHora = (h) => {
                let limpa = h.replace('h', '');
                if (!limpa.includes(':')) limpa += ':00';
                return limpa.padStart(5, '0');
            };

            const inicio = formatarHora(horasMatch[0]);
            const fim = formatarHora(horasMatch[1]);

            if (bloco.includes(' a ')) {
                const partesTexto = bloco.split(/[\d]/)[0];
                const diasNoTexto = partesTexto.split(' a ');
                let dInicio = -1, dFim = -1;

                Object.keys(mapaDias).forEach(nome => {
                    if (diasNoTexto[0] && diasNoTexto[0].includes(nome)) dInicio = mapaDias[nome];
                    if (diasNoTexto[1] && diasNoTexto[1].includes(nome)) dFim = mapaDias[nome];
                });

                if (dInicio !== -1 && dFim !== -1) {
                    for (let i = dInicio; i <= dFim; i++) { regrasGeradas[i] = { inicio, fim }; }
                }
            } else {
                Object.keys(mapaDias).forEach(nome => {
                    if (bloco.includes(nome)) { regrasGeradas[mapaDias[nome]] = { inicio, fim }; }
                });
            }
        }
    });
    return Object.keys(regrasGeradas).length > 0 ? regrasGeradas : null;
}

function ehFeriado(dia, mes, ano) {
    const feriados = [`1/1/${ano}`, `21/4/${ano}`, `1/5/${ano}`, `7/9/${ano}`, `12/10/${ano}`, `2/11/${ano}`, `15/11/${ano}`, `25/12/${ano}`];
    return feriados.includes(`${dia}/${mes + 1}/${ano}`);
}

function converterParaMinutos(horaString) {
    const [horas, minutos] = horaString.split(':').map(Number);
    return (horas * 60) + minutos;
}

function converterParaHoraString(minutosTotais) {
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

async function selecionarProfissionalPorId(idProf, listaConhecida = []) {
    if (!idProf) {
        profissionalAtual = null;
        atualizarOpcoesModalidade(null);
        renderCalendario();
        return;
    }

    let profEncontrado = null;

    try {
        const res = await fetch(`/api/profissionais/${idProf}`);
        if (res.ok) profEncontrado = await res.json();
    } catch (err) {}

    if (!profEncontrado) {
        const buscaEm = (listaConhecida && listaConhecida.length > 0) ? listaConhecida : PROFISSIONAIS_PROJETO;
        profEncontrado = buscaEm.find(p => String(p.id || p.id_profissional) === String(idProf));
    }

    profissionalAtual = profEncontrado;

    if (profissionalAtual) {
        if (!profissionalAtual.disponibilidade) {
            profissionalAtual.disponibilidade = "segunda a sexta: 08:00 as 18:00";
        }
        profissionalAtual.regrasProcessadas = processarDadosProfissional(profissionalAtual);
    }

    atualizarOpcoesModalidade(profissionalAtual);
    renderCalendario();
}

async function carregarDados() {
    let emailLogado = localStorage.getItem("usuarioEmail");

    const inputEmail = document.getElementById("email-paciente");
    if (inputEmail && emailLogado) {
        inputEmail.value = emailLogado;
    }

    try {
        let res = await fetch("/agendamento");
        if (!res.ok && emailLogado) res = await fetch(`/usuario/meus-agendamento/${emailLogado}`);
        if (!res.ok && emailLogado) res = await fetch(`/cliente/meus-agendamento/${emailLogado}`);

        if (res.ok) {
            const dadosParsed = await res.json();
            if (Array.isArray(dadosParsed)) {
                consultas = dadosParsed;
            } else if (dadosParsed && Array.isArray(dadosParsed.consultas)) {
                consultas = dadosParsed.consultas;
            } else if (dadosParsed && Array.isArray(dadosParsed.agendamentos)) {
                consultas = dadosParsed.agendamentos;
            }
        }
    } catch (err) {}

    if (!consultas || consultas.length === 0) {
        try {
            const rawLocal = JSON.parse(localStorage.getItem("maia_consultas_raw") || "[]");
            if (Array.isArray(rawLocal) && rawLocal.length > 0) consultas = rawLocal;
        } catch (e) {}
    }

    atualizarLocalStorageParaDashboard();

    if (profissionalIdSel) {
        await selecionarProfissionalPorId(profissionalIdSel);
    } else {
        renderCalendario();
    }

    carregarMinhasConsultas();
}

function renderCalendario() {
    if (!calendario) return;
    calendario.innerHTML = "";

    const mes = dataAtual.getMonth();
    const ano = dataAtual.getFullYear();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const elementoTitulo = document.getElementById("mes-ano-titulo");
    if (elementoTitulo) elementoTitulo.innerText = `${nomesMeses[mes]} ${ano}`;

    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach(d => {
        const el = document.createElement("div");
        el.innerText = d;
        el.className = "dia-semana-cabecalho";
        calendario.appendChild(el);
    });

    for (let i = 0; i < primeiroDia; i++) calendario.appendChild(document.createElement("div"));

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (let i = 1; i <= diasNoMes; i++) {
        const dia = document.createElement("div");
        dia.classList.add("dia");
        dia.innerText = i;

        const dataDia = new Date(ano, mes, i);
        const diaSemana = dataDia.getDay();
        const dataFormatada = `${ano}-${(mes + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;

        const passado = dataDia < hoje;
        const feriado = ehFeriado(i, mes, ano);

        let trabalhaNesteDia = false;
        if (profissionalAtual && profissionalAtual.regrasProcessadas) {
            trabalhaNesteDia = !!profissionalAtual.regrasProcessadas[diaSemana];
        } else if (!profissionalAtual) {
            trabalhaNesteDia = true;
        }

        if (passado || feriado || !trabalhaNesteDia) {
            dia.classList.add("invalido");
        } else {
            dia.classList.add("disponivel");

            const temConsulta = consultas.some(c => {
                const dataLimpa = (c.data || c.data_consulta || c.data_agendamento || "").toString().substring(0, 10);
                return dataLimpa === dataFormatada && c.status !== "cancelada";
            });

            if (temConsulta) {
                const marcador = document.createElement("div");
                marcador.className = "marcador-consulta";
                dia.appendChild(marcador);
            }
            dia.onclick = () => selecionarDia(dia, dataFormatada, diaSemana);
        }
        calendario.appendChild(dia);
    }
}

function selecionarDia(elemento, dataFormatada, diaSemana) {
    document.querySelectorAll(".dia").forEach(d => d.classList.remove("dia-focado"));
    elemento.classList.add("dia-focado");

    diaSelecionadoStr = dataFormatada;
    horarioSelecionado = null;

    const elPainel = document.getElementById("painel-agenda");
    if (elPainel) elPainel.style.display = "block";

    const elTituloData = document.getElementById("titulo-data-selecionada");
    if (elTituloData) elTituloData.innerText = `Agenda para: ${dataFormatada.split('-').reverse().join('/')}`;

    const elFormHorarios = document.getElementById("formulario-horarios");
    if (profissionalAtual) {
        if (elFormHorarios) elFormHorarios.style.display = "flex";
        gerarBotoesHorario(diaSemana, dataFormatada);
    } else {
        if (elFormHorarios) elFormHorarios.style.display = "none";
    }

    renderizarConsultasDoDia(dataFormatada);
}

function gerarBotoesHorario(diaSemana, dataStr) {
    const container = document.getElementById("horarios-container");
    if (!container) return;
    container.innerHTML = "";

    if (!profissionalAtual || !profissionalAtual.regrasProcessadas) return;

    const regras = profissionalAtual.regrasProcessadas[diaSemana];
    if (!regras) return;

    const tempo = profissionalAtual.tempoMinutos || 30;
    let minAtual = converterParaMinutos(regras.inicio);
    const minFim = converterParaMinutos(regras.fim);

    const agora = new Date();
    const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const minutosAgora = (agora.getHours() * 60) + agora.getMinutes();

    while (minAtual + tempo <= minFim) {
        const horaStr = converterParaHoraString(minAtual);

        const ocupado = consultas.some(c => {
            const dataConsulta = (c.data || c.data_agendamento || c.data_consulta || "").toString().substring(0, 10);
            const horaConsulta = (c.horario || c.hora || "").toString().substring(0, 5);
            return dataConsulta === dataStr && horaConsulta === horaStr && c.status !== "cancelada";
        });

        const jaPassouHoje = (dataStr === hojeStr) && (minAtual < minutosAgora);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerText = horaStr;
        btn.className = "btn-horario";

        if (ocupado || jaPassouHoje) {
            btn.disabled = true;
            btn.classList.add("ocupado");
        } else {
            btn.classList.add("disponivel");
            btn.onclick = (e) => {
                document.querySelectorAll(".btn-horario").forEach(b => b.classList.remove("selecionado"));
                e.target.classList.add("selecionado");
                horarioSelecionado = horaStr;
            };
        }

        container.appendChild(btn);
        minAtual += tempo;
    }
}

function renderizarConsultasDoDia(dataAlvo) {
    const listaConsultas = document.getElementById("lista-consultas-dia");
    if (!listaConsultas) return;
    listaConsultas.innerHTML = "";

    const consultasNoDia = consultas.filter(c => {
        const dataLimpa = (c.data || c.data_consulta || c.data_agendamento || "").toString().substring(0, 10);
        return dataLimpa === dataAlvo && c.status !== "cancelada";
    });

    if (consultasNoDia.length > 0) {
        consultasNoDia.forEach(c => {
            const item = document.createElement("div");
            item.className = "mini-card-resumo";
            const dataBR = dataAlvo.split('-').reverse().join('/');
            const tipoAtendimento = (c.tipo_atendimento || c.tipo || c.modalidade || "").toLowerCase().includes("presencial") ? "🏢 Presencial" : "💻 Online";

            item.innerHTML = `
                <strong>${c.horario || c.hora || ''} - ${c.profissional_nome || c.profissional || 'Consulta'}</strong>
                <p>Paciente: ${c.paciente_nome || c.paciente || c.nome || c.usuario || 'Não informado'} (${tipoAtendimento})</p>
                <small style="color: #7f5539;">Clique para ver detalhes</small>
            `;
            item.onclick = () => abrirModal(c, dataBR);
            listaConsultas.appendChild(item);
        });
    } else {
        listaConsultas.innerHTML = "<p style='color: gray; font-size: 13px;'>Nenhum compromisso marcado nesta data.</p>";
    }
}

function carregarMinhasConsultas() {
    const listaElemento = document.getElementById("lista-consultas-geral");
    if (!listaElemento) return;

    const consultasAtivas = consultas.filter(c => c.status !== "cancelada");

    if (!consultasAtivas || consultasAtivas.length === 0) {
        listaElemento.innerHTML = "<p style='font-size: 13px; color: gray;'>Você ainda não possui consultas agendadas.</p>";
        return;
    }

    listaElemento.innerHTML = ""; 

    consultasAtivas.forEach(c => {
        const dataRaw = c.data_consulta || c.data || c.data_agendamento;
        const dataLimpa = dataRaw ? dataRaw.toString().substring(0, 10) : "";
        const dataBR = dataLimpa ? dataLimpa.split('-').reverse().join('/') : "Data N/A";
        const tipoAtendimento = (c.tipo_atendimento || c.tipo || c.modalidade || "").toLowerCase().includes("presencial") ? "🏢 Presencial" : "💻 Online";

        const card = document.createElement("div");
        card.className = "card-consulta-item"; 

        card.innerHTML = `
            <div class="info-consulta">
                <strong>📅 ${dataBR} às ${c.horario || c.hora || ''}</strong>
                <p>👩‍⚕️ Profissional: ${c.profissional_nome || c.profissional || "Equipe Maia"} (${c.especialidade || c.esp || 'Atendimento Especializado'})</p>
                <p>👤 Paciente: ${c.paciente_nome || c.paciente || c.nome || c.usuario || "Não informado"}</p>
                <p>📍 Modalidade: <strong>${tipoAtendimento}</strong></p>
                <small style="color: #8c5a4d; font-style: italic;">Clique para ver detalhes</small>
            </div>
            <div class="status-badge" style="background:#28a745; color:white; padding:4px 8px; border-radius:12px; font-size:11px;">Confirmada</div>
        `;

        card.onclick = () => abrirModal(c, dataBR);
        listaElemento.appendChild(card);
    });
}

// =======================================
// 🟢 REALIZAR AGENDAMENTO
// =======================================
async function realizarAgendamento() {
    const selectProfissional = document.getElementById("select-profissional");
    const inputNome = document.getElementById("nome-paciente");
    const inputEmail = document.getElementById("email-paciente");
    const inputTelefone = document.getElementById("tel-paciente");
    const inputObs = document.getElementById("obs-consulta");
    const selectModalidade = document.getElementById("select-modalidade");

    const idProfissional = selectProfissional ? selectProfissional.value : null;
    const nomePaciente = inputNome ? inputNome.value.trim() : "";
    const emailPaciente = inputEmail ? inputEmail.value.trim() : "";
    const telefonePaciente = inputTelefone ? inputTelefone.value.trim() : "";
    const obsPaciente = inputObs ? inputObs.value.trim() : "Nenhuma observação";
    let modalidadeFinal = selectModalidade ? selectModalidade.value : "";

    if (!idProfissional) return alert("⚠️ Por favor, selecione um profissional.");
    if (!modalidadeFinal) return alert("⚠️ Por favor, selecione a modalidade de atendimento.");
    if (!diaSelecionadoStr || !horarioSelecionado) return alert("⚠️ Por favor, selecione uma data e horário no calendário.");
    if (!nomePaciente) return alert("⚠️ Por favor, informe o nome do paciente.");
    if (!emailPaciente) return alert("⚠️ Por favor, informe um e-mail válido.");

    const digitosTelefone = telefonePaciente.replace(/\D/g, '');
    if (digitosTelefone.length < 10) {
        return alert("⚠️ Por favor, informe um telefone de contato válido com DDD.");
    }

    const opcaoSelecionadaTexto = selectProfissional.options[selectProfissional.selectedIndex].text;
    const nomeExtraido = opcaoSelecionadaTexto.split(" (")[0].trim();

    let profSelecionado = PROFISSIONAIS_PROJETO.find(p => String(p.id) === String(idProfissional));
    
    if (!profSelecionado) {
        profSelecionado = {
            id: idProfissional,
            nome: nomeExtraido,
            esp: "Atendimento Especializado",
            foto: "carolina.png"
        };
    }

    const numId = parseInt(idProfissional, 10) || idProfissional;
    const nomeProfissional = profSelecionado.nome || nomeExtraido;
    const espProfissional = profSelecionado.esp || profSelecionado.especialidade || "Especialista";
    const fotoProfissional = profSelecionado.foto || "carolina.png";
    const dataFormatadaBR = diaSelecionadoStr.split('-').reverse().join('/');

    const dados = {
        profissional: nomeProfissional,
        profissional_nome: nomeProfissional,
        nome_profissional: nomeProfissional,

        especialidade: espProfissional,
        esp: espProfissional,

        tipo: modalidadeFinal,
        modalidade: modalidadeFinal,
        tipo_atendimento: modalidadeFinal.toLowerCase(),

        data: diaSelecionadoStr,
        data_consulta: diaSelecionadoStr,
        data_formatada: dataFormatadaBR,

        hora: horarioSelecionado,
        horario: horarioSelecionado,

        paciente_nome: nomePaciente,
        nome: nomePaciente,
        paciente: nomePaciente,

        email: emailPaciente,
        paciente_email: emailPaciente,

        telefone: telefonePaciente,
        paciente_telefone: telefonePaciente,

        id_profissional: numId,
        foto: fotoProfissional,
        status: "confirmada",

        local: modalidadeFinal.toLowerCase().includes("presencial") 
            ? "Clínica Maia - Atendimento Presencial" 
            : "Atendimento Online (Telemedicina)",
        observacoes: obsPaciente
    };

    try {
        let resposta = await fetch("/agendamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (!resposta.ok) {
            resposta = await fetch("/cliente/agendamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });
        }

        if (!resposta.ok) {
            resposta = await fetch("/usuario/agendamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });
        }

        if (resposta.ok) {
            const resJson = await resposta.json();
            dados.id = resJson.id || resJson.id_agendamento;
            dados.id_agendamento = resJson.id_agendamento || resJson.id;
        } else {
            dados.id = Date.now().toString(36);
        }

        alert("✅ Consulta agendada com sucesso com " + nomeProfissional + "!");
        consultas.push(dados);
        atualizarLocalStorageParaDashboard();
        window.location.reload();
    } catch (erro) {
        dados.id = Date.now().toString(36);
        consultas.push(dados);
        atualizarLocalStorageParaDashboard();
        alert("✅ Agendamento registrado para " + nomeProfissional + "!");
        window.location.reload();
    }
}

// =======================================
// 🟢 MODAIS E CANCELAMENTO
// =======================================
function abrirModal(c, dataBR) {
    const modal = document.getElementById("modalDetalhes");
    const conteudo = document.getElementById("conteudoModal");
    if (!modal || !conteudo) return;

    consultaSelecionadaParaCancelar = c;
    const emailExibir = c.email || c.paciente_email || c.usuario_email || 'Não informado';
    const telefoneExibir = c.telefone || c.paciente_telefone || 'Não informado';
    const tipoAtendimento = (c.tipo_atendimento || c.tipo || c.modalidade || "").toLowerCase().includes("presencial") ? "🏢 Pessoalmente (Presencial)" : "💻 Online (Videoconferência)";

    conteudo.innerHTML = `
        <div style="color: #3b2a25; text-align: left;">
            <p><strong>📅 Data:</strong> ${dataBR} às ${c.horario || c.hora || ''}</p>
            <p><strong>👩‍⚕️ Profissional:</strong> ${c.profissional_nome || c.profissional || 'Equipe Maia'}</p>
            <p><strong>🎓 Especialidade:</strong> ${c.especialidade || c.esp || 'Atendimento Especializado'}</p>
            <p><strong>👤 Paciente:</strong> ${c.paciente_nome || c.paciente || c.nome || c.usuario || 'Não informado'}</p>
            <p><strong>📧 E-mail:</strong> ${emailExibir}</p>
            <p><strong>📞 Contato:</strong> ${telefoneExibir}</p>
            <p><strong>💻 Modalidade:</strong> ${tipoAtendimento}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
            <p><strong>📍 Endereço / Local:</strong><br> ${c.local || c.endereco || 'Clínica Maia'}</p>
            <p><strong>📝 Observações:</strong><br> ${c.observacoes || c.observacao || 'Nenhuma.'}</p>

            <button onclick="abrirModalCancelamento()" 
                style="margin-top: 20px; background: #fff; border: 1px solid #d9534f; color: #d9534f; padding: 10px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold;">
                ❌ Desmarcar Consulta
            </button>
        </div>
    `;

    modal.style.display = "block";
}

function fecharModal() {
    const modal = document.getElementById("modalDetalhes");
    if (modal) modal.style.display = "none";
}

function abrirModalCancelamento() {
    fecharModal();
    const idCampo = document.getElementById("cancelar-id-agendamento");
    const emailCampo = document.getElementById("email-confirmacao-cancelamento");
    const modalCancel = document.getElementById("modalCancelamento");

    if (modalCancel && consultaSelecionadaParaCancelar) {
        const idVal = consultaSelecionadaParaCancelar.id || consultaSelecionadaParaCancelar.id_agendamento || 0;
        if (idCampo) idCampo.value = idVal;
        
        const emailPadrao = consultaSelecionadaParaCancelar.email || consultaSelecionadaParaCancelar.paciente_email || localStorage.getItem("usuarioEmail") || "";
        if (emailCampo) emailCampo.value = emailPadrao;

        modalCancel.style.display = "block";
    }
}

function fecharModalCancelamento() {
    const modalCancel = document.getElementById("modalCancelamento");
    if (modalCancel) modalCancel.style.display = "none";
}

async function removerConsultaLocalmente(consulta) {
    if (!consulta) return;
    const targetId = consulta.id || consulta.id_agendamento;

    consultas = consultas.filter(c => {
        const idAtual = c.id || c.id_agendamento;
        if (targetId && idAtual) return String(idAtual) !== String(targetId);
        
        const d1 = (c.data_consulta || c.data || "").toString().substring(0, 10);
        const h1 = (c.horario || c.hora || "").toString().substring(0, 5);
        const d2 = (consulta.data_consulta || consulta.data || "").toString().substring(0, 10);
        const h2 = (consulta.horario || consulta.hora || "").toString().substring(0, 5);
        
        return !(d1 === d2 && h1 === h2);
    });

    atualizarLocalStorageParaDashboard();
    alert("✅ Consulta desmarcada!");
    window.location.reload();
}

async function confirmarCancelamento() {
    const idAgendamento = document.getElementById("cancelar-id-agendamento")?.value;
    const motivo = document.getElementById("motivo-cancelamento")?.value;
    const emailConfirmacao = document.getElementById("email-confirmacao-cancelamento")?.value;

    if (!motivo || !emailConfirmacao) {
        alert("⚠️ Preencha o e-mail e o motivo do cancelamento.");
        return;
    }

    try {
        let response = await fetch(`/agendamento/${idAgendamento}/cancelar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ motivo, email: emailConfirmacao })
        });

        if (!response.ok) {
            response = await fetch("/cliente/cancelar-agendamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_agendamento: idAgendamento, motivo, email: emailConfirmacao })
            });
        }

        await removerConsultaLocalmente(consultaSelecionadaParaCancelar);
    } catch (error) {
        await removerConsultaLocalmente(consultaSelecionadaParaCancelar);
    }
}

window.fecharModal = fecharModal;
window.fecharModalCancelamento = fecharModalCancelamento;
window.abrirModalCancelamento = abrirModalCancelamento;
window.confirmarCancelamento = confirmarCancelamento;

window.onclick = function(event) {
    const modalD = document.getElementById("modalDetalhes");
    const modalC = document.getElementById("modalCancelamento");
    if (event.target === modalD) fecharModal();
    if (event.target === modalC) fecharModalCancelamento();
};

async function preencherProfissionais() {
    const selectProfissional = document.getElementById("select-profissional");
    if (!selectProfissional) return;

    let listaProfissionais = [];

    try {
        const res = await fetch("/api/profissionais");
        if (res.ok) {
            const dados = await res.json();
            if (Array.isArray(dados) && dados.length > 0) listaProfissionais = dados;
        }
    } catch (err) {}

    if (!listaProfissionais || listaProfissionais.length === 0) {
        listaProfissionais = PROFISSIONAIS_PROJETO;
    }

    selectProfissional.innerHTML = '<option value="">Selecione um profissional...</option>';

    listaProfissionais.forEach(p => {
        const option = document.createElement("option");
        const id = p.id || p.id_profissional;
        option.value = id;
        option.textContent = `${p.nome || p.profissional_nome} (${p.esp || p.especialidade || 'Especialista'})`;

        if (profissionalIdSel && String(id) === String(profissionalIdSel)) {
            option.selected = true;
        }

        selectProfissional.appendChild(option);
    });

    selectProfissional.addEventListener("change", async (e) => {
        const novoId = e.target.value;
        profissionalIdSel = novoId;
        diaSelecionadoStr = null;
        horarioSelecionado = null;
        
        const elPainel = document.getElementById("painel-agenda");
        if (elPainel) elPainel.style.display = "none";

        await selecionarProfissionalPorId(novoId, listaProfissionais);
    });

    if (profissionalIdSel) {
        await selecionarProfissionalPorId(profissionalIdSel, listaProfissionais);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const formAgendamento = document.getElementById("form-agendamento");
    if (formAgendamento) {
        formAgendamento.addEventListener("submit", (e) => {
            e.preventDefault();
            realizarAgendamento();
        });
    }

    const bPrev = document.getElementById("btn-prev");
    const bNext = document.getElementById("btn-next");

    if (bPrev) {
        bPrev.onclick = () => { 
            dataAtual.setMonth(dataAtual.getMonth() - 1); 
            renderCalendario(); 
        };
    }
    if (bNext) {
        bNext.onclick = () => { 
            dataAtual.setMonth(dataAtual.getMonth() + 1); 
            renderCalendario(); 
        };
    }

    const selectHTML = obterSelectModalidadeHTML();
    if (selectHTML) {
        selectHTML.addEventListener("change", (e) => {
            modalidadeSelecionada = e.target.value;
        });
    }

    preencherProfissionais();
    carregarDados();
});
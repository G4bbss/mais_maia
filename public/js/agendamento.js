console.log("📅 Módulo de Agendamentos e Calendário carregado!");

// =======================================
// 🟢 VARIÁVEIS DE ESTADO
// =======================================
const calendario = document.getElementById("calendario");
let dataAtual = new Date();
let diaSelecionadoStr = null; 
let horarioSelecionado = null;
let modalidadeSelecionada = null; // Armazena a modalidade escolhida
let consultas = [];
let profissionalAtual = null;
let consultaSelecionadaParaCancelar = null;

const params = new URLSearchParams(window.location.search);
let profissionalIdSel = params.get("id") || params.get("profissional");

// Helper para obter o elemento Select HTML da modalidade se existir
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
        const dataLimpa = (c.data_consulta || c.data || c.data_agendamento || "").toString().substring(0, 10);
        if (!dataLimpa) return;

        if (!compromissosFormatados[dataLimpa]) {
            compromissosFormatados[dataLimpa] = [];
        }

        const modIcone = (c.tipo_atendimento || c.modalidade || "").toLowerCase().includes("presencial") ? "🏢 Presencial" : "💻 Online";

        compromissosFormatados[dataLimpa].push({
            titulo: c.profissional_nome || c.profissional || "Consulta Agendada",
            horario: c.horario || c.hora || "",
            detalhe: `Paciente: ${c.paciente_nome || c.paciente || c.nome || c.usuario || "Não informado"} (${modIcone})`
        });
    });

    localStorage.setItem("maia_compromissos", JSON.stringify(compromissosFormatados));
    localStorage.setItem("maia_consultas_raw", JSON.stringify(consultas));
}

// =======================================
// 🟢 GERENCIADOR DE MODALIDADE (SELECT / BOTÕES)
// =======================================
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

    // Suporte para Container de Botões (se existirem)
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

    // Suporte para campo <select> HTML
    if (selectHTML) {
        if (selectHTML.value) {
            modalidadeSelecionada = selectHTML.value;
        }
        selectHTML.onchange = (e) => {
            modalidadeSelecionada = e.target.value;
        };
    }
}

// =======================================
// 🟢 INTERPRETADOR DE DISPONIBILIDADE
// =======================================
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

// =======================================
// 🟢 CARREGAMENTO DE DADOS
// =======================================
async function selecionarProfissionalPorId(idProf) {
    if (!idProf) {
        profissionalAtual = null;
        atualizarOpcoesModalidade(null);
        renderCalendario();
        return;
    }

    try {
        const res = await fetch(`/api/profissionais/${idProf}`);
        if (res.ok) {
            profissionalAtual = await res.json();
            if (profissionalAtual) {
                profissionalAtual.regrasProcessadas = processarDadosProfissional(profissionalAtual);
            }
        }
    } catch (err) {
        console.error("Erro ao carregar profissional:", err);
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

    if (emailLogado) {
        try {
            let res = await fetch(`/usuario/meus-agendamento/${emailLogado}`);
            if (!res.ok) {
                res = await fetch(`/cliente/meus-agendamento/${emailLogado}`);
            }

            if (res.ok) {
                const texto = await res.text();
                try {
                    const dadosParsed = JSON.parse(texto);
                    if (Array.isArray(dadosParsed)) {
                        consultas = dadosParsed;
                    } else if (dadosParsed && Array.isArray(dadosParsed.consultas)) {
                        consultas = dadosParsed.consultas;
                    } else if (dadosParsed && Array.isArray(dadosParsed.agendamentos)) {
                        consultas = dadosParsed.agendamentos;
                    } else {
                        consultas = [];
                    }
                } catch (e) {
                    consultas = [];
                }
            }
        } catch (err) {
            console.error("Erro ao carregar consultas:", err);
        }
    }

    if (!consultas || consultas.length === 0) {
        try {
            const rawLocal = JSON.parse(localStorage.getItem("maia_consultas_raw") || "[]");
            if (Array.isArray(rawLocal) && rawLocal.length > 0) {
                consultas = rawLocal;
            }
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

// =======================================
// 🟢 RENDERIZAÇÃO DO CALENDÁRIO
// =======================================
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
                return dataLimpa === dataFormatada;
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
            return dataConsulta === dataStr && horaConsulta === horaStr;
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
        return dataLimpa === dataAlvo;
    });

    if (consultasNoDia.length > 0) {
        consultasNoDia.forEach(c => {
            const item = document.createElement("div");
            item.className = "mini-card-resumo";
            const dataBR = dataAlvo.split('-').reverse().join('/');
            const tipoAtendimento = (c.tipo_atendimento || c.modalidade || "").toLowerCase().includes("presencial") ? "🏢 Presencial" : "💻 Online";

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

    if (!consultas || consultas.length === 0) {
        listaElemento.innerHTML = "<p style='font-size: 13px; color: gray;'>Você ainda não possui consultas agendadas.</p>";
        return;
    }

    listaElemento.innerHTML = ""; 

    consultas.forEach(c => {
        const dataRaw = c.data_consulta || c.data || c.data_agendamento;
        const dataLimpa = dataRaw ? dataRaw.toString().substring(0, 10) : "";
        const dataBR = dataLimpa ? dataLimpa.split('-').reverse().join('/') : "Data N/A";
        const tipoAtendimento = (c.tipo_atendimento || c.modalidade || "").toLowerCase().includes("presencial") ? "🏢 Presencial" : "💻 Online";

        const card = document.createElement("div");
        card.className = "card-consulta-item"; 

        card.innerHTML = `
            <div class="info-consulta">
                <strong>📅 ${dataBR} às ${c.horario || c.hora || ''}</strong>
                <p>👩‍⚕️ Profissional: ${c.profissional_nome || c.profissional || "Equipe Maia"}</p>
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
    
    // Captura da modalidade via Select HTML ou via variável global
    const selectHTML = obterSelectModalidadeHTML();
    let modalidadeFinal = modalidadeSelecionada || (selectHTML ? selectHTML.value : "");

    // Normalização do texto da modalidade
    if (modalidadeFinal) {
        const modLower = modalidadeFinal.toLowerCase();
        if (modLower.includes("online") || modLower.includes("telemedicina")) {
            modalidadeFinal = "online";
        } else if (modLower.includes("presencial") || modLower.includes("pessoalmente")) {
            modalidadeFinal = "presencial";
        }
    }

    const idProfissional = selectProfissional ? selectProfissional.value : null;
    const nomePaciente = inputNome ? inputNome.value.trim() : "";
    const emailPaciente = inputEmail ? inputEmail.value.trim() : "";
    const telefonePaciente = inputTelefone ? inputTelefone.value.trim() : "";
    const obsPaciente = inputObs ? inputObs.value.trim() : "Nenhuma observação";

    if (!idProfissional) return alert("⚠️ Por favor, selecione um profissional.");
    if (!modalidadeFinal) return alert("⚠️ Por favor, selecione a modalidade de atendimento (Online ou Pessoalmente).");
    if (!diaSelecionadoStr || !horarioSelecionado) return alert("⚠️ Por favor, selecione uma data e horário no calendário.");
    if (!nomePaciente) return alert("⚠️ Por favor, informe o nome do paciente.");
    if (!emailPaciente) return alert("⚠️ Por favor, informe um e-mail válido.");

    const digitosTelefone = telefonePaciente.replace(/\D/g, '');
    if (digitosTelefone.length < 10) {
        return alert("⚠️ Por favor, informe um telefone de contato válido com DDD (mínimo de 10 dígitos).");
    }

    const dataFormatadaBR = diaSelecionadoStr.split('-').reverse().join('/');
    const nomeProfissional = profissionalAtual ? (profissionalAtual.profissional_nome || profissionalAtual.nome) : "Equipe Maia";
    const enderecoProfissional = modalidadeFinal === "presencial" 
        ? (profissionalAtual ? (profissionalAtual.profissional_endereco || profissionalAtual.endereco || "Clínica Maia - Atendimento Presencial") : "Clínica Maia")
        : "Sala Virtual Maia Care (Online)";

    const dados = {
        email: emailPaciente,
        paciente_email: emailPaciente,
        usuario_email: emailPaciente,
        email_cliente: emailPaciente,
        
        paciente_nome: nomePaciente,
        nome: nomePaciente,
        paciente: nomePaciente,
        usuario: nomePaciente,
        
        telefone: telefonePaciente,
        paciente_telefone: telefonePaciente,
        celular: telefonePaciente,

        id_profissional: idProfissional,
        profissional_id: idProfissional,
        profissional_nome: nomeProfissional,
        profissional: nomeProfissional,
        profissional_email: profissionalAtual ? profissionalAtual.email : "",
        especialidade: profissionalAtual ? (profissionalAtual.especialidade || "Especialista") : "Clínica Geral",

        tipo_atendimento: modalidadeFinal,
        modalidade: modalidadeFinal,
        tipo: modalidadeFinal,

        data_consulta: diaSelecionadoStr,
        data: diaSelecionadoStr,
        data_formatada: dataFormatadaBR,
        horario: horarioSelecionado,
        hora: horarioSelecionado,

        endereco: enderecoProfissional,
        observacoes: obsPaciente,
        observacao: obsPaciente
    };

    try {
        let resposta = await fetch("/cliente/agendamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (!resposta.ok && resposta.status === 404) {
            resposta = await fetch("/usuario/agendamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });
        }

        const textoResposta = await resposta.text();
        let resultado = {};
        try { resultado = JSON.parse(textoResposta); } catch(e){}

        if (resposta.ok && (resultado.ok || resultado.sucesso || !resultado.erro)) {
            alert("✅ Consulta agendada com sucesso!");
            if (resultado.id_agendamento || resultado.id) {
                dados.id = resultado.id_agendamento || resultado.id;
            }
            localStorage.setItem("usuarioEmail", emailPaciente);
            consultas.push(dados);
            atualizarLocalStorageParaDashboard();
            window.location.reload();
        } else {
            alert("❌ Falha no Agendamento: " + (resultado.erro || resultado.mensagem || `Erro ${resposta.status}`));
        }
    } catch (erro) {
        console.error("Erro no agendamento:", erro);
        alert("Erro ao conectar com o servidor: " + erro.message);
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
    const tipoAtendimento = (c.tipo_atendimento || c.modalidade || "").toLowerCase().includes("presencial") ? "🏢 Pessoalmente (Presencial)" : "💻 Online (Videoconferência)";

    conteudo.innerHTML = `
        <div style="color: #3b2a25; text-align: left;">
            <p><strong>📅 Data:</strong> ${dataBR} às ${c.horario || c.hora || ''}</p>
            <p><strong>👩‍⚕️ Profissional:</strong> ${c.profissional_nome || c.profissional || 'Equipe Maia'}</p>
            <p><strong>👤 Paciente:</strong> ${c.paciente_nome || c.paciente || c.nome || c.usuario || 'Não informado'}</p>
            <p><strong>📧 E-mail:</strong> ${emailExibir}</p>
            <p><strong>📞 Contato:</strong> ${telefoneExibir}</p>
            <p><strong>💻 Modalidade:</strong> ${tipoAtendimento}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
            <p><strong>📍 Endereço / Local:</strong><br> ${c.endereco || c.profissional_endereco || 'Clínica Maia'}</p>
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
        const idVal = consultaSelecionadaParaCancelar.id_agendamento || consultaSelecionadaParaCancelar.id || 0;
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
    const dataAlvo = (consulta.data_consulta || consulta.data || "").toString().substring(0, 10);
    const horaAlvo = (consulta.horario || consulta.hora || "").toString().substring(0, 5);

    consultas = consultas.filter(c => {
        const d = (c.data_consulta || c.data || "").toString().substring(0, 10);
        const h = (c.horario || c.hora || "").toString().substring(0, 5);
        return !(d === dataAlvo && h === horaAlvo);
    });

    atualizarLocalStorageParaDashboard();
    alert("✅ Processo concluído!");
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

    const c = consultaSelecionadaParaCancelar || {};
    const dataOriginal = c.data_consulta || c.data || "";
    const dataBR = dataOriginal ? dataOriginal.toString().substring(0, 10).split('-').reverse().join('/') : "";

    const payload = {
        id_agendamento: idAgendamento,
        id: idAgendamento,
        
        email: emailConfirmacao,
        paciente_email: emailConfirmacao,
        usuario_email: emailConfirmacao,
        
        paciente_nome: c.paciente_nome || c.paciente || c.nome || c.usuario || "Paciente",
        nome: c.paciente_nome || c.paciente || c.nome || c.usuario || "Paciente",
        paciente: c.paciente_nome || c.paciente || c.nome || c.usuario || "Paciente",
        
        profissional_nome: c.profissional_nome || c.profissional || "Equipe Maia",
        profissional: c.profissional_nome || c.profissional || "Equipe Maia",

        data: dataOriginal,
        data_consulta: dataOriginal,
        data_formatada: dataBR,
        
        horario: c.horario || c.hora || "",
        hora: c.horario || c.hora || "",
        
        motivo: motivo
    };

    try {
        let response = await fetch("/cliente/cancelar-agendamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok && response.status === 404) {
            response = await fetch("/usuario/cancelar-agendamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }

        await removerConsultaLocalmente(consultaSelecionadaParaCancelar);
    } catch (error) {
        console.error("Erro na requisição de cancelamento:", error);
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

// =======================================
// 🟢 PROFISSIONAIS E INICIALIZAÇÃO
// =======================================
async function preencherProfissionais() {
    const selectProfissional = document.getElementById("select-profissional");
    if (!selectProfissional) return;

    try {
        const res = await fetch("/api/profissionais");
        if (!res.ok) return;

        const profissionais = await res.json();
        selectProfissional.innerHTML = '<option value="">Selecione um profissional...</option>';

        profissionais.forEach(p => {
            const option = document.createElement("option");
            const id = p.id_profissional || p.id;
            option.value = id;
            option.textContent = `${p.profissional_nome || p.nome} (${p.especialidade || 'Especialista'})`;

            if (profissionalIdSel && id == profissionalIdSel) {
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

            await selecionarProfissionalPorId(novoId);
        });

    } catch (err) {
        console.error("Erro ao carregar profissionais:", err);
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

    // Listener para caso haja um select HTML de modalidade no form
    const selectHTML = obterSelectModalidadeHTML();
    if (selectHTML) {
        selectHTML.addEventListener("change", (e) => {
            modalidadeSelecionada = e.target.value;
        });
    }

    preencherProfissionais();
    carregarDados();
});
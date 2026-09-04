/* BASE DE PROFISSIONAIS DA PLATAFORMA */
const PROFISSIONAIS_PROJETO = [
    { id: 1, nome: "Dra. Ana Beatriz Mendes", esp: "Psicologia Perinatal", foto: "ana.png", online: true },
    { id: 2, nome: "Dra. Carolina Figueiredo Lima", esp: "Pediatria Materna", foto: "carolina.png", online: true },
    { id: 3, nome: "Dra. Rafaela Souza Costa", esp: "Ginecologia & Obstetrícia", foto: "rafaela.png", online: false },
    { id: 4, nome: "Dr. Ricardo Almeida Neto", esp: "Pediatria Neonatal", foto: "ricardo.png", online: true },
    { id: 5, nome: "Dra. Juliana Martins Oliveira", esp: "Nutrição Infantil", foto: "juliana.png", online: false },
    { id: 6, nome: "Camila Rocha Ferreira", esp: "Plantão Emergencial", foto: "camila.png", online: true },
    { id: 7, nome: "Dra. Patrícia Oliveira Santos", esp: "Mastologia & Amamentação", foto: "patricia.png", online: true },
    { id: 8, nome: "Mariana Castro Mendes", esp: "Apoio Emocional & Enfermagem", foto: "mariana.png", online: true }
];

/* ESTADOS GLOBAIS DA CHAMADA E INTERFACE */
let medicoAtualConsulta = null;
let profissionalAtualChat = PROFISSIONAIS_PROJETO[0];
let timerInterval = null;
let segundosConsulta = 0;
let micAtivo = true;
let camAtiva = true;
let jitsiApi = null;

document.addEventListener("DOMContentLoaded", () => {
    carregarPerfilUsuario();
    carregarAgendamentosDoBanco();
    renderizarDirectChat();
    configurarEventosInterface();
    
    window.addEventListener("focus", carregarAgendamentosDoBanco);
});

/* BUSCA OS DADOS DO USUÁRIO LOGADO */
function carregarPerfilUsuario() {
    fetch("/cliente/me")
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(usuario => {
            const primeiroNome = (usuario.Nome || usuario.nome || usuario.profissional_nome || "Usuário").split(" ")[0];
            const nomeMiniEl = document.getElementById("nomeMini");
            const avatarMiniEl = document.getElementById("avatarMini");
            if (nomeMiniEl) nomeMiniEl.textContent = primeiroNome;
            if (avatarMiniEl) avatarMiniEl.textContent = primeiroNome.charAt(0).toUpperCase();
        })
        .catch(() => {});
}

/* BUSCA OS AGENDAMENTOS DO BANCO DE DADOS */
async function carregarAgendamentosDoBanco() {
    const grid = document.getElementById("gridConsultas");
    if (!grid) return;

    let agendamentos = [];
    const emailLogado = localStorage.getItem("usuarioEmail");

    const endpoints = emailLogado ? [
        `/usuario/meus-agendamento/${emailLogado}`,
        `/cliente/meus-agendamento/${emailLogado}`,
        `/agendamento?email=${emailLogado}`
    ] : [
        "/agendamento",
        "/api/agendamentos/usuario",
        "/cliente/agendamentos"
    ];

    for (const url of endpoints) {
        try {
            const resposta = await fetch(url);
            if (resposta.ok) {
                const dados = await resposta.json();
                agendamentos = Array.isArray(dados) ? dados : (dados.consultas || dados.agendamentos || []);
                if (agendamentos.length > 0) break;
            }
        } catch (err) {
            console.warn(`Erro na tentativa de busca em ${url}:`, err);
        }
    }

    if (!agendamentos || agendamentos.length === 0) {
        try {
            const rawLocal = JSON.parse(localStorage.getItem("maia_consultas_raw") || "[]");
            if (Array.isArray(rawLocal) && rawLocal.length > 0) agendamentos = rawLocal;
        } catch (e) {}
    }

    if (agendamentos && agendamentos.length > 0) {
        renderizarConsultasAgendadas(agendamentos);
    } else {
        exibirMensagemSemConsultas();
    }
}

/* IDENTIFICAÇÃO EXATA DO PROFISSIONAL */
function encontrarProfissionalNoItem(item) {
    if (!item) return null;

    const idProf = Number(item.id_profissional || item.profissional_id || item.medico_id || item.id_medico);
    if (idProf && !isNaN(idProf)) {
        const profPorId = PROFISSIONAIS_PROJETO.find(p => p.id === idProf);
        if (profPorId) return profPorId;
    }

    const nomeBusca = (item.profissional_nome || item.nome_profissional || item.nome_medico || item.medico_nome || item.profissional || item.medico || "").toLowerCase().trim();

    if (nomeBusca) {
        const profEncontrado = PROFISSIONAIS_PROJETO.find(p => {
            const nomeBase = p.nome.toLowerCase().replace(/dr(a)?\.\s*/g, '').trim();
            return nomeBusca.includes(nomeBase) || nomeBase.includes(nomeBusca);
        });
        if (profEncontrado) return profEncontrado;
    }

    return null;
}

/* RENDERIZA OS CARDS DAS CONSULTAS */
function renderizarConsultasAgendadas(listaAgendamentos) {
    const grid = document.getElementById("gridConsultas");
    if (!grid) return;
    grid.innerHTML = "";

    const agendamentosMapeados = listaAgendamentos
        .filter(item => item.status !== "cancelada" && (!item.tipo || !item.tipo.toLowerCase().includes("emergencia_imediata")))
        .map(item => {
            let dataFormatada = item.data_formatada || item.data_consulta || item.data_agendamento || item.data || item.dia || "Data a definir";
            if (dataFormatada && dataFormatada.includes("-")) {
                dataFormatada = dataFormatada.substring(0, 10).split('-').reverse().join('/');
            }

            const profMatch = encontrarProfissionalNoItem(item);

            const nomeFinal = profMatch ? profMatch.nome : (item.profissional_nome || item.nome_profissional || item.medico || item.profissional || "Profissional Maia Care");
            const espFinal = profMatch ? profMatch.esp : (item.especialidade || "Atendimento Especializado");
            
            const fotoFallback = "img/maiaFavicon.png";
            let fotoFinal = fotoFallback;

            if (profMatch) {
                fotoFinal = profMatch.foto.startsWith("img/") ? profMatch.foto : `img/${profMatch.foto}`;
            } else if (item.foto || item.foto_medico) {
                const rawFoto = item.foto || item.foto_medico;
                fotoFinal = rawFoto.startsWith("http") || rawFoto.startsWith("img/") ? rawFoto : `img/${rawFoto}`;
            }

            let pacienteNome = item.paciente_nome || item.nome_paciente || item.paciente || item.cliente_nome || item.usuario;
            if (!pacienteNome || pacienteNome === nomeFinal) {
                pacienteNome = (item.nome && item.nome !== nomeFinal) ? item.nome : (document.getElementById("nomeMini")?.textContent || "Paciente");
            }

            return {
                id: item.id_agendamento || item.id,
                profissional: nomeFinal,
                especialidade: espFinal,
                data: dataFormatada,
                horario: item.horario || item.hora || item.horario_agendamento || "Horário a definir",
                paciente: pacienteNome,
                foto: fotoFinal,
                linkVideo: item.linkvideoconferencia || item.link_videoconferencia || item.linkvideoconf || item.link || "",
                status: item.status
            };
        });

    if (agendamentosMapeados.length === 0) {
        exibirMensagemSemConsultas();
        return;
    }

    agendamentosMapeados.forEach(item => {
        const card = document.createElement("div");
        card.className = "card-consulta";
        card.innerHTML = `
            <div>
                <div class="card-consulta-topo">
                    <img src="${item.foto}" class="medico-foto" alt="${item.profissional}" onerror="this.onerror=null; this.src='img/maiaFavicon.png';">
                    <div class="medico-detalhes">
                        <h3>${item.profissional}</h3>
                        <span>${item.especialidade}</span>
                        <span class="paciente-tag">👤 Paciente: ${item.paciente}</span>
                    </div>
                </div>
                <div class="card-consulta-horario">
                    <span>📅 <strong>${item.data}</strong></span>
                    <span>⏰ <strong>às ${item.horario}</strong></span>
                </div>
            </div>
            <button class="btn-entrar-sala">📹 Entrar na Sala Virtual</button>
        `;

        const btnEntrar = card.querySelector(".btn-entrar-sala");
        btnEntrar.addEventListener("click", () => {
            entrarChamadaDireta(item.profissional, item.especialidade, item.foto, item.paciente, item.id);
        });

        grid.appendChild(card);
    });
}

function exibirMensagemSemConsultas() {
    const grid = document.getElementById("gridConsultas");
    if (!grid) return;
    grid.innerHTML = `
        <div class="sem-consultas">
            <p>Você não possui nenhuma consulta agendada no momento.</p>
            <a href="./agendamento.html" style="display:inline-block; margin-top:10px; color:#7f5539; font-weight:bold; text-decoration:underline;">
                📅 Clique aqui para agendar uma consulta no site
            </a>
        </div>`;
}

/* INICIALIZAÇÃO DA SALA WEBRTC VIA JITSI MEET */
function entrarChamadaDireta(medico, esp, foto, paciente, idConsulta) {
    fecharFila();

    let fotoProcessada = foto || "img/maiaFavicon.png";
    if (!fotoProcessada.startsWith("http") && !fotoProcessada.startsWith("img/")) {
        fotoProcessada = `img/${fotoProcessada}`;
    }

    medicoAtualConsulta = { medico, esp, foto: fotoProcessada, paciente, idConsulta };
    
    const elMedico = document.getElementById("modalNomeMedico");
    const elEsp = document.getElementById("modalEspecialidade");
    const elVideo = document.getElementById("modalVideo");

    if (elMedico) elMedico.textContent = medico;
    if (elEsp) elEsp.textContent = esp;
    
    if (elVideo) {
        elVideo.classList.add("ativo");
        elVideo.style.display = "flex";
    }

    const nomeSalaSanitizado = (medico + "-" + (idConsulta || "geral")).replace(/[^a-zA-Z0-9]/g, "");
    const roomName = `MaiaCare_${nomeSalaSanitizado}`;

    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }

    const containerJitsi = document.querySelector(".container-video-modal");
    if (containerJitsi) {
        containerJitsi.innerHTML = "";
        
        if (window.JitsiMeetExternalAPI) {
            const domain = "meet.jit.si";
            const options = {
                roomName: roomName,
                width: "100%",
                height: "100%",
                parentNode: containerJitsi,
                userInfo: {
                    displayName: paciente || "Paciente Maia Care"
                },
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'desktop', 'fullscreen',
                        'raisehand', 'tileview', 'hangup'
                    ],
                    SHOW_JITSI_WATERMARK: false
                }
            };

            jitsiApi = new JitsiMeetExternalAPI(domain, options);

            jitsiApi.addEventListeners({
                readyToClose: function () {
                    encerrarConsultaModal();
                }
            });
        } else {
            containerJitsi.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#fff; text-align:center;">
                    <p>⚠️ Não foi possível carregar o serviço de vídeo.</p>
                    <small>Verifique se o script do Jitsi está incluído no HTML.</small>
                </div>`;
        }
    }

    const inputPaciente = document.getElementById("formNomePaciente");
    if (inputPaciente) {
        inputPaciente.value = paciente || (document.getElementById("nomeMini")?.textContent || "Paciente");
    }

    segundosConsulta = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        segundosConsulta++;
        const min = String(Math.floor(segundosConsulta / 60)).padStart(2, '0');
        const seg = String(segundosConsulta % 60).padStart(2, '0');
        const elTimer = document.getElementById("modalTimer");
        if (elTimer) elTimer.textContent = `${min}:${seg}`;
    }, 1000);
}

function encerrarConsultaModal() {
    clearInterval(timerInterval);

    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }

    const modalVideo = document.getElementById("modalVideo");
    const modalTimer = document.getElementById("modalTimer");
    const formAtendimento = document.getElementById("formAtendimento");

    if (modalVideo) {
        modalVideo.classList.remove("ativo");
        modalVideo.style.display = "none";
    }
    if (modalTimer) modalTimer.textContent = "00:00";
    if (formAtendimento) formAtendimento.reset();
}

/* EVENTOS DE INTERFACE E BOTÕES */
function configurarEventosInterface() {
    const btnConta = document.getElementById("botaoConta");
    const menuConta = document.getElementById("menuConta");
    const panelDirect = document.getElementById("directPanel");

    if (btnConta && menuConta) {
        btnConta.addEventListener("click", (e) => {
            e.stopPropagation();
            menuConta.classList.toggle("aberto");
            menuConta.style.display = menuConta.classList.contains("aberto") ? "block" : "none";
        });
        document.addEventListener("click", () => {
            menuConta.classList.remove("aberto");
            menuConta.style.display = "none";
        });
    }

    const btnToggleDirect = document.getElementById("btnToggleDirect");
    const btnFecharDirect = document.getElementById("btnFecharDirect");
    if (btnToggleDirect && panelDirect) btnToggleDirect.addEventListener("click", () => panelDirect.classList.add("aberto"));
    if (btnFecharDirect && panelDirect) btnFecharDirect.addEventListener("click", () => panelDirect.classList.remove("aberto"));

    const btnEnviarMsg = document.getElementById("btnEnviarMsg");
    const inputDirect = document.getElementById("inputDirect");
    if (btnEnviarMsg) btnEnviarMsg.addEventListener("click", enviarMensagemDirect);
    if (inputDirect) {
        inputDirect.addEventListener("keypress", (e) => {
            if (e.key === "Enter") enviarMensagemDirect();
        });
    }

    const inputChatChamada = document.getElementById("inputChatChamada");
    if (inputChatChamada) {
        inputChatChamada.addEventListener("keypress", (e) => {
            if (e.key === "Enter") enviarChatChamada();
        });
    }

    const botaoSair = document.getElementById("botaoSair");
    if (botaoSair) {
        botaoSair.addEventListener("click", () => {
            fetch("/cliente/logout", { method: "POST" }).finally(() => window.location.href = "/");
        });
    }
}

/* DIRECT CHAT LATERAL */
function renderizarDirectChat() {
    const container = document.getElementById("listaContatosChat");
    if (!container) return;
    container.innerHTML = "";

    PROFISSIONAIS_PROJETO.forEach((prof, idx) => {
        const item = document.createElement("div");
        item.className = `item-contato ${idx === 0 ? 'ativo' : ''}`;
        item.onclick = () => selecionarProfissionalChat(prof, item);
        item.innerHTML = `
            <div class="avatar-contato-box">
                <img src="img/${prof.foto}" class="avatar-contato" alt="${prof.nome}" onerror="this.onerror=null; this.src='img/maiaFavicon.png';">
                ${prof.online ? '<span class="ponto-status-chat"></span>' : ''}
            </div>
            <span class="nome-contato-chat">${prof.nome.split(' ')[0]}</span>
        `;
        container.appendChild(item);
    });

    if (PROFISSIONAIS_PROJETO.length > 0) {
        profissionalAtualChat = PROFISSIONAIS_PROJETO[0];
    }
}

function selecionarProfissionalChat(prof, el) {
    profissionalAtualChat = prof;
    document.querySelectorAll(".item-contato").forEach(e => e.classList.remove("ativo"));
    if (el) el.classList.add("ativo");

    const corpo = document.getElementById("corpoChat");
    if (corpo) {
        corpo.innerHTML = `
            <div class="balao-msg recebida">
                Olá! Sou ${prof.nome} (${prof.esp}). Como posso te ajudar hoje?
                <span class="tempo-msg">Agora</span>
            </div>
        `;
    }
}

/* ENVIO DA MENSAGEM DO DIRECT INTEGRADO À IA */
async function enviarMensagemDirect() {
    const input = document.getElementById("inputDirect");
    if (!input) return;
    const texto = input.value.trim();
    if (!texto) return;

    const corpo = document.getElementById("corpoChat");
    if (!corpo) return;

    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgUser = document.createElement("div");
    msgUser.className = "balao-msg enviada";
    msgUser.innerHTML = `${texto} <span class="tempo-msg">${hora}</span>`;
    corpo.appendChild(msgUser);

    input.value = "";
    corpo.scrollTop = corpo.scrollHeight;

    const msgCarregando = document.createElement("div");
    msgCarregando.className = "balao-msg recebida";
    msgCarregando.innerHTML = `<em>Digitando...</em>`;
    corpo.appendChild(msgCarregando);
    corpo.scrollTop = corpo.scrollHeight;

    try {
        const response = await fetch("/api/chatbot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mensagem: texto,
                profissional: profissionalAtualChat ? profissionalAtualChat.nome : "Profissional Maia Care",
                especialidade: profissionalAtualChat ? profissionalAtualChat.esp : "Saúde Materno-Infantil"
            })
        });

        const dados = await response.json();
        const horaResp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgCarregando.innerHTML = `${dados.resposta} <span class="tempo-msg">${horaResp}</span>`;
    } catch (erro) {
        console.error("Erro ao comunicar com chatbot:", erro);
        msgCarregando.innerHTML = `Desculpe, ocorreu uma oscilação na conexão. Tente novamente em instantes. <span class="tempo-msg">${hora}</span>`;
    }

    corpo.scrollTop = corpo.scrollHeight;
}

/* FILA DE EMERGÊNCIA */
function iniciarFilaEmergencia() {
    const modalFila = document.getElementById("modalFila");
    const spinnerFila = document.getElementById("spinnerFila");
    const btnEntrar = document.getElementById("btnEntrarChamadaFila");
    
    if (modalFila) {
        modalFila.classList.add("ativo");
        modalFila.style.display = "flex";
    }
    if (spinnerFila) spinnerFila.style.display = "block";
    if (btnEntrar) btnEntrar.style.display = "none";

    setTimeout(() => {
        if (spinnerFila) spinnerFila.style.display = "none";
        const statusTexto = document.getElementById("statusFilaTexto");
        const subStatus = document.getElementById("subStatusFila");
        if (statusTexto) statusTexto.textContent = "Dra. Camila Rocha está online!";
        if (subStatus) subStatus.textContent = "Sua sala emergencial está pronta.";
        if (btnEntrar) btnEntrar.style.display = "flex";
    }, 2500);
}

function fecharFila() {
    const modalFila = document.getElementById("modalFila");
    if (modalFila) {
        modalFila.classList.remove("ativo");
        modalFila.style.display = "none";
    }
}

function alternarTabChamada(tab) {
    const tabChat = document.getElementById("tabChat");
    const tabForm = document.getElementById("tabForm");
    const boxTabChat = document.getElementById("boxTabChat");
    const boxTabForm = document.getElementById("boxTabForm");

    if (tabChat) tabChat.classList.toggle("ativo", tab === 'chat');
    if (tabForm) tabForm.classList.toggle("ativo", tab === 'form');
    if (boxTabChat) {
        boxTabChat.classList.toggle("ativo", tab === 'chat');
        boxTabChat.style.display = tab === 'chat' ? 'flex' : 'none';
    }
    if (boxTabForm) {
        boxTabForm.classList.toggle("ativo", tab === 'form');
        boxTabForm.style.display = tab === 'form' ? 'block' : 'none';
    }
}

/* CHAT INTERNO DA CHAMADA AO VIVO INTEGRADO À IA */
async function enviarChatChamada() {
    const input = document.getElementById("inputChatChamada");
    if (!input) return;
    const texto = input.value.trim();
    if (!texto) return;

    const corpo = document.getElementById("corpoChatChamada");
    if (!corpo) return;

    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgUser = document.createElement("div");
    msgUser.className = "balao-msg enviada";
    msgUser.innerHTML = `${texto} <span class="tempo-msg">${hora}</span>`;
    corpo.appendChild(msgUser);

    input.value = "";
    corpo.scrollTop = corpo.scrollHeight;

    const msgCarregando = document.createElement("div");
    msgCarregando.className = "balao-msg recebida";
    msgCarregando.innerHTML = `<em>Digitando...</em>`;
    corpo.appendChild(msgCarregando);
    corpo.scrollTop = corpo.scrollHeight;

    try {
        const response = await fetch("/api/chatbot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mensagem: texto,
                profissional: medicoAtualConsulta ? medicoAtualConsulta.medico : "Profissional Maia Care",
                especialidade: medicoAtualConsulta ? medicoAtualConsulta.esp : "Saúde Materno-Infantil"
            })
        });

        const dados = await response.json();
        const horaResp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgCarregando.innerHTML = `${dados.resposta} <span class="tempo-msg">${horaResp}</span>`;
    } catch (erro) {
        console.error("Erro ao comunicar com chatbot no videochat:", erro);
        msgCarregando.innerHTML = `Mensagem registrada no atendimento. <span class="tempo-msg">${hora}</span>`;
    }

    corpo.scrollTop = corpo.scrollHeight;
}

/* PRONTUÁRIOS E SALVAMENTO DE CONSULTA */
function salvarFormularioConsulta(finalizarConsulta) {
    const getVal = (id, def) => {
        const el = document.getElementById(id);
        return (el && el.value) ? el.value : def;
    };

    const nomePaciente = getVal("formNomePaciente", "Paciente");
    const fase = getVal("formFasePaciente", "Acompanhamento Perinatal");
    const sintomas = getVal("formSintomas", "Consulta de rotina");
    const tempoSintomas = getVal("formTempoSintomas", "Recente");
    const nivelDor = getVal("formNivelDor", "Leve");
    const alergias = getVal("formAlergias", "Nenhuma");
    const medicamentos = getVal("formMedicamentosUso", "Nenhum");
    const avaliacao = getVal("formAvaliacaoMedica", "Atendimento realizado normalmente");
    const orientacoes = getVal("formOrientacoes", "Manter acompanhamento periódico");

    const documento = {
        id: medicoAtualConsulta ? `DOC-${medicoAtualConsulta.medico}-${Date.now()}` : Date.now(),
        medico: medicoAtualConsulta ? medicoAtualConsulta.medico : "Profissional Maia Care",
        especialidade: medicoAtualConsulta ? medicoAtualConsulta.esp : "Atendimento Virtual",
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        nomePaciente,
        fase,
        sintomas,
        tempoSintomas,
        nivelDor,
        alergias,
        medicamentos,
        avaliacao,
        orientacoes
    };

    let salvos = JSON.parse(localStorage.getItem("documentos_maia") || "[]");
    salvos = salvos.filter(d => d.id !== documento.id);
    salvos.unshift(documento);
    localStorage.setItem("documentos_maia", JSON.stringify(salvos));

    if (!finalizarConsulta) {
        const alerta = document.getElementById("alertaSalvamento");
        if (alerta) {
            alerta.style.display = "block";
            setTimeout(() => alerta.style.display = "none", 3000);
        }
    } else {
        alert("Prontuário salvo com sucesso!");
        encerrarConsultaModal();
    }
}

/* CONTROLE DA CARTEIRINHA DIGITAL */
function abrirCarteirinha() {
    const modal = document.getElementById("modalCarteirinha");
    const nomeEl = document.getElementById("carteirinhaNome");
    const nomeUsuario = document.getElementById("nomeMini")?.textContent || "Usuário";
    
    if (nomeEl) nomeEl.textContent = nomeUsuario;
    if (modal) {
        modal.classList.add("ativo");
        modal.style.display = "flex";
    }
}

function fecharCarteirinha() {
    const modal = document.getElementById("modalCarteirinha");
    if (modal) {
        modal.classList.remove("ativo");
        modal.style.display = "none";
    }
}

/* HISTÓRICO DE DOCUMENTOS (EXIBE ÍCONES COM A DATA DA CONSULTA) */
function abrirMeusArquivos() {
    const modal = document.getElementById("modalArquivos");
    const lista = document.getElementById("listaArquivosSalvos");
    const salvos = JSON.parse(localStorage.getItem("documentos_maia") || "[]");

    if (!lista) return;
    lista.innerHTML = "";

    if (salvos.length === 0) {
        lista.innerHTML = `<p style="text-align:center; color:#8c735d; padding:20px;">Nenhum formulário ou prontuário salvo ainda.</p>`;
    } else {
        const grid = document.createElement("div");
        grid.className = "grid-arquivos-icones";

        salvos.forEach(doc => {
            const btnIcone = document.createElement("button");
            btnIcone.className = "btn-arquivo-icone";
            btnIcone.onclick = () => verDetalhesRelatorio(doc.id);
            btnIcone.innerHTML = `
                <span class="icone-doc">📋</span>
                <span class="data-doc">${doc.data}</span>
                <span class="medico-doc">${doc.medico.replace(/Dr(a)?\.\s*/g, '')}</span>
            `;
            grid.appendChild(btnIcone);
        });

        lista.appendChild(grid);
    }

    if (modal) {
        modal.classList.add("ativo");
        modal.style.display = "flex";
    }
}

function fecharMeusArquivos() {
    const modal = document.getElementById("modalArquivos");
    if (modal) {
        modal.classList.remove("ativo");
        modal.style.display = "none";
    }
}

/* VISUALIZAÇÃO DETALHADA DO RELATÓRIO SELECIONADO */
function verDetalhesRelatorio(idDoc) {
    const salvos = JSON.parse(localStorage.getItem("documentos_maia") || "[]");
    const doc = salvos.find(d => String(d.id) === String(idDoc));

    if (!doc) return;

    const modalDetalhe = document.getElementById("modalDetalheRelatorio");
    const corpo = document.getElementById("corpoDetalheRelatorio");

    if (corpo) {
        corpo.innerHTML = `
            <div class="item-arquivo-salvo" style="margin-bottom: 0;">
                <h4>📄 Prontuário Maia Care - ${doc.medico}</h4>
                <p><strong>Data/Hora:</strong> ${doc.data} às ${doc.hora}</p>
                <p><strong>Paciente:</strong> ${doc.nomePaciente} (${doc.fase})</p>
                <p><strong>Sintomas Relatados:</strong> ${doc.sintomas} - ${doc.tempoSintomas} (Intensidade: ${doc.nivelDor})</p>
                <p><strong>Alergias / Med. Uso:</strong> ${doc.alergias} / ${doc.medicamentos}</p>
                <p><strong>Avaliação Médica:</strong> ${doc.avaliacao}</p>
                <p><strong>Prescrição & Orientações:</strong> ${doc.orientacoes}</p>
            </div>
        `;
    }

    if (modalDetalhe) {
        modalDetalhe.classList.add("ativo");
        modalDetalhe.style.display = "flex";
    }
}

function fecharDetalhesRelatorio() {
    const modalDetalhe = document.getElementById("modalDetalheRelatorio");
    if (modalDetalhe) {
        modalDetalhe.classList.remove("ativo");
        modalDetalhe.style.display = "none";
    }
}

/* CONTROLES MÍDIA (JITSI API) */
function toggleMic() {
    if (jitsiApi) {
        jitsiApi.executeCommand('toggleAudio');
    }
}

function toggleCam() {
    if (jitsiApi) {
        jitsiApi.executeCommand('toggleVideo');
    }
}
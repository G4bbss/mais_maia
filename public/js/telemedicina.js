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
let timerInterval = null;
let segundosConsulta = 0;
let micAtivo = true;
let camAtiva = true;

document.addEventListener("DOMContentLoaded", () => {
    carregarPerfilUsuario();
    carregarAgendamentosDoBanco();
    renderizarDirectChat();
    configurarEventosInterface();
    
    // Atualiza os agendamentos ao focar na janela
    window.addEventListener("focus", carregarAgendamentosDoBanco);
});

/* BUSCA OS DADOS DO USUÁRIO LOGADO */
function carregarPerfilUsuario() {
    fetch("/cliente/me")
        .then(res => {
            if (!res.ok) throw new Error("Não autenticado");
            return res.json();
        })
        .then(usuario => {
            const primeiroNome = (usuario.Nome || usuario.nome || usuario.profissional_nome || "Usuário").split(" ")[0];
            const nomeMiniEl = document.getElementById("nomeMini");
            const avatarMiniEl = document.getElementById("avatarMini");
            if (nomeMiniEl) nomeMiniEl.textContent = primeiroNome;
            if (avatarMiniEl) avatarMiniEl.textContent = primeiroNome.charAt(0).toUpperCase();
        })
        .catch(() => {});
}

/* BUSCA OS AGENDAMENTOS E LINK DE VIDEOCONFERÊNCIA DO BANCO DE DADOS */
async function carregarAgendamentosDoBanco() {
    const grid = document.getElementById("gridConsultas");
    if (!grid) return;

    let agendamentos = [];
    const emailLogado = localStorage.getItem("usuarioEmail");

    // 1. Tenta buscar no servidor utilizando o e-mail do usuário
    if (emailLogado) {
        try {
            let resposta = await fetch(`/usuario/meus-agendamento/${emailLogado}`);
            if (!resposta.ok) {
                resposta = await fetch(`/cliente/meus-agendamento/${emailLogado}`);
            }
            if (resposta.ok) {
                const dados = await resposta.json();
                agendamentos = Array.isArray(dados) ? dados : (dados.consultas || dados.agendamentos || []);
            }
        } catch (err) {
            console.warn("Erro ao buscar agendamentos via e-mail:", err);
        }
    }

    // 2. Se não encontrou por e-mail, busca nas rotas alternativas
    if (!agendamentos || agendamentos.length === 0) {
        try {
            let resposta = await fetch("/api/agendamentos/usuario");
            if (!resposta.ok) resposta = await fetch("/cliente/agendamentos");

            if (resposta.ok) {
                const dados = await resposta.json();
                agendamentos = Array.isArray(dados) ? dados : (dados.consultas || dados.agendamentos || []);
            }
        } catch (e) {
            console.warn("Erro ao buscar nas rotas genéricas:", e);
        }
    }

    // 3. Fallback: Lê do LocalStorage
    if (!agendamentos || agendamentos.length === 0) {
        try {
            const rawLocal = JSON.parse(localStorage.getItem("maia_consultas_raw") || "[]");
            if (Array.isArray(rawLocal) && rawLocal.length > 0) {
                agendamentos = rawLocal;
            }
        } catch (e) {}
    }

    // 4. Renderiza os cards ou mostra mensagem vazia
    if (agendamentos && agendamentos.length > 0) {
        renderizarConsultasAgendadas(agendamentos);
    } else {
        exibirMensagemSemConsultas();
    }
}

/* RENDERIZA OS CARDS MAPEANDO AS COLUNAS DO BANCO DE DADOS */
function renderizarConsultasAgendadas(listaAgendamentos) {
    const grid = document.getElementById("gridConsultas");
    if (!grid) return;
    grid.innerHTML = "";

    const agendamentosMapeados = listaAgendamentos.map(item => {
        let dataFormatada = item.data_formatada || item.data_consulta || item.data_agendamento || item.data || item.dia || "Data a definir";
        if (dataFormatada && dataFormatada.includes("-")) {
            dataFormatada = dataFormatada.substring(0, 10).split('-').reverse().join('/');
        }

        // Obtém possíveis identificadores de ID e Nome do profissional vindos do backend/localStorage
        const idProf = item.id_profissional || item.profissional_id || item.medico_id || item.id_medico;
        const nomeProfRaw = item.profissional_nome || item.nome_medico || item.medico_nome || item.profissional || item.nome_profissional;

        // Procura no cadastro oficial pelo ID primeiro, depois por texto
        const profMatch = PROFISSIONAIS_PROJETO.find(p => 
            (idProf && String(p.id) === String(idProf)) ||
            (nomeProfRaw && typeof nomeProfRaw === "string" && (
                p.nome.toLowerCase().includes(nomeProfRaw.toLowerCase()) || 
                nomeProfRaw.toLowerCase().includes(p.nome.toLowerCase())
            ))
        );

        // Define os dados finais correspondentes ao médico correto
        const nomeFinal = profMatch ? profMatch.nome : (nomeProfRaw && isNaN(nomeProfRaw) ? nomeProfRaw : "Profissional Maia Care");
        const espFinal = profMatch ? profMatch.esp : (item.especialidade || item.sub || "Atendimento Especializado");
        
        let fotoFinal = "img/ana.png";
        if (item.foto || item.foto_medico) {
            const fotoRaw = item.foto || item.foto_medico;
            fotoFinal = fotoRaw.startsWith("http") || fotoRaw.startsWith("img/") ? fotoRaw : `img/${fotoRaw}`;
        } else if (profMatch) {
            fotoFinal = profMatch.foto.startsWith("img/") ? profMatch.foto : `img/${profMatch.foto}`;
        }

        return {
            id: item.id_agendamento || item.id_profissional || item.id,
            profissional: nomeFinal,
            especialidade: espFinal,
            data: dataFormatada,
            horario: item.horario || item.hora || item.horario_agendamento || "Horário a definir",
            paciente: item.paciente_nome || item.nome_paciente || item.paciente || item.nome || item.usuario || item.cliente_nome || document.getElementById("nomeMini")?.textContent || "Paciente",
            foto: fotoFinal,
            linkVideo: item.linkvideoconferencia || item.link_videoconferencia || item.linkvideoconf || item.link || "",
            tipo: (item.tipo_atendimento || item.tipo || "").toLowerCase()
        };
    }).filter(item => !item.tipo.includes("emergencia_imediata"));

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
                    <img src="${item.foto}" class="medico-foto" alt="${item.profissional}" onerror="this.onerror=null; this.src='img/ana.png';">
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
            <button class="btn-entrar-sala" onclick="entrarChamadaDireta('${item.profissional.replace(/'/g, "\\'")}', '${item.especialidade.replace(/'/g, "\\'")}', '${item.foto}', '${item.paciente.replace(/'/g, "\\'")}', '${encodeURIComponent(item.linkVideo)}')">
                📹 Entrar na Sala Virtual
            </button>
        `;
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

/* SALA DE VÍDEOCONSULTA COM EMBED DO LINK DE VIDEOCONFERÊNCIA DO BANCO */
function entrarChamadaDireta(medico, esp, foto, paciente, linkVideoEncoded) {
    fecharFila();
    const linkVideo = decodeURIComponent(linkVideoEncoded || "");
    medicoAtualConsulta = { medico, esp, foto, paciente, linkVideo };
    
    const elMedico = document.getElementById("modalNomeMedico");
    const elEsp = document.getElementById("modalEspecialidade");
    const elImg = document.getElementById("modalImgMedico");
    const elVideo = document.getElementById("modalVideo");
    const boxVideoPaciente = document.getElementById("boxVideoPaciente");

    if (elMedico) elMedico.textContent = medico;
    if (elEsp) elEsp.textContent = esp;
    if (elImg) elImg.src = foto;
    if (elVideo) elVideo.classList.add("ativo");

    if (boxVideoPaciente) {
        if (linkVideo && linkVideo.trim() !== "") {
            boxVideoPaciente.innerHTML = `
                <iframe src="${linkVideo}" 
                        allow="camera; microphone; display-capture; autoplay; clipboard-write" 
                        style="width:100%; height:100%; border:none; border-radius:12px;"
                        title="Videoconferência Maia Care">
                </iframe>`;
        } else {
            boxVideoPaciente.innerHTML = `
                <div class="sem-camera-placeholder" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#fff; text-align:center;">
                    <p style="font-size:1.2rem; margin-bottom:8px;">📹 Transmissão da Consulta</p>
                    <small style="opacity:0.8;">Aguardando conexão com a sala do profissional...</small>
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
    const modalVideo = document.getElementById("modalVideo");
    const modalTimer = document.getElementById("modalTimer");
    const boxVideoPaciente = document.getElementById("boxVideoPaciente");

    if (modalVideo) modalVideo.classList.remove("ativo");
    if (modalTimer) modalTimer.textContent = "00:00";
    if (boxVideoPaciente) boxVideoPaciente.innerHTML = "";
}

/* EVENTOS DE INTERFACE E BOTOES */
function configurarEventosInterface() {
    const btnConta = document.getElementById("botaoConta");
    const menuConta = document.getElementById("menuConta");
    const panelDirect = document.getElementById("directPanel");

    if (btnConta && menuConta) {
        btnConta.addEventListener("click", (e) => {
            e.stopPropagation();
            menuConta.classList.toggle("aberto");
        });
        document.addEventListener("click", () => menuConta.classList.remove("aberto"));
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
                <img src="img/${prof.foto}" class="avatar-contato" alt="${prof.nome}" onerror="this.onerror=null; this.src='img/ana.png';">
                ${prof.online ? '<span class="ponto-status-chat"></span>' : ''}
            </div>
            <span class="nome-contato-chat">${prof.nome.split(' ')[0]}</span>
        `;
        container.appendChild(item);
    });
}

function selecionarProfissionalChat(prof, el) {
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

function enviarMensagemDirect() {
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

    setTimeout(() => {
        const msgResp = document.createElement("div");
        msgResp.className = "balao-msg recebida";
        msgResp.innerHTML = `Obrigada pelo contato! Em instantes te respondo aqui. <span class="tempo-msg">${hora}</span>`;
        corpo.appendChild(msgResp);
        corpo.scrollTop = corpo.scrollHeight;
    }, 1000);
}

/* FILA DE EMERGÊNCIA */
function iniciarFilaEmergencia() {
    const modalFila = document.getElementById("modalFila");
    const spinnerFila = document.getElementById("spinnerFila");
    const btnEntrar = document.getElementById("btnEntrarChamadaFila");
    
    if (modalFila) modalFila.classList.add("ativo");
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
    if (modalFila) modalFila.classList.remove("ativo");
}

function alternarTabChamada(tab) {
    const tabChat = document.getElementById("tabChat");
    const tabForm = document.getElementById("tabForm");
    const boxTabChat = document.getElementById("boxTabChat");
    const boxTabForm = document.getElementById("boxTabForm");

    if (tabChat) tabChat.classList.toggle("ativo", tab === 'chat');
    if (tabForm) tabForm.classList.toggle("ativo", tab === 'form');
    if (boxTabChat) boxTabChat.classList.toggle("ativo", tab === 'chat');
    if (boxTabForm) boxTabForm.classList.toggle("ativo", tab === 'form');
}

function enviarChatChamada() {
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

    setTimeout(() => {
        const msgMed = document.createElement("div");
        msgMed.className = "balao-msg recebida";
        msgMed.innerHTML = `Mensagem registrada no atendimento. <span class="tempo-msg">${hora}</span>`;
        corpo.appendChild(msgMed);
        corpo.scrollTop = corpo.scrollHeight;
    }, 1000);
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
    const nivelDor = getVal("formNivelDor", "0");
    const alergias = getVal("formAlergias", "Nenhuma");
    const medicamentos = getVal("formMedicamentosUso", "Nenhum");
    const avaliacao = getVal("formAvaliacaoMedica", "Atendimento realizado normalmente");
    const orientacoes = getVal("formOrientacoes", "Manter acompanhamento periódico");

    const documento = {
        id: medicoAtualConsulta ? `DOC-${medicoAtualConsulta.medico}-${Date.now()}` : Date.now(),
        medico: medicoAtualConsulta ? medicoAtualConsulta.medico : "Dra. Ana Beatriz Mendes",
        especialidade: medicoAtualConsulta ? medicoAtualConsulta.esp : "Psicologia Perinatal",
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

/* HISTÓRICO DE DOCUMENTOS */
function abrirMeusArquivos() {
    const modal = document.getElementById("modalArquivos");
    const lista = document.getElementById("listaArquivosSalvos");
    const salvos = JSON.parse(localStorage.getItem("documentos_maia") || "[]");

    if (!lista) return;
    lista.innerHTML = "";

    if (salvos.length === 0) {
        lista.innerHTML = `<p style="text-align:center; color:#8c735d; padding:20px;">Nenhum formulário ou prontuário salvo ainda.</p>`;
    } else {
        salvos.forEach(doc => {
            const item = document.createElement("div");
            item.className = "item-arquivo-salvo";
            item.innerHTML = `
                <h4>📄 Prontuário Maia Care - ${doc.medico}</h4>
                <p><strong>Data/Hora:</strong> ${doc.data} às ${doc.hora}</p>
                <p><strong>Paciente:</strong> ${doc.nomePaciente} (${doc.fase})</p>
                <p><strong>Sintomas Relatados:</strong> ${doc.sintomas} - ${doc.tempoSintomas} (Intensidade: ${doc.nivelDor})</p>
                <p><strong>Alergias / Med. Uso:</strong> ${doc.alergias} / ${doc.medicamentos}</p>
                <p><strong>Avaliação Médica:</strong> ${doc.avaliacao}</p>
                <p><strong>Prescrição & Orientações:</strong> ${doc.orientacoes}</p>
            `;
            lista.appendChild(item);
        });
    }

    if (modal) modal.classList.add("ativo");
}

function fecharMeusArquivos() {
    const modal = document.getElementById("modalArquivos");
    if (modal) modal.classList.remove("ativo");
}

/* CONTROLES DE MÍDIA */
function toggleMic() {
    micAtivo = !micAtivo;
    const btn = document.getElementById("btnMicModal");
    if (btn) {
        btn.classList.toggle("desativado", !micAtivo);
        btn.textContent = micAtivo ? "🎤" : "🔇";
    }
}

function toggleCam() {
    camAtiva = !camAtiva;
    const btn = document.getElementById("btnCamModal");
    const box = document.getElementById("boxVideoPaciente");
    if (btn) {
        btn.classList.toggle("desativado", !camAtiva);
        btn.textContent = camAtiva ? "📹" : "📷";
    }
    if (box) {
        box.style.opacity = camAtiva ? "1" : "0.2";
    }
}
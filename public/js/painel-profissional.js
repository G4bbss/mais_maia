let listaConsultas = [];

window.onload = function () {
    carregarConsultas();
};

function mudarAba(nomeAba) {
    document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('ativa'));
    document.querySelectorAll('.secao-aba').forEach(sec => sec.classList.remove('ativa'));

    if (nomeAba === 'agenda') {
        document.querySelectorAll('.aba-btn')[0].classList.add('ativa');
        document.getElementById('aba-agenda').classList.add('ativa');
    } else {
        document.querySelectorAll('.aba-btn')[1].classList.add('ativa');
        document.getElementById('aba-prontuarios').classList.add('ativa');
    }
}

async function carregarConsultas() {
    try {
        const res = await fetch('/profissional/agendamentos');
        
        if (res.status === 401) {
            window.location.href = '/login-profissional';
            return;
        }

        if (!res.ok) throw new Error("Erro na requisição");

        listaConsultas = await res.json();

        // Atualização segura do cabeçalho com verificação de nulidade
        const elemProfEmail = document.getElementById('profEmail');
        if (elemProfEmail && listaConsultas.length > 0 && listaConsultas[0].email_profissional) {
            const prof = listaConsultas[0];
            const infoProf = prof.profissional_nome 
                ? `${prof.profissional_nome} (${prof.email_profissional})` 
                : prof.email_profissional;
            
            elemProfEmail.textContent = infoProf;
        }

        renderizarTabelaAgenda();
        popularSelectPacientes();
    } catch (erro) {
        console.error("Erro ao carregar agendamentos:", erro);
        const tbody = document.getElementById('tabelaAgenda');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Erro ao carregar dados do servidor.</td></tr>`;
        }
    }
}

function renderizarTabelaAgenda() {
    const tbody = document.getElementById('tabelaAgenda');
    if (!tbody) return;

    const filtroData = document.getElementById('filtroData')?.value;

    let filtrados = [...listaConsultas];

    if (filtroData) {
        filtrados = filtrados.filter(c => c.data_agendamento === filtroData);
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: gray;">Nenhuma consulta encontrada para este profissional.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(c => {
        const isOnline = String(c.tipo_atendimento).toLowerCase() === 'online';
        const badgeModalidade = isOnline
            ? `<span class="badge badge-online"><i class="fa-solid fa-video"></i> Online</span>`
            : `<span class="badge badge-presencial"><i class="fa-solid fa-building"></i> Presencial</span>`;

        const statusLower = String(c.status).toLowerCase();
        let badgeStatus = `<span class="badge badge-agendado">${c.status}</span>`;
        if (statusLower === 'realizada') badgeStatus = `<span class="badge badge-realizada">Realizada</span>`;
        if (statusLower === 'cancelada') badgeStatus = `<span class="badge badge-cancelada">Cancelada</span>`;

        const linkMeet = isOnline
            ? `<a href="https://meet.google.com/mai-a${c.id_agendamento}" target="_blank" class="btn-meet"><i class="fa-solid fa-video"></i> Entrar no Meet</a>`
            : `<span style="font-size:11px; color:#666;">${c.endereco_profissional || 'Presencial'}</span>`;

        return `
            <tr>
                <td>
                    <strong>${c.nome_paciente || 'Paciente'}</strong><br>
                    <small>${c.email_paciente || ''}</small><br>
                    <small>Tel: ${c.telefone_paciente || 'Não informado'}</small>
                </td>
                <td>
                    <i class="fa-regular fa-calendar"></i> ${c.data_formatada || ''}<br>
                    <i class="fa-regular fa-clock"></i> ${c.horario || ''}
                </td>
                <td>${badgeModalidade}</td>
                <td>${badgeStatus}</td>
                <td>
                    ${linkMeet}
                    <button class="btn-acao" style="margin-top:4px;" onclick="abrirAtendimento('${c.email_paciente}', '${c.nome_paciente}', ${c.id_agendamento})">
                        <i class="fa-solid fa-notes-medical"></i> Atender / Prontuário
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function limparFiltroData() {
    const campoFiltro = document.getElementById('filtroData');
    if (campoFiltro) campoFiltro.value = '';
    renderizarTabelaAgenda();
}

function popularSelectPacientes() {
    const select = document.getElementById('selectPaciente');
    if (!select) return;

    const pacientesUnicos = {};

    listaConsultas.forEach(c => {
        if (c.email_paciente && !pacientesUnicos[c.email_paciente]) {
            pacientesUnicos[c.email_paciente] = c.nome_paciente || c.email_paciente;
        }
    });

    select.innerHTML = '<option value="">Selecione o Paciente...</option>' +
        Object.keys(pacientesUnicos).map(email =>
            `<option value="${email}">${pacientesUnicos[email]} (${email})</option>`
        ).join('');
}

function abrirAtendimento(email, nome, idAgendamento) {
    mudarAba('prontuarios');
    const select = document.getElementById('selectPaciente');
    if (select) select.value = email;
    
    const inputId = document.getElementById('prontuarioAgendamentoId');
    if (inputId) inputId.value = idAgendamento;
    
    carregarHistoricoProntuario();
}

async function salvarProntuario() {
    const select = document.getElementById('selectPaciente');
    const email = select ? select.value : '';
    const nome = select?.options[select.selectedIndex]?.text.split(' (')[0] || "Paciente";
    const anamnese = document.getElementById('txtAnamnese')?.value.trim();
    const conduta = document.getElementById('txtConduta')?.value.trim();
    const idAgendamento = document.getElementById('prontuarioAgendamentoId')?.value;

    if (!email || !anamnese) {
        alert("Selecione um paciente e preencha o campo de Anamnese.");
        return;
    }

    try {
        const res = await fetch('/profissional/prontuario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email_paciente: email,
                nome_paciente: nome,
                anamnese: anamnese,
                conduta: conduta,
                id_agendamento: idAgendamento || null
            })
        });

        const data = await res.json();
        if (data.ok) {
            alert(data.mensagem);
            if (document.getElementById('txtAnamnese')) document.getElementById('txtAnamnese').value = '';
            if (document.getElementById('txtConduta')) document.getElementById('txtConduta').value = '';
            if (document.getElementById('prontuarioAgendamentoId')) document.getElementById('prontuarioAgendamentoId').value = '';
            carregarConsultas();
            carregarHistoricoProntuario();
        } else {
            alert(data.erro || "Falha ao salvar o prontuário.");
        }
    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Erro ao conectar com o servidor.");
    }
}

async function carregarHistoricoProntuario() {
    const select = document.getElementById('selectPaciente');
    const email = select ? select.value : '';
    const container = document.getElementById('containerHistorico');

    if (!container) return;

    if (!email) {
        container.innerHTML = `<p style="font-size: 13px; color: gray;">Selecione um paciente acima para visualizar o histórico.</p>`;
        return;
    }

    try {
        const res = await fetch(`/profissional/prontuario/${encodeURIComponent(email)}`);
        const historico = await res.json();

        if (historico.length === 0) {
            container.innerHTML = `<p style="font-size: 13px; color: gray;">Nenum registro de prontuário encontrado para este paciente.</p>`;
            return;
        }

        container.innerHTML = `
            <table class="tabela">
                <thead>
                    <tr>
                        <th>Data do Atendimento</th>
                        <th>Anamnese</th>
                        <th>Conduta / Prescrição</th>
                    </tr>
                </thead>
                <tbody>
                    ${historico.map(h => `
                        <tr>
                            <td><strong>${h.data_formatada}</strong></td>
                            <td>${h.anamnese}</td>
                            <td>${h.conduta || 'Nenhuma.'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        console.error("Erro ao carregar prontuários:", e);
        container.innerHTML = `<p style="color: red; font-size: 13px;">Erro ao buscar prontuários.</p>`;
    }
}
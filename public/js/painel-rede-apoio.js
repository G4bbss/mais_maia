// Variável global para guardar a lista original vinda do banco de dados
let todosChamados = [];

// Função para alternar entre as abas do painel
function mudarAba(abaId) {
    document.querySelectorAll('.secao-aba').forEach(sec => sec.classList.remove('ativa'));
    document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('ativa'));

    document.getElementById(`aba-${abaId}`)?.classList.add('ativa');

    const e = window.event;
    if (e && e.currentTarget) {
        e.currentTarget.classList.add('ativa');
    }
}

// Carregar chamados recebidos do backend
async function carregarChamados() {
    const tbody = document.getElementById('tabelaChamados');
    try {
        const res = await fetch('/rede-apoio/chamados');
        if (!res.ok) throw new Error("Erro ao carregar chamados.");

        todosChamados = await res.json();
        renderizarTabela(todosChamados);

    } catch (erro) {
        console.error("Erro ao carregar chamados:", erro);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar histórico de chamados.</td></tr>`;
        }
    }
}

// Renderizar as linhas da tabela de chamados
function renderizarTabela(lista) {
    const tbody = document.getElementById('tabelaChamados');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum chamado recebido até ao momento.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr>
            <td>
                <strong>${c.nome_usuario || 'Mãe/Paciente'}</strong><br>
                <small style="color: #7f5539;"><i class="fa-solid fa-phone"></i> ${c.telefone_usuario || 'Não informado'}</small><br>
                <small style="color: #8c735d;"><i class="fa-solid fa-envelope"></i> ${c.email_usuario || ''}</small>
            </td>
            <td>
                <strong>Endereço:</strong> ${c.endereco_usuario || 'Não informado'}<br>
                <strong>Motivo:</strong> ${c.motivo || ''}
            </td>
            <td>${c.data_chamado || ''} ${c.horario ? 'às ' + c.horario : ''}</td>
            <td><span class="badge badge-pendente">${c.status || 'Solicitado'}</span></td>
            <td>
                <a href="https://wa.me/55${(c.telefone_usuario || '').replace(/\D/g, '')}" target="_blank" class="btn-acao" style="text-decoration:none; display:inline-block;">
                    <i class="fa-brands fa-whatsapp"></i> Contactar
                </a>
            </td>
        </tr>
    `).join('');
}

// Aplicar filtros de Data e Status
function aplicarFiltros() {
    const statusFiltro = document.getElementById('filtroStatus')?.value;
    const dataFiltro = document.getElementById('filtroData')?.value;

    let resultado = [...todosChamados];

    if (dataFiltro) {
        const [ano, mes, dia] = dataFiltro.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        resultado = resultado.filter(c => c.data_chamado === dataFormatada || c.data_chamado === dataFiltro);
    }

    if (statusFiltro && statusFiltro !== 'Todos') {
        resultado = resultado.filter(c => (c.status || 'Solicitado').toLowerCase() === statusFiltro.toLowerCase());
    }

    renderizarTabela(resultado);
}

// Limpar os campos de filtro e restaurar a tabela
function limparFiltros() {
    const selectStatus = document.getElementById('filtroStatus');
    const inputData = document.getElementById('filtroData');

    if (selectStatus) selectStatus.value = 'Todos';
    if (inputData) inputData.value = '';

    renderizarTabela(todosChamados);
}

// Carregar dados do perfil da rede de apoio
async function carregarPerfil() {
    try {
        const res = await fetch('/rede-apoio/perfil');
        if (!res.ok) return;

        const p = await res.json();

        if (document.getElementById('nome')) document.getElementById('nome').value = p.nome || '';
        if (document.getElementById('telefone')) document.getElementById('telefone').value = p.telefone || '';
        if (document.getElementById('email')) document.getElementById('email').value = p.email || '';
        if (document.getElementById('distancia')) document.getElementById('distancia').value = p.distancia || '';
        if (document.getElementById('disponibilidade')) document.getElementById('disponibilidade').value = p.disponibilidade || '';
        if (document.getElementById('horarios_disponiveis')) document.getElementById('horarios_disponiveis').value = p.horarios_disponiveis || '';
        if (document.getElementById('foto')) document.getElementById('foto').value = p.foto || '';
        if (document.getElementById('ativo')) document.getElementById('ativo').value = p.ativo !== undefined ? p.ativo : 1;
        if (document.getElementById('pode_ajudar_com')) document.getElementById('pode_ajudar_com').value = p.pode_ajudar_com || '';

        if (document.getElementById('nomeRedeHeader')) {
            document.getElementById('nomeRedeHeader').innerText = p.nome || 'Rede de Apoio';
        }
    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
    }
}

// Salvar alterações do perfil
async function salvarPerfil() {
    const dados = {
        nome: document.getElementById('nome')?.value || '',
        telefone: document.getElementById('telefone')?.value || '',
        email: document.getElementById('email')?.value || '',
        distancia: document.getElementById('distancia')?.value || '',
        disponibilidade: document.getElementById('disponibilidade')?.value || '',
        horarios_disponiveis: document.getElementById('horarios_disponiveis')?.value || '',
        foto: document.getElementById('foto')?.value || '',
        ativo: parseInt(document.getElementById('ativo')?.value || 1),
        pode_ajudar_com: document.getElementById('pode_ajudar_com')?.value || ''
    };

    try {
        const res = await fetch('/rede-apoio/perfil', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resultado = await res.json();
        if (res.ok && resultado.ok !== false) {
            alert("Perfil atualizado com sucesso!");
            carregarPerfil();
        } else {
            alert("Erro ao guardar: " + (resultado.erro || resultado.mensagem || 'Erro desconhecido.'));
        }
    } catch (erro) {
        console.error("Erro ao guardar perfil:", erro);
        alert("Erro na ligação com o servidor.");
    }
}

// Executa ao carregar a página do painel
document.addEventListener('DOMContentLoaded', () => {
    carregarChamados();
    carregarPerfil();
});
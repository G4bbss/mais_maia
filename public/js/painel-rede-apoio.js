function mudarAba(abaId) {
    document.querySelectorAll('.secao-aba').forEach(sec => sec.classList.remove('ativa'));
    document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('ativa'));

    document.getElementById(`aba-${abaId}`).classList.add('ativa');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('ativa');
    }
}

// Carregar chamados recebidos do backend
async function carregarChamados() {
    const tbody = document.getElementById('tabelaChamados');
    try {
        const res = await fetch('/rede-apoio/chamados');
        if (!res.ok) throw new Error("Erro ao carregar chamados.");

        const chamados = await res.json();

        if (!chamados || chamados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum chamado recebido até ao momento.</td></tr>`;
            return;
        }

        tbody.innerHTML = chamados.map(c => `
            <tr>
                <td>
                    <strong>${c.nome_usuario || 'Mãe/Paciente'}</strong><br>
                    <small style="color: #7f5539;"><i class="fa-solid fa-phone"></i> ${c.telefone_usuario || 'Não informado'}</small><br>
                    <small style="color: #8c735d;"><i class="fa-solid fa-envelope"></i> ${c.email_usuario || ''}</small>
                </td>
                <td>
                    <strong>Endereço:</strong> ${c.endereco_usuario || 'Não informado'}<br>
                    <strong>Motivo:</strong> ${c.motivo}
                </td>
                <td>${c.data_chamado} às ${c.horario}</td>
                <td><span class="badge badge-pendente">Solicitado</span></td>
                <td>
                    <a href="https://wa.me/55${(c.telefone_usuario || '').replace(/\D/g,'')}" target="_blank" class="btn-acao" style="text-decoration:none; display:inline-block;">
                        <i class="fa-brands fa-whatsapp"></i> Contactar
                    </a>
                </td>
            </tr>
        `).join('');
    } catch (erro) {
        console.error(erro);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar histórico de chamados.</td></tr>`;
    }
}

// Carregar dados do perfil
async function carregarPerfil() {
    try {
        const res = await fetch('/rede-apoio/perfil');
        if (!res.ok) return;

        const p = await res.json();

        document.getElementById('nome').value = p.nome || '';
        document.getElementById('telefone').value = p.telefone || '';
        document.getElementById('email').value = p.email || '';
        document.getElementById('distancia').value = p.distancia || '';
        document.getElementById('disponibilidade').value = p.disponibilidade || '';
        document.getElementById('horarios_disponiveis').value = p.horarios_disponiveis || '';
        document.getElementById('foto').value = p.foto || '';
        document.getElementById('ativo').value = p.ativo !== undefined ? p.ativo : 1;
        document.getElementById('pode_ajudar_com').value = p.pode_ajudar_com || '';

        if (document.getElementById('nomeRedeHeader')) {
            document.getElementById('nomeRedeHeader').innerText = p.nome || 'Rede de Apoio';
        }
    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
    }
}

// Guardar perfil atualizado
async function salvarPerfil() {
    const dados = {
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value,
        email: document.getElementById('email').value,
        distancia: document.getElementById('distancia').value,
        disponibilidade: document.getElementById('disponibilidade').value,
        horarios_disponiveis: document.getElementById('horarios_disponiveis').value,
        foto: document.getElementById('foto').value,
        ativo: parseInt(document.getElementById('ativo').value),
        pode_ajudar_com: document.getElementById('pode_ajudar_com').value
    };

    try {
        const res = await fetch('/rede-apoio/perfil', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resultado = await res.json();
        if (resultado.ok) {
            alert("Perfil atualizado com sucesso!");
            carregarPerfil();
        } else {
            alert("Erro ao guardar: " + resultado.erro);
        }
    } catch (erro) {
        console.error("Erro ao guardar perfil:", erro);
        alert("Erro na ligação com o servidor.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarChamados();
    carregarPerfil();
});
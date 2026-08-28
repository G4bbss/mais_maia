console.log("🩺 Módulo de Profissionais carregado!");

const grid = document.getElementById("grid");
const perfil = document.getElementById("perfil");
const tituloSecao = document.getElementById("titulo-secao");

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// ========================================
// 🟣 MODO PERFIL (Quando tem ?id=X na URL)
// ========================================
if (id && perfil) {
    if (grid) grid.style.display = "none";
    if (tituloSecao) tituloSecao.innerText = "Perfil do Profissional";

    fetch(`/api/profissionais/${id}`)
        .then(res => res.json())
        .then(p => {
            if (!p || p.erro) {
                perfil.innerHTML = "<p>Profissional não encontrado.</p>";
                return;
            }

            const telefoneLimpo = p.profissional_telefone ? p.profissional_telefone.replace(/\D/g, '') : "";
            const telefoneExibicao = p.profissional_telefone || p.telefone || "Não informado";

            perfil.innerHTML = `
                <div class="perfil-card">
                    <div class="perfil-header">
                        <img src="img/${p.foto || 'default.png'}" class="foto-perfil-lg" onerror="this.src='img/default.png'">
                        <div>
                            <h2>${p.profissional_nome || 'Profissional'}</h2>
                            <p style="color: #9c6644; font-weight: 600; margin-top: 4px;">${p.especialidade || 'Especialidade'}</p>
                            <p style="font-size: 13px; color: #6b5744; margin-top: 2px;">CRMM/Registro: ${p.registro || 'N/A'}</p>
                        </div>
                    </div>

                    <div class="perfil-info-grid">
                        <p><strong>Subespecialidades:</strong> ${p.sub || 'N/A'}</p>
                        <p><strong>Abordagem:</strong> ${p.abordagem || 'N/A'}</p>
                        <p><strong>Atendimento:</strong> ${p.atendimento || 'N/A'}</p>
                        <p><strong>Endereço:</strong> ${p.profissional_endereco || 'N/A'}</p>
                        <p><strong>Telefone:</strong> ${telefoneExibicao}</p>
                        <p><strong>E-mail:</strong> ${p.email || 'N/A'}</p>
                        <p><strong>Horários:</strong> ${p.disponibilidade || 'N/A'}</p>
                        <p><strong>Duração Consulta:</strong> ${p.tempo || 'N/A'}</p>
                        <p><strong>Idiomas:</strong> ${p.idiomas || 'N/A'}</p>
                        <p><strong>Público-alvo:</strong> ${p.publico || 'N/A'}</p>
                        <p><strong>Avaliação:</strong> ⭐ ${p.avaliacao || '5.0'}</p>
                        <p><strong>Experiência:</strong> ${p.experiencia || 'N/A'}</p>
                    </div>

                    <div class="botoes-perfil">
                        <a href="/profissionais" class="btn-acao btn-voltar-acao">
                            ← Voltar
                        </a>

                        <a href="/agendamento?id=${p.id_profissional || id}" class="btn-acao btn-agendar-acao">
                             Agendar Consulta
                        </a>

                        ${telefoneLimpo ? `
                            <a href="https://wa.me/55${telefoneLimpo}" target="_blank" class="btn-acao btn-contato-acao">
                                 Entrar em Contato
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        })
        .catch(err => {
            console.error("Erro no perfil:", err);
            perfil.innerHTML = "<p>Erro ao carregar o perfil. Verifique se o servidor backend está ligado.</p>";
        });

// ========================================
// 🟣 MODO LISTA / LINHA (Página principal)
// ========================================
} else if (grid) {
    fetch("/api/profissionais")
        .then(res => res.json())
        .then(dados => {
            if (!dados || dados.length === 0) {
                grid.innerHTML = "<p>Nenhum profissional cadastrado no momento.</p>";
                return;
            }

            grid.innerHTML = "";

            dados.forEach(p => {
                const card = document.createElement("div");
                card.className = "card-profissional";

                card.innerHTML = `
                    <img src="img/${p.foto || 'default.png'}" class="foto-card" onerror="this.src='img/default.png'">
                    <div class="info-card">
                        <h3>${p.profissional_nome || 'Profissional'}</h3>
                        <span class="especialidade-tag">${p.especialidade || 'Especialista'}</span>
                        <div class="avaliacao-card">★ ★ ★ ★ ★ (${p.avaliacao || '5.0'})</div>
                    </div>
                    <a href="/profissionais?id=${p.id_profissional}" class="btn-card">
                        Saiba mais
                    </a>
                `;

                grid.appendChild(card);
            });
        })
        .catch(err => {
            console.error("Erro ao carregar cards:", err);
            grid.innerHTML = "<p>Erro ao carregar lista de profissionais. Verifique o servidor.</p>";
        });
}
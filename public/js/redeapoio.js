
        /* BANCO DE DADOS DAS VOLUNTÁRIAS */
        const BANCO_REDE_APOIO = [
            {
                id_rede_apoio: 4,
                nome: "Mariana Alves",
                telefone: "(19) 98845-2317",
                email: "mariana.alves.rede@example.com",
                distancia: "Avenida Doutor Moraes Salles, Centro - CEP: 13010-000",
                disponibilidade: "Segunda a sexta, das 18h às 21h; sábados pela manhã.",
                horarios_disponiveis: ["18:00", "19:00", "20:00"],
                pode_ajudar_com: "Oferecer orientação e acolhimento para gestantes e puérperas, auxiliar com informações sobre os primeiros cuidados com o bebê e amamentação.",
                foto: "Mariana Alves.jpg",
                lat: -22.9056,
                lng: -47.0608
            },
            {
                id_rede_apoio: 5,
                nome: "Juliana Mendes",
                telefone: "(19) 99732-6418",
                email: "naumquerooo@gmail.com",
                distancia: "Rua Cônego Cipião, Centro - CEP: 13010-010",
                disponibilidade: "Terças e quintas, das 14h às 19h, e aos domingos à tarde.",
                horarios_disponiveis: ["14:00", "15:30", "17:00", "18:30"],
                pode_ajudar_com: "Fazer companhia para mães no pós-parto, ajudar com pequenas tarefas do dia a dia, conversar e oferecer apoio emocional.",
                foto: "Juliana Mendes.jpg",
                lat: -22.9030,
                lng: -47.0580
            },
            {
                id_rede_apoio: 6,
                nome: "Camila Ferreira",
                telefone: "(19) 99126-5084",
                email: "camila.ferreira.rede@example.com",
                distancia: "Avenida Guilherme Campos, 500, Jardim Santa Genebra - CEP: 13087-901",
                disponibilidade: "Atendimento remoto durante a semana, das 19h às 22h.",
                horarios_disponiveis: ["09:00", "11:00", "19:30", "21:00"],
                pode_ajudar_com: "Oferecer escuta acolhedora e conversar com gestantes e mães que estejam passando por momentos de solidão, ansiedade ou sobrecarga.",
                foto: "Camila Ferreira.jpg",
                lat: -22.8550,
                lng: -47.0620
            }
        ];

        /* REGISTRO DE AGENDAMENTOS BLOQUEADOS EM MEMÓRIA */
        let agendamentosOcupados = [
            { voluntariaId: 4, dia: "Segunda-feira", hora: "18:00" }
        ];

        let voluntariasGlobais = [];
        let voluntariaChatAvulsoAtual = null;
        let mapaInstancia = null;
        let marcadorUsuario = null;

        document.addEventListener("DOMContentLoaded", () => {
            carregarVoluntarias();
            inicializarMapa();
            configurarEventos();
        });

        async function carregarVoluntarias() {
            try {
                const response = await fetch('/api/rede-apoio');
                if (response.ok) {
                    voluntariasGlobais = await response.json();
                } else {
                    voluntariasGlobais = BANCO_REDE_APOIO;
                }
            } catch (erro) {
                voluntariasGlobais = BANCO_REDE_APOIO;
            }

            renderizarSelects(voluntariasGlobais);
            renderizarGridVoluntarias(voluntariasGlobais);
            atualizarHorariosDisponiveis();

            if (voluntariasGlobais.length > 0) {
                iniciarChatAvulso(voluntariasGlobais[0].id_rede_apoio);
            }
        }

        function renderizarSelects(lista) {
            const selectForm = document.getElementById("selectVoluntaria");
            const selectChat = document.getElementById("selectChatVoluntaria");

            selectForm.innerHTML = '<option value="">Selecione uma voluntária...</option>';
            selectChat.innerHTML = '';

            lista.forEach(v => {
                const opt1 = document.createElement("option");
                opt1.value = v.id_rede_apoio;
                opt1.textContent = v.nome;
                selectForm.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = v.id_rede_apoio;
                opt2.textContent = v.nome;
                selectChat.appendChild(opt2);
            });

            if (lista.length > 0) selectForm.value = lista[0].id_rede_apoio;
        }

        /* ATUALIZA HORÁRIOS DISPONÍVEIS E DESTRAVA CANCELADOS */
        function atualizarHorariosDisponiveis() {
            const selectVol = document.getElementById("selectVoluntaria");
            const selectDia = document.getElementById("selectDia");
            const selectHora = document.getElementById("selectHora");

            const idVol = parseInt(selectVol.value);
            const diaSel = selectDia.value;

            selectHora.innerHTML = "";

            const voluntaria = voluntariasGlobais.find(v => v.id_rede_apoio === idVol);
            if (!voluntaria || !voluntaria.horarios_disponiveis) {
                selectHora.innerHTML = '<option value="">Nenhum horário disponível</option>';
                return;
            }

            voluntaria.horarios_disponiveis.forEach(hora => {
                const estaOcupado = agendamentosOcupados.some(ag => 
                    ag.voluntariaId === idVol && ag.dia === diaSel && ag.hora === hora
                );

                const opt = document.createElement("option");
                opt.value = hora;
                
                if (estaOcupado) {
                    opt.textContent = `${hora} ( Ocupado)`;
                    opt.disabled = true;
                } else {
                    opt.textContent = ` ${hora}`;
                }

                selectHora.appendChild(opt);
            });
        }

        /* NAVEGAÇÃO DE ABAS */
        function mudarAba(aba) {
            const btnChat = document.getElementById("btnAbaChatDireto");
            const btnAndamento = document.getElementById("btnAbaAndamento");
            const divChat = document.getElementById("conteudoAbaChatDireto");
            const divAndamento = document.getElementById("conteudoAbaAndamento");

            if (aba === 'chatDireto') {
                btnChat.classList.add("ativa");
                btnAndamento.classList.remove("ativa");
                divChat.style.display = "block";
                divAndamento.style.display = "none";
            } else {
                btnAndamento.classList.add("ativa");
                btnChat.classList.remove("ativa");
                divAndamento.style.display = "block";
                divChat.style.display = "none";
            }
        }

        /* CHAT DIRETO / AVULSO */
        function iniciarChatAvulso(idVoluntaria) {
            idVoluntaria = parseInt(idVoluntaria);
            voluntariaChatAvulsoAtual = voluntariasGlobais.find(v => v.id_rede_apoio === idVoluntaria);

            if (!voluntariaChatAvulsoAtual) return;

            document.getElementById("selectChatVoluntaria").value = idVoluntaria;
            document.getElementById("chatDiretoTitulo").textContent = ` Chat Direto com ${voluntariaChatAvulsoAtual.nome}`;
            
            const msgs = document.getElementById("chatMsgsDireto");
            msgs.innerHTML = `
                <div class="balao-chat recebida">
                    Olá! Sou a ${voluntariaChatAvulsoAtual.nome}. Como posso te ajudar ou orientar hoje? Sinta-se à vontade para perguntar.
                </div>
            `;

            mudarAba('chatDireto');
        }

        async function enviarMensagemAvulsa() {
            const input = document.getElementById("inputChatDireto");
            const texto = input.value.trim();
            if (!texto || !voluntariaChatAvulsoAtual) return;

            const containerMsgs = document.getElementById("chatMsgsDireto");

            const userMsg = document.createElement("div");
            userMsg.className = "balao-chat enviada";
            userMsg.textContent = texto;
            containerMsgs.appendChild(userMsg);
            input.value = "";
            containerMsgs.scrollTop = containerMsgs.scrollHeight;

            const carregando = document.createElement("div");
            carregando.className = "balao-chat recebida";
            carregando.innerHTML = "<em>Digitando...</em>";
            containerMsgs.appendChild(carregando);
            containerMsgs.scrollTop = containerMsgs.scrollHeight;

            try {
                const response = await fetch("/api/chatbot", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mensagem: texto,
                        profissional: voluntariaChatAvulsoAtual.nome,
                        especialidade: "Apoio Voluntário Comunitário"
                    })
                });
                const dados = await response.json();
                carregando.textContent = dados.resposta || "Obrigada pelo contato! Em breve trarei mais orientações para você.";
            } catch (err) {
                carregando.textContent = `Olá! Recebi sua mensagem: "${texto}". Estou aqui para te apoiar!`;
            }
            containerMsgs.scrollTop = containerMsgs.scrollHeight;
        }

        /* PROXIMIDADE E CONFIRMAÇÃO DE AGENDAMENTO */
        function configurarEventos() {
            const inputEndereco = document.getElementById("enderecoUsuaria");
            const selectVol = document.getElementById("selectVoluntaria");
            const selectDia = document.getElementById("selectDia");
            const form = document.getElementById("formSolicitacao");

            selectVol.addEventListener("change", atualizarHorariosDisponiveis);
            selectDia.addEventListener("change", atualizarHorariosDisponiveis);

            inputEndereco.addEventListener("change", async () => {
                const endereco = inputEndereco.value.trim();
                if (endereco.length < 5) return;

                const aviso = document.getElementById("avisoProximidade");
                aviso.style.display = "block";
                aviso.textContent = " Localizando no mapa e buscando a voluntária mais próxima...";

                try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`);
                    const dados = await resp.json();

                    if (dados && dados.length > 0) {
                        const userLat = parseFloat(dados[0].lat);
                        const userLng = parseFloat(dados[0].lon);

                        if (marcadorUsuario) mapaInstancia.removeLayer(marcadorUsuario);
                        marcadorUsuario = L.marker([userLat, userLng], {
                            icon: L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })
                        }).addTo(mapaInstancia).bindPopup("<b>Sua Localização</b>").openPopup();

                        let maisProxima = null;
                        let menorDistancia = Infinity;

                        voluntariasGlobais.forEach(v => {
                            const dist = calcularDistanciaHaversine(userLat, userLng, v.lat, v.lng);
                            if (dist < menorDistancia) {
                                menorDistancia = dist;
                                maisProxima = v;
                            }
                        });

                        if (maisProxima) {
                            selectVol.value = maisProxima.id_rede_apoio;
                            atualizarHorariosDisponiveis();
                            aviso.textContent = ` Direcionado para ${maisProxima.nome} (a aprox. ${menorDistancia.toFixed(1)} km).`;
                            
                            const bounds = L.latLngBounds([
                                [userLat, userLng],
                                [maisProxima.lat, maisProxima.lng]
                            ]);
                            mapaInstancia.fitBounds(bounds, { padding: [30, 30] });
                        }
                    } else {
                        aviso.textContent = " Endereço não localizado no mapa, selecione a voluntária manualmente.";
                    }
                } catch (e) {
                    aviso.textContent = " Seleção manual disponível.";
                }
            });

            form.addEventListener("submit", (e) => {
                e.preventDefault();

                const endereco = document.getElementById("enderecoUsuaria").value;
                const idVoluntaria = parseInt(selectVol.value);
                const dia = selectDia.value;
                const hora = document.getElementById("selectHora").value;
                const motivo = document.getElementById("txtMotivo").value;

                if (!hora) {
                    alert("Selecione um horário válido.");
                    return;
                }

                const voluntaria = voluntariasGlobais.find(v => v.id_rede_apoio === idVoluntaria);
                if (!voluntaria) return;

                // Bloqueia o horário
                agendamentosOcupados.push({ voluntariaId: idVoluntaria, dia: dia, hora: hora });

                // Renderiza o painel com botão de cancelamento
                exibirPainelAndamento(voluntaria, dia, hora, endereco, motivo);

                atualizarHorariosDisponiveis();
                alert(`Agendamento realizado com ${voluntaria.nome} para ${dia} às ${hora}!`);
            });

            document.getElementById("inputChatDireto").addEventListener("keypress", (e) => {
                if (e.key === "Enter") enviarMensagemAvulsa();
            });
        }

        function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        /* CARDS DAS VOLUNTÁRIAS */
        function renderizarGridVoluntarias(lista) {
            const grid = document.getElementById("gridVoluntarias");
            grid.innerHTML = "";

            lista.forEach(v => {
                const card = document.createElement("div");
                card.className = "card-voluntaria-item";
                card.innerHTML = `
                    <div class="voluntaria-perfil-topo">
                        <img src="img/${v.foto}" class="voluntaria-foto" alt="${v.nome}" onerror="this.src='img/maiaFavicon.png';">
                        <div>
                            <span class="voluntaria-nome-link" onclick="abrirModalDetalhes(${v.id_rede_apoio})">${v.nome}</span>
                            <p class="voluntaria-endereco-curto"> ${v.distancia}</p>
                        </div>
                    </div>
                    <div class="card-acoes-botoes">
                        <button class="btn-secundario" style="flex: 1;" onclick="abrirModalDetalhes(${v.id_rede_apoio})">Ver Informações</button>
                        <button class="btn-submit" style="flex: 1;" onclick="iniciarChatAvulso(${v.id_rede_apoio})"> Conversar</button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        function abrirModalDetalhes(id) {
            const v = voluntariasGlobais.find(item => item.id_rede_apoio === id);
            if (!v) return;

            const conteudo = document.getElementById("conteudoModal");
            conteudo.innerHTML = `
                <div class="voluntaria-perfil-topo" style="margin-bottom: 16px;">
                    <img src="img/${v.foto}" class="voluntaria-foto" style="width: 75px; height: 75px;" alt="${v.nome}" onerror="this.src='img/maiaFavicon.png';">
                    <div>
                        <h2 style="color: #7f5539; font-size: 20px;">${v.nome}</h2>
                        <p style="font-size: 13px; color: #555;"><strong> Telefone:</strong> ${v.telefone}</p>
                        <p style="font-size: 13px; color: #555;"><strong> E-mail:</strong> ${v.email}</p>
                    </div>
                </div>
                <div style="font-size: 14px; color: #4a3c31; display: flex; flex-direction: column; gap: 10px;">
                    <p><strong> Endereço:</strong> ${v.distancia}</p>
                    <p><strong> Disponibilidade:</strong> ${v.disponibilidade}</p>
                    <hr style="border: none; border-top: 1px solid #e6ccb2; margin: 5px 0;">
                    <p><strong> Como pode ajudar:</strong><br>${v.pode_ajudar_com}</p>
                    <button class="btn-submit" style="margin-top: 10px;" onclick="fecharModal(); iniciarChatAvulso(${v.id_rede_apoio});"> Conversar Diretamente com ${v.nome}</button>
                </div>
            `;

            document.getElementById("modalVoluntaria").style.display = "block";
        }

        function fecharModal() {
            document.getElementById("modalVoluntaria").style.display = "none";
        }

        /* EXIBE SOLICITAÇÃO PRESENCIAL EM ANDAMENTO E BOTÃO DE CANCELAMENTO */
        function exibirPainelAndamento(voluntaria, dia, hora, endereco, motivo) {
            const container = document.getElementById("containerAbaAndamento");
            container.innerHTML = `
                <div class="card-em-andamento-info">
                    <span style="display:inline-block; background:#e6ccb2; color:#7f5539; font-size:10px; font-weight:bold; padding:2px 8px; border-radius:10px; margin-bottom:6px;">
                        ● AGENDAMENTO CONFIRMADO
                    </span>
                    <h3 style="color: #7f5539; font-size: 15px;">Com: ${voluntaria.nome}</h3>
                    <p><strong>Data/Hora:</strong> ${dia} às ${hora}</p>
                    <p><strong>Local:</strong> ${endereco}</p>
                    <p><strong>Motivo:</strong> ${motivo}</p>
                    
                    <!-- BOTÃO PARA CANCELAR O AGENDAMENTO -->
                    <button class="btn-cancelar" onclick="cancelarAgendamento(${voluntaria.id_rede_apoio}, '${dia}', '${hora}')"> Cancelar Agendamento</button>
                </div>

                <div class="box-chatbot">
                    <div class="chatbot-header">
                        <span> Chat da Visita Agendada</span>
                        <span style="font-size: 11px;">● Online</span>
                    </div>
                    <div class="chatbot-mensagens" id="chatMsgsAndamento">
                        <div class="balao-chat recebida">
                            Olá! Confirmando o agendamento de nossa visita para ${dia} às ${hora}. Qualquer ajuste no ponto de encontro pode me enviar por aqui.
                        </div>
                    </div>
                    <div class="chatbot-footer">
                        <input type="text" id="inputChatAndamento" placeholder="Escreva sobre o agendamento...">
                        <button onclick="enviarMensagemAndamento('${voluntaria.nome}')">Enviar</button>
                    </div>
                </div>
            `;

            mudarAba('andamento');

            document.getElementById("inputChatAndamento").addEventListener("keypress", (e) => {
                if (e.key === "Enter") enviarMensagemAndamento(voluntaria.nome);
            });
        }

        /* LÓGICA PARA CANCELAR AGENDAMENTO E LIBERAR O HORÁRIO */
        function cancelarAgendamento(idVoluntaria, dia, hora) {
            if (!confirm("Tem certeza que deseja cancelar esta solicitação? O horário será liberado novamente.")) {
                return;
            }

            // 1. Remove do registro de ocupados
            const index = agendamentosOcupados.findIndex(
                ag => ag.voluntariaId === idVoluntaria && ag.dia === dia && ag.hora === hora
            );
            if (index !== -1) {
                agendamentosOcupados.splice(index, 1);
            }

            // 2. Reseta o contêiner do painel de andamento
            const container = document.getElementById("containerAbaAndamento");
            container.innerHTML = `
                <p style="font-size: 13px; color: #777;">Nenhuma solicitação presencial ativa no momento. Preencha o formulário para agendar.</p>
            `;

            // 3. Atualiza os horários para reexibir a opção liberada no select
            atualizarHorariosDisponiveis();

            // 4. Retorna para o chat avulso
            mudarAba('chatDireto');

            alert("Solicitação cancelada com sucesso! O horário foi liberado.");
        }

        async function enviarMensagemAndamento(nomeVoluntaria) {
            const input = document.getElementById("inputChatAndamento");
            const texto = input.value.trim();
            if (!texto) return;

            const containerMsgs = document.getElementById("chatMsgsAndamento");

            const userMsg = document.createElement("div");
            userMsg.className = "balao-chat enviada";
            userMsg.textContent = texto;
            containerMsgs.appendChild(userMsg);
            input.value = "";
            containerMsgs.scrollTop = containerMsgs.scrollHeight;

            const carregando = document.createElement("div");
            carregando.className = "balao-chat recebida";
            carregando.innerHTML = "<em>Digitando...</em>";
            containerMsgs.appendChild(carregando);
            containerMsgs.scrollTop = containerMsgs.scrollHeight;

            try {
                const response = await fetch("/api/chatbot", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mensagem: texto,
                        profissional: nomeVoluntaria,
                        especialidade: "Apoio Voluntário Comunitário"
                    })
                });
                const dados = await response.json();
                carregando.textContent = dados.resposta || "Anotado! Nos vemos no horário combinado.";
            } catch (err) {
                carregando.textContent = "Anotado! Em breve confirmamos mais detalhes da nossa visita.";
            }
            containerMsgs.scrollTop = containerMsgs.scrollHeight;
        }

        function inicializarMapa() {
            mapaInstancia = L.map('mapaMini').setView([-22.8900, -47.0600], 11);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapaInstancia);

            BANCO_REDE_APOIO.forEach(v => {
                L.marker([v.lat, v.lng]).addTo(mapaInstancia)
                    .bindPopup(`<b>${v.nome}</b><br>${v.distancia}`);
            });
        }
    
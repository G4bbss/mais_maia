        /* CONTROLE DE CONTRASTE MANUALL */
        function togglePainelContraste() {
            const painel = document.getElementById("painelContraste");
            if (painel) {
                painel.classList.toggle("aberto");
            }
        }

        function ajustarContraste(valor) {
            document.documentElement.style.filter = `contrast(${valor}%)`;
            const txt = document.getElementById("valorContrasteTxt");
            if (txt) txt.textContent = `${valor}%`;
            localStorage.setItem("maia_valor_contraste", valor);
        }

        document.addEventListener("DOMContentLoaded", function () {
            const contrasteSalvo = localStorage.getItem("maia_valor_contraste") || "100";
            ajustarContraste(contrasteSalvo);
            const rangeEl = document.getElementById("rangeContraste");
            if (rangeEl) rangeEl.value = contrasteSalvo;
        });

        /* FUNÇÕES DA ASSISTENTE VIRTUAL & CHAT CONTROLES */
        function fecharBalaoAssistente() {
            const balao = document.getElementById("balaoAssistente");
            if (balao) balao.style.display = "none";
        }

        function fecharAssistenteTotal(e) {
            e.stopPropagation();
            const widget = document.getElementById("widgetAssistente");
            if (widget) widget.style.display = "none";
        }

        function iniciarChatAssistente() {
            const widget = document.getElementById("widgetAssistente");
            const chatModal = document.getElementById("chatModal");

            if (widget) widget.style.display = "none";
            if (chatModal) {
                chatModal.style.display = "flex";
                document.getElementById("chatInput").focus();
            }
        }

        function fecharChatModal() {
            const chatModal = document.getElementById("chatModal");
            const widget = document.getElementById("widgetAssistente");

            if (chatModal) chatModal.style.display = "none";
            if (widget) widget.style.display = "flex";
        }

        /* ===================== INTEGRAÇÃO COM GOOGLE GEMINI ===================== */
        let historicoGemini = [];

        const SYSTEM_INSTRUCTION = {
            parts: [{
                text: "Você é a Camila, assistente virtual empática e acolhedora da plataforma Maia (voltada para gestantes e puérperas). Suas respostas devem ser claras, humanas e focadas na saúde materna. Caso o usuário mencione sintomas de alerta (como febre alta, dores intensas, sangramentos ou tonturas), oriente-o a buscar atendimento médico presencial imediatamente."
            }]
        };

        async function enviarMensagemChat() {
            const input = document.getElementById("chatInput");
            const texto = input.value.trim();
            if (!texto) return;

            const chatMessages = document.getElementById("chatModalMessages");

            // 1. Mensagem do Usuário na interface
            const msgUser = document.createElement("div");
            msgUser.className = "mensagem-chat usuario";
            msgUser.textContent = texto;
            chatMessages.appendChild(msgUser);

            input.value = "";
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // 2. Indicador "Digitando..."
            const msgTyping = document.createElement("div");
            msgTyping.className = "mensagem-chat camila";
            msgTyping.id = "mensagemDigitando";
            msgTyping.textContent = "Camila está digitando...";
            chatMessages.appendChild(msgTyping);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // 3. Adiciona histórico
            historicoGemini.push({
                role: "user",
                parts: [{ text: texto }]
            });

            try {
                const API_KEY = "AQ.Ab8RN6KsV9VBvwTDy8NSDNW9yUY0t2nBCBw_YWzgxgYIhpky3Q"; 
                const MODELO = "gemini-1.5-flash";

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${API_KEY}`;

                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        systemInstruction: SYSTEM_INSTRUCTION,
                        contents: historicoGemini
                    })
                });

                if (!response.ok) throw new Error("Erro de comunicação com a API do Gemini");

                const data = await response.json();
                const respostaIA = data.candidates[0].content.parts[0].text;

                // Salva resposta no histórico com o papel 'model'
                historicoGemini.push({
                    role: "model",
                    parts: [{ text: respostaIA }]
                });

                // Remove o indicador de digitando
                const elDigitando = document.getElementById("mensagemDigitando");
                if (elDigitando) elDigitando.remove();

                // Exibe a resposta da IA
                const msgCamila = document.createElement("div");
                msgCamila.className = "mensagem-chat camila";
                msgCamila.textContent = respostaIA;
                chatMessages.appendChild(msgCamila);

            } catch (erro) {
                console.error("Erro no Gemini:", erro);

                const elDigitando = document.getElementById("mensagemDigitando");
                if (elDigitando) elDigitando.remove();

                const msgErro = document.createElement("div");
                msgErro.className = "mensagem-chat camila";
                msgErro.textContent = "Desculpe, tive uma oscilação na minha conexão. Pode repetir?";
                chatMessages.appendChild(msgErro);
            }

            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function tratarKeyInput(e) {
            if (e.key === "Enter") {
                enviarMensagemChat();
            }
        }

        /* CALENDÁRIO E DADOS */
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
                const primeiroNome = (usuario.Nome || usuario.nome || "Mamãe").split(" ")[0];
                document.getElementById("saudacaoNome").textContent = "Olá, " + primeiroNome + "! 👋";
                document.getElementById("nomeMini").textContent = primeiroNome;
                document.getElementById("avatarMini").textContent = primeiroNome.charAt(0).toUpperCase();

                const fase = (usuario.Fase || usuario.fase) === "gestante" ? "Gestante" : "Puérpera";
                const semanasVal = usuario.SemanasGestacao || usuario.semanas_gestacao;
                const semanas = semanasVal ? " · " + semanasVal + " semanas" : "";
                document.getElementById("saudacaoFase").textContent = fase + semanas;

                const emailUser = usuario.Email || usuario.email;
                if (emailUser) {
                    localStorage.setItem("usuarioEmail", emailUser);
                }

                carregarCompromissosDoServidor(emailUser);
            })
            .catch(function () {
                const emailSalvo = localStorage.getItem("usuarioEmail");
                carregarCompromissosDoServidor(emailSalvo);
            });

        async function carregarCompromissosDoServidor(email) {
            try {
                const local = JSON.parse(localStorage.getItem("maia_compromissos") || "{}");
                if (local && Object.keys(local).length > 0) {
                    compromissosMap = local;
                }
            } catch (e) {}

            desenharCalendario();

            if (email) {
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
                                    "Paciente: " + (c.paciente_nome || c.paciente || c.nome || c.usuario || "Não informado")
                            });
                        });

                        localStorage.setItem("maia_compromissos", JSON.stringify(compromissosMap));
                        desenharCalendario();
                    }
                } catch (err) {
                    console.error("Erro ao sincronizar compromissos com o servidor:", err);
                }
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
                const vazio = document.createElement("p");
                vazio.className = "vazio";
                vazio.textContent = "Nenhum compromisso agendado ainda.";
                lista.appendChild(vazio);
                return;
            }

            diasComCompromisso.forEach(function (dataIso) {
                const numDia = parseInt(dataIso.split('-')[2]);
                const listaItems = compromissosMap[dataIso];

                listaItems.forEach(info => {
                    const item = document.createElement("div");
                    item.className = "compromisso-item";
                    item.innerHTML =
                        '<div class="compromisso-data">' + numDia + ' ' + nomesMeses[mes].substring(0, 3) + '</div>' +
                        '<div><strong>' + info.titulo + '</strong><span>' + info.detalhe + '</span></div>';
                    lista.appendChild(item);
                });
            });
        }

        /* NAVEGAÇÃO DE MESES */
        document.getElementById("mesAnterior").addEventListener("click", function () {
            dataAtual.setMonth(dataAtual.getMonth() - 1);
            desenharCalendario();
        });

        document.getElementById("mesSeguinte").addEventListener("click", function () {
            dataAtual.setMonth(dataAtual.getMonth() + 1);
            desenharCalendario();
        });

        /* MENU CONTA */
        const botaoConta = document.getElementById("botaoConta");
        const menuConta = document.getElementById("menuConta");

        botaoConta.addEventListener("click", function (evento) {
            evento.stopPropagation();
            menuConta.classList.toggle("aberto");
        });

        document.addEventListener("click", function () {
            menuConta.classList.remove("aberto");
        });

        document.getElementById("botaoSair").addEventListener("click", function () {
            fetch("/cliente/logout", { method: "POST" }).then(function () {
                window.location.href = "/";
            });
        });

        document.querySelectorAll(".checkin-opcoes button").forEach(function (botao) {
            botao.addEventListener("click", function () {
                window.location.href = "./diario.html";
            });
        });
 
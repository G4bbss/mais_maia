// =========================================================================
// Cliente do Google Gemini (chamada REST direta, sem depender do SDK antigo)
// A chave fica SOMENTE no servidor (arquivo .env) e nunca vai para o navegador.
//
// As chaves novas do Google ("AQ.") podem estar ligadas a um destes serviços:
//   - Gemini API       -> generativelanguage.googleapis.com
//   - Agent Platform   -> aiplatform.googleapis.com (Vertex AI Express)
// Por isso o servidor tenta os dois automaticamente e lembra qual funcionou.
// Para forçar um só, use GEMINI_ENDPOINT=gemini  ou  GEMINI_ENDPOINT=vertex no .env.
// =========================================================================

const PROVEDORES = {
    gemini: { nome: "Gemini API", base: "https://generativelanguage.googleapis.com/v1beta/models" },
    vertex: { nome: "Agent Platform (Vertex)", base: "https://aiplatform.googleapis.com/v1/publishers/google/models" }
};

// Lidos na hora do uso (depois do .env ser carregado)
function listaModelos() {
    return [...new Set([
        process.env.GEMINI_MODEL,
        "gemini-3.6-flash",
        "gemini-3.5-flash"
    ].filter(Boolean))];
}

function listaProvedores() {
    const escolhido = String(process.env.GEMINI_ENDPOINT || "auto").toLowerCase();
    if (escolhido === "gemini") return ["gemini"];
    if (escolhido === "vertex") return ["vertex"];
    return ["gemini", "vertex"];
}

let funcionando = null; // { provedor, modelo } da última chamada que deu certo

export class ErroGemini extends Error {
    constructor(mensagem, status) {
        super(mensagem);
        this.name = "ErroGemini";
        this.status = status;
    }
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function montarConteudo(historico, mensagem) {
    const contents = [];

    for (const item of Array.isArray(historico) ? historico.slice(-20) : []) {
        const texto = String(item?.texto ?? "").trim();
        const role = item?.role === "model" ? "model" : "user";
        if (texto) contents.push({ role, parts: [{ text: texto.slice(0, 2000) }] });
    }

    // A conversa precisa começar por uma fala da usuária
    while (contents.length && contents[0].role !== "user") contents.shift();

    contents.push({ role: "user", parts: [{ text: String(mensagem).slice(0, 2000) }] });
    return contents;
}

async function chamar(provedor, modelo, corpo) {
    const controle = new AbortController();
    const tempo = setTimeout(() => controle.abort(), 25000);

    try {
        const resposta = await fetch(`${PROVEDORES[provedor].base}/${modelo}:generateContent`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": process.env.GEMINI_API_KEY
            },
            body: JSON.stringify(corpo),
            signal: controle.signal
        });

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            const detalhe = dados?.error?.message || `HTTP ${resposta.status}`;
            throw new ErroGemini(detalhe, resposta.status);
        }
        return dados;
    } finally {
        clearTimeout(tempo);
    }
}

export async function gerarResposta({ systemInstruction, historico, mensagem }) {
    if (!process.env.GEMINI_API_KEY) {
        throw new ErroGemini("GEMINI_API_KEY não configurada no arquivo .env", 500);
    }

    const corpo = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: montarConteudo(historico, mensagem)
    };

    // Monta a lista de combinações (serviço + modelo), começando pela que já funcionou
    const combinacoes = [];
    for (const provedor of listaProvedores()) {
        for (const modelo of listaModelos()) combinacoes.push({ provedor, modelo });
    }
    if (funcionando) {
        const i = combinacoes.findIndex((c) => c.provedor === funcionando.provedor && c.modelo === funcionando.modelo);
        if (i > 0) combinacoes.unshift(...combinacoes.splice(i, 1));
    }

    const falhas = [];

    for (const { provedor, modelo } of combinacoes) {
        for (let tentativa = 1; tentativa <= 2; tentativa++) {
            try {
                const dados = await chamar(provedor, modelo, corpo);

                const partes = dados?.candidates?.[0]?.content?.parts || [];
                const texto = partes.map((p) => p.text || "").join("").trim();

                if (!texto) {
                    const motivo = dados?.promptFeedback?.blockReason || dados?.candidates?.[0]?.finishReason || "resposta vazia";
                    throw new ErroGemini(`A IA não devolveu texto (${motivo}).`, 422);
                }

                if (!funcionando || funcionando.provedor !== provedor || funcionando.modelo !== modelo) {
                    funcionando = { provedor, modelo };
                    console.log(`🤖 Gemini respondendo via ${PROVEDORES[provedor].nome} com o modelo ${modelo}`);
                }
                return texto;
            } catch (erro) {
                const status = erro.status || 0;
                console.warn(`⚠️ Gemini [${PROVEDORES[provedor].nome} / ${modelo}] tentativa ${tentativa}: ${status || "?"} - ${erro.message}`);
                falhas.push({ servico: PROVEDORES[provedor].nome, modelo, status, mensagem: erro.message });

                const repetir = tentativa < 2 && (status === 429 || status >= 500 || status === 0);
                if (!repetir) break;
                await esperar(1000);
            }
        }
    }

    const ultima = falhas[falhas.length - 1];
    const erro = new ErroGemini(ultima ? ultima.mensagem : "Falha desconhecida ao chamar o Gemini.", ultima ? ultima.status : 500);
    erro.falhas = falhas;
    throw erro;
}

export const modelosConfigurados = () => listaModelos();
export const provedoresConfigurados = () => listaProvedores().map((p) => PROVEDORES[p].nome);

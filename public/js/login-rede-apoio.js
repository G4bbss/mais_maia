document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // ⚠️ Impede o navegador de recarregar a tela e exibir o JSON direto

            const email = document.getElementById('email')?.value.trim();
            const senha = document.getElementById('senha')?.value;

            if (!email || !senha) {
                alert('Por favor, preencha o e-mail e a senha.');
                return;
            }

            try {
                const res = await fetch('/rede-apoio/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });

                const dados = await res.json();

                if (res.ok && dados.ok !== false) {
                    // Login correto -> Redireciona para o painel
                    window.location.href = '/painel-rede-apoio.html';
                } else {
                    alert(dados.erro || dados.mensagem || 'E-mail ou senha incorretos.');
                }
            } catch (erro) {
                console.error('Erro ao efetuar login:', erro);
                alert('Erro na conexão com o servidor.');
            }
        });
    }
});

// Função acionada pelo clique em "Esqueceu a senha?"
function esqueciMinhaSenha(event) {
    event.preventDefault();
    alert('Entre em contato com a equipe da Maia para redefinir sua senha.');
}
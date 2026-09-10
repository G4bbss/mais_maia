// Pega o e-mail da URL (?email=...)
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      document.getElementById('emailHidden').value = emailParam;
    }
 
    // Navegação automática entre os campos de texto
    const inputs = document.querySelectorAll('.code-field');
    inputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        if (input.value.length === 1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
      });
    });
 
    // Envio assíncrono para validação
    document.getElementById('formVerificacao').addEventListener('submit', async (e) => {
      e.preventDefault();
     
      const codigo = Array.from(inputs).map(i => i.value).join('');
      const email = document.getElementById('emailHidden').value;
 
      try {
        const response = await fetch('/cliente/verificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, codigoDigitado: codigo })
        });
 
        const data = await response.json();
        if (response.ok && data.ok) {
          alert(data.mensagem);
          // Redireciona diretamente para o Dashboard após validar
          window.location.href = '/dashboard';
        } else {
          alert(data.erro || 'Código incorreto');
        }
      } catch (err) {
        alert('Erro ao se comunicar com o servidor.');
      }
    });
 
    // Temporizador do Reenvio
    let timer = 60;
    const resendBtn = document.getElementById("resendBtn");
    const timerText = document.getElementById("timerText");
 
    const countdown = setInterval(() => {
      timer--;
      timerText.textContent = `Você poderá reenviar em ${timer}s`;
      if (timer <= 0) {
        clearInterval(countdown);
        resendBtn.disabled = false;
        timerText.textContent = "";
      }
    }, 1000);
  
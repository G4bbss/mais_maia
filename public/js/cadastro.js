        function toggleSenha() {
            const campoSenha = document.getElementById("senha");
            const icon = document.getElementById("toggleIcon");
            if (campoSenha.type === "password") {
                campoSenha.type = "text"; // mostra a senha
                icon.textContent = "🙈"; // muda ícone para "ocultar"
            } else {
                campoSenha.type = "password"; // oculta a senha
                icon.textContent = "👁️"; // volta ícone para "mostrar"
            }
        }
  
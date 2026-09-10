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
  
        // Função para pré-visualizar a foto quando a usuária seleciona um arquivo local
        function previewFoto(event) {
            const input = event.target;
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.getElementById("foto-cabecalho").src = e.target.result;
                };
                reader.readAsDataURL(input.files[0]);
            }
        }

        // Alternar visibilidade da senha
        function toggleSenha() {
            const senhaInput = document.getElementById("senha");
            const toggleIcon = document.getElementById("toggleIcon");
            if (senhaInput.type === "password") {
                senhaInput.type = "text";
                toggleIcon.textContent = "🙈";
            } else {
                senhaInput.type = "password";
                toggleIcon.textContent = "👁️";
            }
        }

        // Preenche Nome, E-mail e Foto caso venham da URL (Login do Google)
        window.addEventListener("DOMContentLoaded", () => {
            const params = new URLSearchParams(window.location.search);
            const nomeParam = params.get("nome");
            const emailParam = params.get("email");
            const fotoParam = params.get("foto");

            if (nomeParam) document.getElementById("nome").value = nomeParam;
            if (emailParam) document.getElementById("email").value = emailParam;
            if (fotoParam) document.getElementById("foto-cabecalho").src = fotoParam;
        });
   
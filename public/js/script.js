 // Menu mobile (hamburguer)
        const menuToggle = document.getElementById("menuToggle");
        const navLinks = document.getElementById("navLinks");

        menuToggle.addEventListener("click", function () {
            navLinks.classList.toggle("open");
        });

        // Fecha o menu mobile ao clicar em um link
        navLinks.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                navLinks.classList.remove("open");
            });
        });
    



        
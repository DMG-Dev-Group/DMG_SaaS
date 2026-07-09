const cards = document.querySelectorAll(".card");

/* ── Lógica de clique nos cards ── */
cards.forEach(card => {
  card.addEventListener("click", () => {
    const isActive = card.classList.contains("active");

    /* Remove estados de todos os cards e esconde todos os painéis */
    cards.forEach(c => {
      c.classList.remove("active", "inactive");
      c.querySelectorAll(".member-info").forEach(p => p.classList.remove("visible"));
    });

    if (isActive) {
      /* Segundo clique: fecha tudo */
      return;
    }

    /* Ativa o card clicado */
    card.classList.add("active");

    /* Inativa os demais */
    cards.forEach(c => {
      if (c !== card) c.classList.add("inactive");
    });

    /* Exibe os painéis do card clicado */
    card.querySelectorAll(".member-info").forEach(p => p.classList.add("visible"));
  });
});

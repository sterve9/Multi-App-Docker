document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("automation-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name.value,
      email: form.email.value,
      business: form.business.value,
      goal: form.goal.value,
      tools: form.tools.value,
      source: "builder.sterveshop.cloud",
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch(
        "https://automation.sterveshop.cloud/webhook/builder-auto",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) throw new Error("Webhook error");

      alert("Demande envoyée avec succès.");
      form.reset();
    } catch (err) {
      alert("Erreur lors de l’envoi. Réessayez plus tard.");
      console.error(err);
    }
  });
});

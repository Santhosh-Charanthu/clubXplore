document
  .getElementById("clubRegistrationForm")
  .addEventListener("submit", function (event) {
    let isValid = true;
    const inputs = this.querySelectorAll("input[required]");

    inputs.forEach((input) => {
      if (!input.value.trim()) {
        isValid = false;
        input.classList.add("is-invalid"); // Adds Bootstrap's error styling
      } else {
        input.classList.remove("is-invalid");
      }
    });

    if (!isValid) {
      event.preventDefault(); // Stop form submission if there are errors
    }
  });

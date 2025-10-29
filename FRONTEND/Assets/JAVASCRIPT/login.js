// Authentication Logic for Login & Signup Pages
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // ✅ SIGNUP FUNCTIONALITY
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const staffID = document.getElementById("staffID").value.trim();
      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const designation = document.getElementById("designation").value;
      const password = document.getElementById("password").value.trim();

      const currentUser = JSON.parse(localStorage.getItem("currentUser"));
      if (!currentUser || currentUser.designation !== "Head of Chamber") {
        alert("❌ Only the Head of Chamber can create new accounts.");
        return;
      }

      const users = JSON.parse(localStorage.getItem("users")) || [];
      if (users.find((u) => u.staffID === staffID)) {
        alert("❌ Staff ID already exists.");
        return;
      }

      users.push({ staffID, firstName, lastName, designation, password });
      localStorage.setItem("users", JSON.stringify(users));

      alert("✅ User account created successfully!");
      signupForm.reset();
    });
  }

  // ✅ LOGIN FUNCTIONALITY
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const staffID = document.getElementById("loginStaffID").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      const users = JSON.parse(localStorage.getItem("users")) || [];
      const user = users.find(
        (u) => u.staffID === staffID && u.password === password
      );

      if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        alert(`✅ Welcome ${user.firstName}! You are logged in as ${user.designation}.`);

        // Redirect logic
        if (user.designation === "Head of Chamber") {
          window.location.href = "signup.html";
        } else {
          window.location.href = "case-dashboard.html";
        }
      } else {
        alert("❌ Invalid Staff ID or Password.");
      }
    });
  }

  // ✅ Password Visibility Toggle (for both pages)
  const toggleLogin = document.getElementById("toggleLoginPassword");
  const toggleSignup = document.getElementById("toggleSignupPassword");

  if (toggleLogin) {
    toggleLogin.addEventListener("click", () => {
      const pwd = document.getElementById("loginPassword");
      const type = pwd.type === "password" ? "text" : "password";
      pwd.type = type;
      toggleLogin.classList.toggle("fa-eye");
      toggleLogin.classList.toggle("fa-eye-slash");
    });
  }

  if (toggleSignup) {
    toggleSignup.addEventListener("click", () => {
      const pwd = document.getElementById("password");
      const type = pwd.type === "password" ? "text" : "password";
      pwd.type = type;
      toggleSignup.classList.toggle("fa-eye");
      toggleSignup.classList.toggle("fa-eye-slash");
    });
  }
});

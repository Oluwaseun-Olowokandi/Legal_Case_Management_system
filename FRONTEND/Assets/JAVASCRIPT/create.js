// Case categories, subcategories, and billing rates
const caseData = {
  civil: {
    subcategories: ["Contract Dispute", "Property", "Employment", "Debt Recovery"],
    rate: 500
  },
  criminal: {
    subcategories: ["Theft", "Fraud", "Assault", "Murder"],
    rate: 800
  },
  family: {
    subcategories: ["Divorce", "Custody", "Adoption", "Inheritance"],
    rate: 600
  }
};

// DOM Elements
const categorySelect = document.getElementById("category");
const subcategorySelect = document.getElementById("subcategory");
const billingField = document.getElementById("billingAmount");
const documentsInput = document.getElementById("documents");
const uploadedList = document.getElementById("uploadedList");
const suitNumberField = document.getElementById("suitNumber");
const form = document.getElementById("caseForm");

// Dynamic subcategory population
categorySelect.addEventListener("change", () => {
  const selected = categorySelect.value;
  subcategorySelect.innerHTML = '<option value="">Select sub-category</option>';

  if (selected && caseData[selected]) {
    caseData[selected].subcategories.forEach(sub => {
      const option = document.createElement("option");
      option.value = sub.toLowerCase().replace(/\s+/g, "_");
      option.textContent = sub;
      subcategorySelect.appendChild(option);
    });
    billingField.value = `$${caseData[selected].rate.toFixed(2)}`;
  } else {
    billingField.value = "";
  }
});

// Handle file uploads
documentsInput.addEventListener("change", (event) => {
  uploadedList.innerHTML = "";
  const files = Array.from(event.target.files);

  files.forEach(file => {
    const li = document.createElement("li");
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    li.textContent = `${file.name} — ${fileSize} MB`;
    uploadedList.appendChild(li);
  });
});

// Enable suit number if case proceeds to court (example trigger)
subcategorySelect.addEventListener("change", () => {
  if (subcategorySelect.value.includes("court")) {
    suitNumberField.disabled = false;
  } else {
    suitNumberField.disabled = true;
    suitNumberField.value = "";
  }
});

// Form validation and submission
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const caseDetails = Object.fromEntries(formData.entries());

  // Basic validation
  if (!caseDetails.caseNumber || !caseDetails.complainants || !caseDetails.respondents) {
    alert("Please fill out all required fields.");
    return;
  }

  // Display confirmation
  alert(`✅ Case Created Successfully!
Case Number: ${caseDetails.caseNumber}
Category: ${caseDetails.category.toUpperCase()}
Billing: ${billingField.value}`);

  form.reset();
  uploadedList.innerHTML = "";
  billingField.value = "";
});

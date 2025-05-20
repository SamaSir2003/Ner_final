function selectValidationDomain(domain) {
    // Store both the validation mode and selected domain
    localStorage.setItem("validationMode", "true");
    localStorage.setItem("selectedDomain", domain);
    
    // Navigate to the validation page with the domain parameter
    window.location.href = "/validation_home?domain=" + domain;
}
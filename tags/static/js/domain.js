function selectDomain(domain) {
    localStorage.setItem("selectedDomain", domain);
    window.location.href = "/home"; // Navigate to next page
}
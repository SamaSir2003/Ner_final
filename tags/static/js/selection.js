function selectAction(action) {
    localStorage.setItem("selectedAction", action);
    
    if (action === 'domain') {
        window.location.href = "/domain";  // Redirect to domain selection page
    } else if (action === 'validate') {
        window.location.href = "/validation";  // Redirect to validation domain selection
    }
}
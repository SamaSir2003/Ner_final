function deleteUser(username) {
    if (confirm(`Are you sure you want to delete ${username}?`)) {
      fetch('/remove_annotator/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': '{{ csrf_token }}'
        },
        body: JSON.stringify({ username: username })
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          alert(data.message);
          // Remove user card from the page
          const userCard = document.getElementById(`user-${username}`);
          if (userCard) {
            console.log("Deleted");
            userCard.remove();
          }
        } else {
          alert('Error: ' + data.message);
        }
      })
      .catch(error => {
        alert('Request failed: ' + error);
      });
    }
  }
function openAddUserDialog() {
    document.getElementById("addUserDialog").style.display = "block";
}
function closeAddUserDialog() {
  document.getElementById("addUserDialog").style.display = "none";
  document.getElementById("addUserForm").reset();
}



function submitNewUser(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  fetch("/add_annotator/", {
      method: "POST",
      body: JSON.stringify({
          username: username,
          password: password,
      }),
      headers: {
          "Content-Type": "application/json",
      },
  })
      .then((response) => response.json())
      .then((data) => {
          if (data.status === "success") {
              alert("User added successfully!");
              closeAddUserDialog();
          } else {
              alert(data.message || "Error adding user!");
          }
      })
      .catch((error) => {
          console.error("Error:", error);
          alert("Failed to add user.");
      });
}

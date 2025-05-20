// Global variables
let currentTagToDelete = "";

// DOM ready function
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    setupEventListeners();
});

// Set up all event listeners
function setupEventListeners() {
    // Add onclick events for dialogs that aren't handled in HTML
    window.onclick = function(event) {
        if (event.target.classList.contains('dialog')) {
            closeAllDialogs();
        }
    };
}

// Get CSRF Token from cookies for Django
function getCsrfToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 'csrftoken='.length) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring('csrftoken='.length));
                break;
            }
        }
    }
    return cookieValue;
}

// Filter tags by search term
function filterTags() {
    let searchInput = document.getElementById("tagSearch").value.toLowerCase();
    let tags = document.querySelectorAll(".tags-grid .tag-item");

    tags.forEach(tag => {
        let tagName = tag.querySelector(".tag-name").textContent.toLowerCase();
        if (tagName.includes(searchInput)) {
            tag.style.display = "flex"; // Show matching tags
        } else {
            tag.style.display = "none"; // Hide non-matching tags
        }
    });
}

// Filter tags by category
function filterByCategory(category) {
    // Update active button state
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter tags
    const tagItems = document.querySelectorAll('.tag-item');
    
    tagItems.forEach(item => {
        const tagCategory = item.getAttribute('data-category');
        
        if (category === 'all' || tagCategory === category) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Select a tag
function selectTag(tagName) {
    document.getElementById('selectedTag').textContent = tagName;
    
    // Update statistics (this would normally fetch data from the server)
    fetchTagStatistics(tagName);
}

// Fetch tag statistics from server (placeholder)
function fetchTagStatistics(tagName) {
    // In a real implementation, this would fetch data from the server
    // For now, we'll use placeholder data
    document.getElementById('tagUsageCount').textContent = Math.floor(Math.random() * 100);
    
    const today = new Date();
    document.getElementById('tagLastUsed').textContent = today.toLocaleDateString();
    
    // Generate some random related tags
    const relatedTagsContainer = document.getElementById('relatedTags');
    relatedTagsContainer.innerHTML = '';
    
    // Simulate 2-3 related tags
    const relatedCount = 2 + Math.floor(Math.random() * 2);
    const categories = ['Gen', 'Med', 'Fin'];
    
    for(let i = 0; i < relatedCount; i++) {
        const relatedTag = document.createElement('span');
        relatedTag.textContent = `${categories[Math.floor(Math.random() * categories.length)]}-Related${i+1}`;
        relatedTagsContainer.appendChild(relatedTag);
    }
}

// Delete tag function
function deleteTag() {
    const tagName = currentTagToDelete;
    
    fetch("/delete_tag/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCsrfToken(),
        },
        body: new URLSearchParams({ tag: tagName }),
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.status === "success") {
            alert(data.message);
            // Remove the tag from the DOM without reloading the page
            const tagElements = document.querySelectorAll(".tags-grid .tag-item");
            tagElements.forEach((tagElement) => {
                if (tagElement.querySelector(".tag-name").textContent.trim() === tagName) {
                    tagElement.remove();
                }
            });
            closeDeleteConfirmDialog();
        } else {
            alert(data.message);
            closeDeleteConfirmDialog();
        }
    })
    .catch((error) => {
        console.error("Error:", error);
        closeDeleteConfirmDialog();
    });
}

// Show delete confirmation dialog
function confirmDeleteTag(tagName) {
    currentTagToDelete = tagName;
    document.getElementById('deleteConfirmDialog').style.display = 'flex';
}

// Close delete confirmation dialog
function closeDeleteConfirmDialog() {
    document.getElementById('deleteConfirmDialog').style.display = 'none';
    currentTagToDelete = "";
}

// Clear all tags
function clearTags() {
    document.getElementById('clearConfirmDialog').style.display = 'flex';
}

// Confirm clear all tags
function confirmClearTags() {
    fetch("/clear_tags/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
        },
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.status === "success") {
            alert(data.message);
            // Clear all tags from DOM
            const tagsGrid = document.querySelector('.tags-grid');
            tagsGrid.innerHTML = '';
            closeClearConfirmDialog();
        } else {
            alert(`Error: ${data.message}`);
            closeClearConfirmDialog();
        }
    })
    .catch((error) => {
        console.error("Error clearing tags:", error);
        alert("Failed to clear tags.");
        closeClearConfirmDialog();
    });
}

// Close clear confirmation dialog
function closeClearConfirmDialog() {
    document.getElementById('clearConfirmDialog').style.display = 'none';
}

// Show add tag dialog
function showAddTagDialog() {
    const dialog = document.getElementById("addTagDialog");
    dialog.style.display = "flex"; // Show the dialog
}

// Close add tag dialog
function closeAddTagDialog() {
    const dialog = document.getElementById("addTagDialog");
    dialog.style.display = "none"; // Hide the dialog
    // Clear input fields
    document.getElementById("newTagInput").value = "";
    document.getElementById("tagCategory").value = "";
}

// Submit new tag
function submitNewTag() {
    const tagCategory = document.getElementById("tagCategory").value.trim();
    const newTag = document.getElementById("newTagInput").value.trim();
    
    if (!tagCategory) {
        alert("Please select a tag category.");
        return;
    }
    if (!newTag) {
        alert("Tag name cannot be empty!");
        return;
    }

    fetch("/add_tag/", {
        method: "POST",
        body: JSON.stringify({ tag: newTag, category: tagCategory }),
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
        },
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.status === "success") {
            alert("Tag added!");
            // Clear input fields
            document.getElementById("newTagInput").value = "";
            document.getElementById("tagCategory").value = "";
            // Reload page to show new tag
            window.location.reload();
            closeAddTagDialog();
        } else {
            alert("Error adding tag! It might already exist.");
        }
    })
    .catch((error) => {
        console.error("Error adding tag:", error);
        alert("Failed to add tag.");
    });
}

// Show edit tag dialog
function showEditTagDialog(tagName, tagCategory) {
    const dialog = document.getElementById("editTagDialog");
    document.getElementById("editTagInput").value = tagName;
    document.getElementById("editTagCategory").value = tagCategory;
    document.getElementById("originalTagName").value = tagName;
    dialog.style.display = "flex";
}

// Close edit tag dialog
function closeEditTagDialog() {
    document.getElementById("editTagDialog").style.display = "none";
}

// Update tag
function updateTag() {
    const originalName = document.getElementById("originalTagName").value;
    const newName = document.getElementById("editTagInput").value.trim();
    const category = document.getElementById("editTagCategory").value;
    
    if (!newName) {
        alert("Tag name cannot be empty!");
        return;
    }
    
    fetch("/update_tag/", {
        method: "POST",
        body: JSON.stringify({ 
            original_tag: originalName, 
            new_tag: newName, 
            category: category 
        }),
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
        },
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.status === "success") {
            alert("Tag updated!");
            // Reload page to show updated tag
            window.location.reload();
        } else {
            alert("Error updating tag: " + data.message);
        }
        closeEditTagDialog();
    })
    .catch((error) => {
        console.error("Error updating tag:", error);
        alert("Failed to update tag.");
        closeEditTagDialog();
    });
}

// Close all dialogs
function closeAllDialogs() {
    document.getElementById("addTagDialog").style.display = "none";
    document.getElementById("editTagDialog").style.display = "none";
    document.getElementById("deleteConfirmDialog").style.display = "none";
    document.getElementById("clearConfirmDialog").style.display = "none";
}
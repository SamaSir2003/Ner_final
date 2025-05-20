// Global variables
let annotations = [];
let currentDocumentIndex = 0;
let totalDocuments = 0;
let selectedDomain = "Gen"; // Default domain
let tagUsageCount = {}; // Store tag usage counts
let topTags = []; // Stores top 5 tags as [tag, count]
let topTagsSet = new Set(); // Fast lookup of top tags
let tagShortcuts = {}; // Keyboard shortcuts for tags
let fileName = ""; // Current file name for saving
let tags = []; // Will store the active tags
let documents = []; // Array to store grouped annotations as documents

document.addEventListener("DOMContentLoaded", () => {
    console.log("Validation Home JS loading...");

    // Get the domain from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    selectedDomain = urlParams.get("domain") || localStorage.getItem("selectedDomain") || "Gen";

    // Update the domain display on the page
    document.getElementById("currentDomain").textContent =
        selectedDomain === "Gen" ? "General" :
            selectedDomain === "Med" ? "Medical" : "Financial";

    // Set domain in localStorage
    localStorage.setItem("selectedDomain", selectedDomain);
    localStorage.setItem("validationMode", "true");

    // Initialize tags based on domain
    if (selectedDomain === "Gen") {
        tags = JSON.parse(tag1.replace(/'/g, '"'));
    } else {
        tags = JSON.parse(tag2.replace(/'/g, '"'));
    }

    console.log("Tags loaded:", tags);

    // Populate tag list
    populateTagList();

    // Load annotations based on domain (automatically)
    loadAnnotations();

    // Add keyboard shortcuts
    // document.addEventListener("keydown", handleKeyboardShortcuts);
});

// Function to load annotations from server based on domain
function loadAnnotations() {
    showLoading();

    fetch(`/get_annotations/?domain=${encodeURIComponent(selectedDomain)}`)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.status === "success") {
                annotations = data.annotations;
                fileName = data.filename || `annotations_${selectedDomain.toLowerCase()}.xlsx`;

                // Group annotations into documents (paragraphs)
                documents = groupAnnotationsIntoDocuments(annotations);
                totalDocuments = documents.length;

                // Update UI
                // document.getElementById("totalAnnotations").textContent = totalDocuments;
                document.getElementById("currentFileName").textContent = fileName;

                // Display first document
                if (totalDocuments > 0) {
                    currentDocumentIndex = 0;
                    displayCurrentDocument();
                } else {
                    document.getElementById("sentencesContainer").innerHTML =
                        "<p class='text-center p-4'>No annotations available for this domain.</p>";
                }

                showNotification(`Loaded ${totalDocuments} paragraphs from ${fileName}`, "success");
            } else {
                showNotification("Failed to load annotations: " + data.message, "error");
            }
        })
        .catch(error => {
            hideLoading();
            console.error("Error fetching annotations:", error);
            showNotification("Error loading annotations. Please try again.", "error");
        });
}

// Function to group annotations into documents (paragraphs)
function groupAnnotationsIntoDocuments(allAnnotations) {
    const groupedDocuments = [];

    // Group annotations by paragraph_id
    const paragraphGroups = {};

    allAnnotations.forEach(annotation => {
        const paragraphId = annotation.paragraph_id;

        if (!paragraphGroups[paragraphId]) {
            paragraphGroups[paragraphId] = [];
        }

        paragraphGroups[paragraphId].push(annotation);
    });

    // Sort each paragraph group by sentence_number and convert to array
    Object.values(paragraphGroups).forEach(paragraphAnnotations => {
        // Sort by sentence number to ensure correct order
        paragraphAnnotations.sort((a, b) => a.sentence_number - b.sentence_number);
        groupedDocuments.push(paragraphAnnotations);
    });

    return groupedDocuments;
}

// Function to display the current document (paragraph)
function displayCurrentDocument() {
    if (!documents || documents.length === 0) {
        return;
    }

    const currentDocument = documents[currentDocumentIndex];
    const sentencesContainer = document.getElementById("sentencesContainer");
    sentencesContainer.innerHTML = "";

    // Update counter
    // document.getElementById("currentAnnotation").textContent = currentDocumentIndex + 1;

    // Create document container
    const documentDiv = document.createElement("div");
    documentDiv.className = "mb-4 p-3 border rounded bg-white";

    // Add paragraph header with index information
    const paragraphHeader = document.createElement("div");
    paragraphHeader.className = "text-sm font-bold mb-3 pb-2 border-b text-gray-700";
    paragraphHeader.textContent = `Paragraph ${currentDocumentIndex + 1} of ${totalDocuments}`;
    documentDiv.appendChild(paragraphHeader);

    // Display each sentence in the document
    currentDocument.forEach(annotation => {
        // Create sentence container
        const sentenceDiv = document.createElement("div");
        sentenceDiv.className = "mb-3 p-2 border-b"; // Each sentence is a line
        sentenceDiv.dataset.index = annotation.sentence_number;

        // Add sentence header
        const sentenceHeader = document.createElement("div");
        sentenceHeader.className = "mb-1 text-xs text-gray-500";
        sentenceHeader.textContent = `Sentence #${annotation.sentence_number}`;
        sentenceDiv.appendChild(sentenceHeader);

        // Create sentence content container (for inline words)
        const sentenceContent = document.createElement("div");
        sentenceContent.className = "flex flex-wrap gap-1";

        // Add words with their tags - ensure we process all words
        const sortedWordIndices = Object.keys(annotation.annotations).sort((a, b) => parseInt(a) - parseInt(b));

        sortedWordIndices.forEach(wordIndex => {
            const wordData = annotation.annotations[wordIndex];
            const { word, tag } = wordData;

            const wordDiv = document.createElement("span"); // Use span for inline
            wordDiv.className = "word cursor-pointer px-1";
            wordDiv.innerText = word;
            wordDiv.dataset.sentenceIndex = annotation.sentence_number;
            wordDiv.dataset.wordIndex = wordIndex;
            wordDiv.onclick = () => selectWord(wordDiv);

            // Add tag class if exists
            if (tag && tag !== "O") {
                wordDiv.classList.add(`tag-${tag.toLowerCase()}`);

                // Add tag label
                const tagLabel = document.createElement("span");
                tagLabel.className = "tag-label text-xs";
                tagLabel.innerText = tag;
                wordDiv.appendChild(tagLabel);

                // Update tag usage count
                tagUsageCount[tag] = (tagUsageCount[tag] || 0) + 1;
            }

            sentenceContent.appendChild(wordDiv);

            // Add a space after each word (except for punctuation that doesn't need spaces)
            if (!/^[,.!?;:]$/.test(word)) {
                const space = document.createTextNode(" ");
                sentenceContent.appendChild(space);
            }
        });

        sentenceDiv.appendChild(sentenceContent);
        documentDiv.appendChild(sentenceDiv);
    });

    sentencesContainer.appendChild(documentDiv);

    // Update top tags after loading
    updateTopTagsFromAllAnnotations();
}

// Function to populate tag list
function populateTagList() {
    const tagListDiv = document.getElementById("tagList");
    tagListDiv.innerHTML = "";

    tags.forEach(tag => {
        const tagDiv = document.createElement("div");
        tagDiv.innerText = tag;
        tagDiv.value = tag;
        tagDiv.onclick = () => selectTag(tag);
        tagListDiv.appendChild(tagDiv);
    });
}

// Function to filter tags
function filterTags() {
    const query = document.getElementById("tagSearch").value.toLowerCase();
    const tagListDiv = document.getElementById("tagList");
    const tagItems = tagListDiv.children;

    for (let item of tagItems) {
        item.style.display = item.innerText.toLowerCase().includes(query) ? "block" : "none";
    }
}

// Function to select a tag
function selectTag(tag) {
    document.getElementById("tagSearch").value = tag;
}

// Function to select a word
function selectWord(wordDiv) {
    document.querySelectorAll(".word").forEach(w => w.classList.remove("selected"));
    wordDiv.classList.add("selected");
}


// Function to update top tags from all loaded annotations
function updateTopTagsFromAllAnnotations() {
    // Reset tag usage count
    tagUsageCount = {};

    // Count all tags in all annotations
    documents.forEach(document => {
        document.forEach(annotation => {
            Object.values(annotation.annotations).forEach(wordData => {
                const tag = wordData.tag;
                if (tag && tag !== "O") {
                    tagUsageCount[tag] = (tagUsageCount[tag] || 0) + 1;
                }
            });
        });
    });

    // Sort tags by count and get top 5
    const sortedTags = Object.entries(tagUsageCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Reset top tags
    topTags = sortedTags;
    topTagsSet = new Set(sortedTags.map(item => item[0]));

    // Render top tags
    renderTopTags();
}

// Function to load next document
function loadNextAnnotation() {
    if (currentDocumentIndex < totalDocuments - 1) {
        currentDocumentIndex++;
        displayCurrentDocument();
        // Scroll to the top of the container for better usability
        document.getElementById("sentencesContainer").scrollTop = 0;
    } else {
        showNotification("You've reached the last paragraph", "info");
    }
}

// Function to load previous document
function loadPreviousAnnotation() {
    if (currentDocumentIndex > 0) {
        currentDocumentIndex--;
        displayCurrentDocument();
        // Scroll to the top of the container for better usability
        document.getElementById("sentencesContainer").scrollTop = 0;
    } else {
        showNotification("You're at the first paragraph", "info");
    }
}

function submitValidAnnotation() {
    // Get only the current document's annotations
    const currentDocument = documents[currentDocumentIndex];

    
    let emptyAnnotations = checkForEmptyAnnotationsInDocument(currentDocument);

    if (emptyAnnotations.length > 0) {
        showDialog(emptyAnnotations, () => {
            submitValidatedData(currentDocument, true);
        });
    } else {
        submitValidatedData(currentDocument, true);
    }
}



// function skipAnnotation() {
//     showLoading();

//     fetch(`/skip_annotation/?domain=${encodeURIComponent(selectedDomain)}&current=${encodeURIComponent(currentDocumentIndex)}`)
//         .then(response => response.json())
//         .then(data => {
//             hideLoading();
//             if (data.status === "success") {
//                 annotations = data.annotations;
//                 fileName = data.filename;

//                 // Group annotations into documents
//                 documents = groupAnnotationsIntoDocuments(annotations);
//                 totalDocuments = documents.length;

//                 // Update UI
//                 document.getElementById("totalAnnotations").textContent = totalDocuments;
//                 document.getElementById("currentFileName").textContent = fileName;

//                 // Reset to first document
//                 currentDocumentIndex = 0;
//                 displayCurrentDocument();

//                 showNotification(`Loaded new set of ${totalDocuments} paragraphs from ${fileName}`, "info");
//             } else {
//                 showNotification(data.message, "error");
//             }
//         })
//         .catch(error => {
//             hideLoading();
//             console.error("Error skipping annotations:", error);
//             showNotification("Error skipping. Please try again.", "error");
//         });

    
// }

function submitValidAnnotation() {
    // Get only the current document's annotations
    const currentDocument = documents[currentDocumentIndex];

    // Check if there are any annotations with no tags
    let emptyAnnotations = checkForEmptyAnnotationsInDocument(currentDocument);

    if (emptyAnnotations.length > 0) {
        showDialog(emptyAnnotations, () => {
            submitValidatedData(currentDocument, true);
        });
    } else {
        submitValidatedData(currentDocument, true);
    }
}

// Function to submit the current paragraph as an invalid annotation
function submitInvalidAnnotation() {
    showLoading();

    // Get only the current document's annotations
    const currentDocument = documents[currentDocumentIndex];

    const paragraphIds = new Set();
    currentDocument.forEach(annotation => {
        if (annotation.paragraph_id !== undefined) {
            paragraphIds.add(annotation.paragraph_id);
        }
    });
    // Prepare payload for submission
    const payload = {
        domain: selectedDomain,
        isValid: false,
        annotations: currentDocument,
        processed_paragraphs: Array.from(paragraphIds)
    };

    fetch("/submit_validation/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.status === "success") {
                showNotification("Marked as invalid and saved to text file!", "success");

                // Remove this document from the local list
                removeCurrentDocumentFromList();

                // If there are more documents, show the next one
                if (documents.length > 0) {
                    // If we removed the last document, go to the previous one
                    if (currentDocumentIndex >= documents.length) {
                        currentDocumentIndex = documents.length - 1;
                    }
                    displayCurrentDocument();
                } else {
                    // No more documents, load new set
                    loadAnnotations();
                }
            } else {
                showNotification("Failed to mark as invalid: " + data.message, "error");
            }
        })
        .catch(error => {
            hideLoading();
            console.error("Error submitting invalid annotation:", error);
            showNotification("Error submitting. Please try again.", "error");
        });
}

// Function to check for annotations without tags in a specific document
function checkForEmptyAnnotationsInDocument(documentAnnotations) {
    let emptyAnnotations = [];

    documentAnnotations.forEach(annotation => {
        let hasNonOTag = false;

        Object.values(annotation.annotations).forEach(wordData => {
            if (wordData.tag && wordData.tag !== "O") {
                hasNonOTag = true;
            }
        });

        if (!hasNonOTag) {
            emptyAnnotations.push(annotation.sentence_number);
        }
    });

    return emptyAnnotations;
}

// Function to check for annotations without tags
function checkForEmptyAnnotations() {
    let emptyAnnotations = [];

    annotations.forEach(annotation => {
        let hasNonOTag = false;

        Object.values(annotation.annotations).forEach(wordData => {
            if (wordData.tag && wordData.tag !== "O") {
                hasNonOTag = true;
            }
        });

        if (!hasNonOTag) {
            emptyAnnotations.push(annotation.sentence_number);
        }
    });

    return emptyAnnotations;
}

// Function to show dialog for empty annotations
function showDialog(emptyAnnotations, validCallback = null) {
    document.getElementById('emptyLinesDialog').style.display = 'block';
    document.getElementById('dialogOverlay').style.display = 'block';

    // Set up dialog buttons
    document.getElementById('cancelBtn').onclick = () => {
        hideDialog();
    };

    document.getElementById('submitAnywaysBtn').onclick = () => {
        hideDialog();
        if (validCallback) {
            validCallback();
        } else {
            submitValidatedData(annotations);
        }
    };

    // document.getElementById('saveForLaterBtn').onclick = () => {
    //     hideDialog();
    //     if (validCallback) {
    //         // Skip - just move to next
    //         removeCurrentDocumentFromList();

    //         // If there are more documents, show the next one
    //         if (documents.length > 0) {
    //             // If we removed the last document, go to the previous one
    //             if (currentDocumentIndex >= documents.length) {
    //                 currentDocumentIndex = documents.length - 1;
    //             }
    //             displayCurrentDocument();
    //         } else {
    //             // No more documents, load new set
    //             loadAnnotations();
    //         }
    //     } else {
    //         // Filter out empty annotations
    //         const filteredAnnotations = annotations.filter(annotation => {
    //             const sentenceNumber = annotation.sentence_number;
    //             return !emptyAnnotations.includes(sentenceNumber);
    //         });

    //         submitValidatedData(filteredAnnotations);
    //     }
    // };
}

// Function to hide dialog
function hideDialog() {
    document.getElementById('emptyLinesDialog').style.display = 'none';
    document.getElementById('dialogOverlay').style.display = 'none';
}

// Function to submit validated data
function submitValidatedData(validatedData, isSingleDocument = false) {
    showLoading();

    const paragraphIds = new Set();
    validatedData.forEach(annotation => {
        if (annotation.paragraph_id !== undefined) {
            paragraphIds.add(annotation.paragraph_id);
        }
    });

    // Prepare payload for submission
    const payload = {
        domain: selectedDomain,
        filename: getOutputFilename(),
        isValid: true,
        annotations: validatedData,
        processed_paragraphs: Array.from(paragraphIds)
    };

    fetch("/submit_validation/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.status === "success") {
                showNotification("Valid annotation saved successfully!", "success");

                if (isSingleDocument) {
                    // Remove this document from the local list
                    // removeCurrentDocumentFromList();

                    // If there are more documents, show the next one
                    if (documents.length > 0) {
                        // If we removed the last document, go to the previous one
                        if (currentDocumentIndex >= documents.length) {
                            currentDocumentIndex = documents.length - 1;
                        }
                        displayCurrentDocument();
                    } else {
                        // No more documents, load new set
                        loadAnnotations();
                    }
                } else {
                    // This is for the original full submission - load new set
                    loadAnnotations();
                }
            } else {
                showNotification("Failed to save: " + data.message, "error");
            }
        })
        .catch(error => {
            hideLoading();
            console.error("Error submitting validation:", error);
            showNotification("Error submitting. Please try again.", "error");
        });
}

// Function to remove the current document from our lists
function removeCurrentDocumentFromList() {
    // Get the current document's annotation IDs
    const currentDocument = documents[currentDocumentIndex];
    const currentAnnotationIds = currentDocument.map(annotation => annotation.id);

    // Remove from documents array
    documents.splice(currentDocumentIndex, 1);
    totalDocuments = documents.length;

    // Update the annotations array too
    annotations = annotations.filter(annotation =>
        !currentAnnotationIds.includes(annotation.id)
    );

    
}

// Function to get output filename based on domain
function getOutputFilename() {
    switch (selectedDomain) {
        case "Gen": return "final.xlsx";
        case "Med": return "final_med.xlsx";
        case "Fin": return "final_fin.xlsx";
        default: return "final.xlsx";
    }
}

// Function to automatically select the next word
function selectNextWord(currentWordDiv) {
    const words = Array.from(document.querySelectorAll(".word"));
    const currentIndex = words.indexOf(currentWordDiv);

    if (currentIndex < words.length - 1) {
        currentWordDiv.classList.remove("selected");
        words[currentIndex + 1].classList.add("selected");
        words[currentIndex + 1].scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

// Function to update top tags
function updateTopTags(tag) {
    // If tag is already in topTags, just update the UI
    if (topTagsSet.has(tag)) {
        for (let i = 0; i < topTags.length; i++) {
            if (topTags[i][0] === tag) {
                topTags[i][1] = tagUsageCount[tag]; // Update count
                break;
            }
        }
        renderTopTags();
        return;
    }

    // Get the lowest count tag in topTags
    let lowestIndex = -1;
    let lowestCount = Infinity;

    if (topTags.length === 5) {
        topTags.forEach(([t, count], i) => {
            if (count < lowestCount) {
                lowestCount = count;
                lowestIndex = i;
            }
        });
    }

    // Check if the new tag's count is higher than the lowest top tag
    if (topTags.length < 5 || (tagUsageCount[tag] > lowestCount)) {
        if (topTags.length === 5) {
            // Remove the lowest tag from Set and Array
            topTagsSet.delete(topTags[lowestIndex][0]);
            topTags.splice(lowestIndex, 1);
        }

        // Insert the new tag into topTags & Set
        topTags.push([tag, tagUsageCount[tag]]);
        topTagsSet.add(tag);

        // Sort topTags based on count (to keep order correct)
        topTags.sort((a, b) => b[1] - a[1]);
    }

    renderTopTags();
}

// Function to render top tags
function renderTopTags() {
    const topTagsList = document.getElementById("topTagsList");
    topTagsList.innerHTML = "";

    const tagColors = {
        person: "#4299e1",
        location: "#48bb78",
        object: "#ed8936",
        building: "#a0522d",
        None: "#edf2f7",
        disease: "#805ad5",
        treatment: "#38b2ac",
        symptom: "#d53f8c",
        medication: "#667eea",
        body_part: "#f6ad55",
        company: "#2b6cb0",
        amount: "#9f7aea",
        percentage: "#f56565",
        currency: "#38a169",
        date: "#718096"
    };

    topTags.forEach(([tag, count], index) => {
        const tagItem = document.createElement("div");
        tagItem.className = "top-tag-item";
        tagShortcuts[index + 1] = tag;

        const tagName = document.createElement("span");
        tagName.className = "top-tag-name";
        tagName.innerText = tag;
        tagName.style.backgroundColor = tagColors[tag.toLowerCase()] || "#718096";
        tagName.style.color = tag.toLowerCase() === "none" ? "#2d3748" : "white";

        const tagCount = document.createElement("span");
        tagCount.className = "top-tag-count";
        tagCount.innerText = count;

        tagItem.appendChild(tagName);
        tagItem.appendChild(tagCount);
        topTagsList.appendChild(tagItem);
    });
}

// Function to handle keyboard shortcuts


// Function to show loading indicator
function showLoading() {
    const sentencesContainer = document.getElementById("sentencesContainer");
    sentencesContainer.innerHTML = "";

    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loadingSpinner";
    loadingDiv.innerHTML = `
        <div class="flex justify-center items-center">
            <div class="animate-spin h-10 w-10 border-t-4 border-blue-500 border-solid rounded-full"></div>
            <span class="ml-3 text-gray-700">Loading data, please wait...</span>
        </div>
    `;
    sentencesContainer.appendChild(loadingDiv);
}

// Function to hide loading indicator
function hideLoading() {
    const loadingDiv = document.getElementById("loadingSpinner");
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Function to show notifications
function showNotification(message, type) {
    // Check if notification container exists, if not create it
    let notifContainer = document.getElementById("notification-container");
    if (!notifContainer) {
        notifContainer = document.createElement("div");
        notifContainer.id = "notification-container";
        notifContainer.style.position = "fixed";
        notifContainer.style.bottom = "20px";
        notifContainer.style.right = "20px";
        notifContainer.style.zIndex = "1000";
        document.body.appendChild(notifContainer);
    }

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerText = message;
    notification.style.padding = "12px 16px";
    notification.style.marginBottom = "10px";
    notification.style.borderRadius = "6px";
    notification.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    notification.style.animation = "fadeIn 0.3s, fadeOut 0.3s 2.7s";
    notification.style.fontWeight = "500";

    if (type === "success") {
        notification.style.backgroundColor = "#48bb78";
        notification.style.color = "white";
    } else if (type === "error") {
        notification.style.backgroundColor = "#f56565";
        notification.style.color = "white";
    } else if (type === "info") {
        notification.style.backgroundColor = "#4299e1";
        notification.style.color = "white";
    }

    notifContainer.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
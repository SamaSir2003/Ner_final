let lines = [];
let fileName = "";
let allTagData = [];
let tagUsageCount = {}; // Store tag usage counts
let autotaglist = {};
let tagShortcuts = {};


const selectedDomain = localStorage.getItem("selectedDomain");
console.log(selectedDomain);
// console.log(JSON.parse(tag1.replace(/'/g, '"')))
var tags;
if (selectedDomain === "Gen") {
  tags = JSON.parse(tag1.replace(/'/g, '"'));
  console.log(tags, "here");
} else if(selectedDomain === "Med") {
  tags = JSON.parse(tag2.replace(/'/g, '"'));
  console.log(tags, "here");
}
else{
  tags = JSON.parse(tag3.replace(/'/g, '"'));
  console.log(tags, "here");
}
// console.log(tags, "here");

document.addEventListener("DOMContentLoaded", () => {

  showLoading();
  fetch(`/get_paragraph/?selectedDomain=${encodeURIComponent(selectedDomain)}`)
    .then((response) => response.json())
    .then((data) => {
      hideLoading();
      if (data.status === "success") {
        lines = data.paragraph.split(".");
        fileName = data.filename;
        displayAllLines();
        console.log("here", data.taglist);
        autotaglist = data.taglist;
        document.getElementById("currentFileName").innerText = data.filename;
      }
    })
    .catch((error) => {
      hideLoading();
      console.error("Error fetching paragraph:", error);
    });
  populateTagList();
});
function showLoading() {
  const sentencesContainer = document.getElementById("sentencesContainer");
  sentencesContainer.innerHTML = "";  // Clear any old content
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "loadingSpinner";
  loadingDiv.innerHTML = `
        <div class="flex justify-center items-center">
            <div class="animate-spin h-10 w-10 border-t-4 border-blue-500 border-solid rounded-full"></div>
            <span class="ml-3 text-gray-700">Loading paragraph, please wait...</span>
        </div>
    `;
  sentencesContainer.appendChild(loadingDiv);
}

function hideLoading() {
  const loadingDiv = document.getElementById("loadingSpinner");
  if (loadingDiv) {
    loadingDiv.remove();
  }
}
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "a") {
    event.preventDefault();
    assignTag();
  }
});

function populateTagList() {
  let tagListDiv = document.getElementById("tagList");
  tagListDiv.innerHTML = "";

  tags.forEach((tag) => {
    let tagDiv = document.createElement("div");
    console.log(tag);
    tagDiv.innerText = tag;
    tagDiv.value = tag;
    tagDiv.onclick = () => selectTag(tag);
    tagListDiv.appendChild(tagDiv);
  });
}

function filterTags() {
  let query = document.getElementById("tagSearch").value.toLowerCase();
  let tagListDiv = document.getElementById("tagList");
  let tagItems = tagListDiv.children;
  for (let item of tagItems) {
    item.style.display = item.innerText.toLowerCase().includes(query)
      ? "block"
      : "none";
  }
}

function selectTag(tag) {
  document.getElementById("tagSearch").value = tag;
}

function displayAllLines() {
  let sentencesContainer = document.getElementById("sentencesContainer");
  sentencesContainer.innerHTML = "";
  allTagData = [];
  lines.forEach((line, index) => {
    let words = line.trim().split(" ");
    let tagData = {};
    let sentenceDiv = document.createElement("div");
    sentenceDiv.className = "mb-4 p-2 border rounded bg-gray-100";
    sentenceDiv.dataset.index = index;

    words.forEach((word, idx) => {
      let cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
      if (cleanWord) {
        tagData[idx] = { word: cleanWord, tag: "O" };
        let wordDiv = document.createElement("div");
        wordDiv.className = "word";
        wordDiv.innerText = word;
        wordDiv.onclick = () => selectWord(wordDiv, index, idx);

        // let tagDiv = document.createElement("div");
        // tagDiv.className = "tag";
        // tagDiv.innerText = "O";
        // wordDiv.appendChild(tagDiv); // Append tag inside word

        sentenceDiv.appendChild(wordDiv);
      }
    });
    if (sentenceDiv.children.length != 0) {
      allTagData[index] = { sentence_number: index, annotations: tagData };
      sentencesContainer.appendChild(sentenceDiv);
    }

  });
}

function AutoTag() {
  console.log("here")
  let sentencesContainer = document.getElementById("sentencesContainer");
  sentencesContainer.innerHTML = ""; // Clear previous content

  Object.keys(autotaglist).forEach((sentenceIndex) => {
    let sentenceData = autotaglist[sentenceIndex];
    let sentenceDiv = document.createElement("div");
    sentenceDiv.className = "mb-4 p-2 border rounded bg-gray-100";
    sentenceDiv.dataset.index = sentenceIndex;

    let tagData = {};

    Object.keys(sentenceData.annotations).forEach((wordIndex) => {
      let wordInfo = sentenceData.annotations[wordIndex];
      let word = wordInfo.word;
      let tag = wordInfo.tag || "O";

      let wordDiv = document.createElement("div");
      wordDiv.className = "word";
      wordDiv.innerText = word;
      wordDiv.onclick = () => selectWord(wordDiv, sentenceIndex, wordIndex);
      if (tag != 'O') {
        let tagLabel = document.createElement("div");
        tagLabel.className = "tag-label";
        tagLabel.innerText = tag;
        wordDiv.appendChild(tagLabel); // Append tag inside word div
      }


      // selectedWordDiv.appendChild(tagLabel);


      sentenceDiv.appendChild(wordDiv);

      tagData[wordIndex] = { word, tag };
    });
    if (sentenceDiv.children.length != 0) {
      allTagData[sentenceIndex] = { sentence_number: sentenceIndex, annotations: tagData };
      sentencesContainer.appendChild(sentenceDiv);
    }

  });
}

function selectWord(wordDiv, sentenceIndex, wordIndex) {
  document
    .querySelectorAll(".word")
    .forEach((w) => w.classList.remove("selected"));
  wordDiv.classList.add("selected");
  wordDiv.dataset.sentenceIndex = sentenceIndex;
  wordDiv.dataset.wordIndex = wordIndex;
}

// function assignTag() {
//   let selectedWordDiv = document.querySelector(".word.selected");
//   if (!selectedWordDiv) {
//     alert("Select a word first!");
//     return;
//   }
//   let selectedTag = document.getElementById("tagSearch").value;
//   if (!tags.includes(selectedTag)) {
//     alert("Invalid tag!");
//     return;
//   }
//   let sentenceIndex = selectedWordDiv.dataset.sentenceIndex;
//   let wordIndex = selectedWordDiv.dataset.wordIndex;
//   allTagData[sentenceIndex].annotations[wordIndex].tag = selectedTag;

//   const tagColors = {
//     person: "blue",
//     location: "green",
//     object: "orange",
//     building: "brown",
//     None: "#edf2f7",
//   };

//   selectedWordDiv.style.backgroundColor = tagColors[selectedTag] || "lightblue";
//   selectedWordDiv.style.color = selectedTag === "None" ? "#2d3748" : "white";

//   tagUsageCount[selectedTag] = (tagUsageCount[selectedTag] || 0) + 1;
//   updateTopTags();
// }
function assignTag() {
  console.log(allTagData)
  let selectedWordDiv = document.querySelector(".word.selected");
  if (!selectedWordDiv) {
    showNotification("Please select a word first", "error");
    return;
  }

  let selectedTag = document.getElementById("tagSearch").value;
  if (!tags.includes(selectedTag)) {
    showNotification("Invalid tag selected", "error");
    return;
  }

  let sentenceIndex = selectedWordDiv.dataset.sentenceIndex;
  let wordIndex = selectedWordDiv.dataset.wordIndex;
  console.log("indices:", selectedWordDiv.dataset.sentenceIndex, selectedWordDiv.dataset.wordIndex)
  if (allTagData[sentenceIndex]) {
    console.log("updating tag array");
    allTagData[sentenceIndex].annotations[wordIndex].tag = selectedTag;
  }


  // Remove all tag classes first
  selectedWordDiv.classList.remove("tag-person", "tag-location", "tag-object", "tag-building", "tag-none");

  // Add the appropriate tag class
  selectedWordDiv.classList.add(`tag-${selectedTag.toLowerCase()}`);

  // Remove existing tag label if any
  let existingTagLabel = selectedWordDiv.querySelector(".tag-label");
  if (existingTagLabel) {
    tagUsageCount[existingTagLabel.innerHTML]--;
    existingTagLabel.remove();
  }

  // Create and append tag label
  let tagLabel = document.createElement("div");
  tagLabel.className = "tag-label";
  tagLabel.innerText = selectedTag;

  selectedWordDiv.appendChild(tagLabel);

  // Update tag usage statistics
  tagUsageCount[selectedTag] = (tagUsageCount[selectedTag] || 0) + 1;
  updateTopTags(selectedTag);

  // Show success notification
  showNotification(`Tagged "${selectedWordDiv.innerText}" as ${selectedTag}`, "success");

  // Auto-select next word if available
  selectNextWord(selectedWordDiv);
}

// Helper function to show notifications
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
  }

  notifContainer.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Function to automatically select the next word
function selectNextWord(currentWordDiv) {
  const words = Array.from(document.querySelectorAll(".word"));
  const currentIndex = words.indexOf(currentWordDiv);

  if (currentIndex < words.length - 1) {
    currentWordDiv.classList.remove("selected");
    if (words[currentIndex + 1]) {
      words[currentIndex + 1].classList.add("selected");
      words[currentIndex + 1].scrollIntoView({ behavior: "smooth", block: "center" });
    }
    document.querySelector(".word.selected").click();
    console.log(document.querySelector(".word.selected"))
  }
}

// Improved function to update top tags display
// function updateTopTags() {
//   const topTagsList = document.getElementById("topTagsList");
//   topTagsList.innerHTML = "";

//   // Get tags sorted by usage count
//   const sortedTags = Object.entries(tagUsageCount)
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 5);

//   const tagColors = {
//     person: "#4299e1",
//     location: "#48bb78",
//     object: "#ed8936",
//     building: "#a0522d",
//     None: "#edf2f7"
//   };
//   let index = 0;
//   sortedTags.forEach(([tag, count]) => {

//     const tagItem = document.createElement("div");
//     tagItem.className = "top-tag-item";
//     tagShortcuts[index + 1] = tag;
//     index++;
//     console.log(tag);


//     console.log("here", tagShortcuts);
//     const tagName = document.createElement("span");
//     tagName.className = "top-tag-name";
//     tagName.innerText = tag;
//     tagName.style.backgroundColor = tagColors[tag.toLowerCase()] || "#718096";
//     tagName.style.color = tag.toLowerCase() === "none" ? "#2d3748" : "white";

//     const tagCount = document.createElement("span");
//     tagCount.className = "top-tag-count";
//     tagCount.innerText = count;

//     tagItem.appendChild(tagName);
//     tagItem.appendChild(tagCount);
//     topTagsList.appendChild(tagItem);
//   });
// }
let topTags = []; // Stores top 5 tags as [tag, count]
let topTagsSet = new Set(); // Fast lookup of top tags
// let tagUsageCount = {}; // Tracks count of all tags

function updateTopTags(tag) {
  const topTagsList = document.getElementById("topTagsList");

  // If tag is already in topTags, just update the UI
  if (topTagsSet.has(tag)) {
    for (let i = 0; i < topTags.length; i++) {
      topTags[i][1] = tagUsageCount[topTags[i][0]]; // Update count
    }
    renderTopTags();
    console.log("inside has tag");
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
      console.log("checkpt:", lowestIndex, topTags[lowestIndex]);
      // topTagsSet.delete(topTags[lowestIndex]);
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

function renderTopTags() {
  const topTagsList = document.getElementById("topTagsList");
  topTagsList.innerHTML = "";

  const tagColors = {
    person: "#4299e1",
    location: "#48bb78",
    object: "#ed8936",
    building: "#a0522d",
    None: "#edf2f7"
  };

  let index = 0;
  topTags.forEach(([tag, count]) => {
    const tagItem = document.createElement("div");
    tagItem.className = "top-tag-item";
    tagShortcuts[index + 1] = tag;
    index++;

    const tagName = document.createElement("span");
    tagName.className = "top-tag-name";
    tagName.innerText = tag;
    console.log(tag);
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
document.addEventListener("keydown", function (event) {
  let num = event.key;
  if (num >= "1" && num <= "5" && tagShortcuts[num]) {
    document.getElementById("tagSearch").value = tagShortcuts[num];
    assignTag();
  }
  // console.log(tagShortcuts[num]);
});

// function submitFile() {
//   let formattedTagData = allTagData.map((sentenceData) => {
//     let annotations = {};
//     Object.values(sentenceData.annotations).forEach(({ word, tag }) => {
//       annotations[word] = tag;
//     });
//     return { sentence_number: sentenceData.sentence_number, annotations };
//   });
//   console.log("here", formattedTagData);
//   let payload = {
//     filename: fileName,
//     data: formattedTagData,
//   };
//   fetch("/submit_file/", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       alert(data.message);
//       location.reload();
//     });
// }
function showDialog() {
  document.getElementById('emptyLinesDialog').style.display = 'block';
  document.getElementById('dialogOverlay').style.display = 'block';
}

function hideDialog() {
  document.getElementById('emptyLinesDialog').style.display = 'none';
  document.getElementById('dialogOverlay').style.display = 'none';
}

function submitFile() {
  let emptyLines = {};
  let allTagDataArray = Object.values(allTagData);
  console.log("sentence data:", allTagDataArray);
  allTagDataArray.forEach((sentenceData) => {
    let allOTags = Object.values(sentenceData.annotations).every(({ tag }) => tag === 'O');
    console.log("annotations:", sentenceData["annotations"]);
    if (allOTags && Object.keys(sentenceData.annotations).length > 0) {
      emptyLines[sentenceData.sentence_number] = sentenceData;
    }
    console.log("empty lines:", emptyLines);
  });
  // allTagDataArray.forEach((sentenceData) => {
  //   let annotations = sentenceData.annotations || {};

  //   // Skip if there are no annotations
  //   if (Object.keys(annotations).length === 0) return;

  //   // Check if all tags are 'O'
  //   let allOTags = Object.values(annotations).every(({ tag }) => tag === 'O');

  //   console.log("annotations:", annotations);

  //   if (allOTags) {
  //     emptyLines[sentenceData.sentence_number] = sentenceData;
  //   }

  //   console.log("empty lines:", emptyLines);
  // });

  if (Object.keys(emptyLines).length > 0) {
    showDialog();

    // Attach click handlers for dialog buttons
    document.getElementById('cancelBtn').onclick = () => {
      hideDialog();
      console.log("Submission cancelled.");
    };

    document.getElementById('submitAnywaysBtn').onclick = () => {
      hideDialog();

      submitData(allTagDataArray);  // submit everything (including empty lines)
    };

    document.getElementById('saveForLaterBtn').onclick = () => {
      hideDialog();
      let filteredData = allTagDataArray.filter(sentenceData => !emptyLines[sentenceData.sentence_number]);
      submitData(filteredData, emptyLines);  // Pass non-empty data and empty lines (remainingData)
    };
    allTagData = {};
  } else {
    // No empty lines, proceed with normal submission
    submitData(allTagDataArray);
    allTagData = {};
  }
}
// 1. Get CSRF token from cookies (works in standalone .js files)
function getCSRFToken() {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue;
}

// 2. Setup heartbeat with error handling and cleanup
let heartbeatInterval;

function startHeartbeat() {
  const currentFileElement = document.getElementById("currentFileName");
  if (!currentFileElement) return; // Exit if no file is loaded

  heartbeatInterval = setInterval(() => {
    fetch('/heartbeat/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken() // Dynamic token
      },
      body: JSON.stringify({
        current_file: currentFileElement.innerText,
        category: selectedDomain
      })
    })
      .then(response => {
        if (!response.ok) {
          console.error('Heartbeat failed:', response.status);
        }
      })
      .catch(error => {
        console.error('Heartbeat error:', error);
      });
  }, 120000); // 2 minutes
}

// Start when page loads
document.addEventListener('DOMContentLoaded', startHeartbeat);

// Cleanup when user leaves
window.addEventListener('beforeunload', () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
});

function submitData(tagDataArray, remainingData = null) {
  let formattedTagData = tagDataArray.map((sentenceData) => {
    let annotations = {};
    Object.values(sentenceData.annotations).forEach(({ word, tag }) => {
      annotations[word] = tag;
    });
    return { sentence_number: sentenceData.sentence_number, annotations };
  });

  let formattedTagDataauto = allTagData.map((sentenceData) => {
    let annotations = {};
    Object.values(sentenceData.annotations).forEach(({ word, tag }) => {
      annotations[word] = tag;
    });
    return { sentence_number: sentenceData.sentence_number, annotations };
  });

  let payload = {
    filename: fileName,
    data: formattedTagData,
    domain: selectedDomain,
    autotaglist: formattedTagDataauto
  };

  if (remainingData) {
    payload.remainingData = remainingData;
    console.log("rem data:", remainingData);
  }

  fetch("/submit_file/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((data) => {
      alert(data.message);  // Optional, replace with your preferred success handling
      location.reload();
    })
    .catch((err) => {
      console.error("Submission failed", err);
    });
}
function skipFile() {
  const currentFileName = document.getElementById("currentFileName").innerText;
  showLoading();
  fetch(`/skip_file/?currentFileName=${encodeURIComponent(currentFileName)}&selectedDomain=${encodeURIComponent(selectedDomain)}`, {
    method: "GET",
  })

    .then((response) => response.json())
    .then((data) => {

      hideLoading();
      if (data.status === "success") {
        // Update the lines array and current file
        lines = data.paragraph.split(".");
        fileName = data.filename;
        console.log("here", data.taglist);
        autotaglist = data.taglist;
        displayAllLines();
        document.getElementById("currentFileName").innerText = data.filename;
      } else {
        let sentencesContainer = document.getElementById("sentencesContainer");
        sentencesContainer.innerHTML = `
    <div style="
        background-color: #ffcccc; 
        color: #a94442; 
        border: 1px solid #ebccd1; 
        padding: 15px; 
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 10px;
        ">
        Last file reached, please press 
        <button style="
            background-color: #12b886; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            font-size: 14px;
            border-radius: 5px;
            cursor: pointer;
        " onclick="skipFile()">Skip</button>
        to go to the first file again!
    </div>
`;
        document.getElementById("currentFileName").innerText = "!404";
        // alert("no more files");
      }
    })
    .catch((error) => {
      hideLoading();
      console.error("Error skipping file:", error);
      document.getElementById("paraContent").innerText = "Failed to skip file.";
    });
}

var autotaglist = {};
// function getTextFromTextarea() {
//     const textarea = document.querySelector('textarea');
//     const text = textarea.value.trim();
//     return text;
// }
const inputText = document.getElementById('inputText');

// Get text from contenteditable (when needed)
function getTextFromTextarea() {
    return inputText.innerText;
}

function autoTag() {
    var txt = getTextFromTextarea();
    let payload = {
        texttotag: txt
    };
    console.log(txt);
    fetch("/auto_tag/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
        .then((response) => response.json())
        .then((data) => {
            alert("tagged successfully");  // Optional, replace with your preferred success handling
            console.log("here", data.taglist);
            autotaglist = data.taglist;
            let sentencesContainer = document.getElementById("inputText");
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

                // allTagData[sentenceIndex] = { sentence_number: sentenceIndex, annotations: tagData };
                sentencesContainer.appendChild(sentenceDiv);
            });
        })
        .catch((err) => {
            console.error("Submission failed", err);
        });
}

function downloadExcel() {
    let data = [];
    if (Object.keys(annotationsData).length === 0) {
        alert("Excel is empty, nothing to download");
        return;
    }
    // Convert JSON to array format for Excel
    Object.values(autotaglist).forEach(sentence => {
        let sentenceNumber = sentence.sentence_number;

        Object.values(sentence.annotations).forEach(annotation => {
            data.push({
                "Sentence Number": sentenceNumber,
                "Word": annotation.word,
                "Tag": annotation.tag
            });
        });
    });

    // Convert array to worksheet
    let worksheet = XLSX.utils.json_to_sheet(data);

    // Create a new workbook
    let workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Annotations");

    // Download the file
    XLSX.writeFile(workbook, "annotations.xlsx");
}
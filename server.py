from fastapi import FastAPI,Body
from pydantic import BaseModel
from datasets import Dataset
from transformers import Trainer, TrainingArguments
from dataclasses import dataclass
import pandas as pd
from typing import Any, Dict, List
from transformers import BertTokenizerFast, BertForTokenClassification,Trainer, TrainingArguments,DataCollatorForTokenClassification
import torch

# Load Model and Tokenizer
model_path = r"D:/ner_model2"  # Adjust the path if necessary
model = BertForTokenClassification.from_pretrained(model_path)
tokenizer = BertTokenizerFast.from_pretrained(model_path)
model.eval()

# Tag Mapping
id2tag = {
    0: 'B-LOC', 1: 'B-MISC', 2: 'B-ORG', 3: 'B-PER',
    4: 'I-LOC', 5: 'I-MISC', 6: 'I-ORG', 7: 'I-PER',
    8: 'O', 9: 'nan'
}
tag2id = {v: k for k, v in id2tag.items()}

# FastAPI App
app = FastAPI()

# Request Model
class ParagraphRequest(BaseModel):
    paragraph: str

@app.post("/predict")
def predict(request: ParagraphRequest):
    """Processes a paragraph and returns NER tags in allTagData format."""
    lines = request.paragraph.split(".")  # Split paragraph into lines
    allTagData = {}

    for index, line in enumerate(lines):
        words = line.strip().split()
        tokens = tokenizer(words, truncation=True, is_split_into_words=True, return_tensors="pt")

        with torch.no_grad():
            outputs = model(**tokens)

        predictions = torch.argmax(outputs.logits, dim=-1).squeeze().tolist()
        word_ids = tokens.word_ids()

        tagData = {}
        previous_word_idx = None

        for word_idx, pred in zip(word_ids, predictions):
            if word_idx is not None and word_idx != previous_word_idx:
                tagData[word_idx] = {
                    "word": words[word_idx],
                    "tag": id2tag.get(pred, "O")
                }
            previous_word_idx = word_idx

        allTagData[index] = {
            "sentence_number": index,
            "annotations": tagData
        }

    return allTagData

#tokenize and align labels 
def tokenize_and_align_labels(examples):
    # Tokenize the input words
    tokenized_inputs = tokenizer(
        examples['Words'],
        is_split_into_words=True,
        padding='max_length',
        truncation=True,
    )

    labels = []
    for i, words in enumerate(examples['Words']):
        word_ids = tokenized_inputs.word_ids(batch_index=i)
        label_ids = []
        for word_id in word_ids:
            if word_id is None:
                label_ids.append(-100)  # Special token
            else:
                label_ids.append(tag2id.get(examples['Tags'][i][word_id], -100))
        labels.append(label_ids)

    # Include the labels in the tokenized inputs
    tokenized_inputs['labels'] = labels
    return tokenized_inputs



# Update model function
@app.post("/learn")
async def update_model_with_incremental_data(ann: list = Body(...), autotaglist: list = Body(...)):
    try:
        # Prepare training data
        incremental_train_data = get_updated_sentences(ann, autotaglist)

        if incremental_train_data.empty:
            return {"message": "No updated data to train on."}

        # Create dataset and tokenize
        incremental_dataset = Dataset.from_pandas(incremental_train_data)
        tokenized_incremental_dataset = incremental_dataset.map(
            tokenize_and_align_labels, batched=True
        )

        # Training arguments with unused columns allowed
        incremental_training_args = TrainingArguments(
            output_dir='./results_incremental',
            learning_rate=5e-4,
            per_device_train_batch_size=8,
            num_train_epochs=1,
            weight_decay=0.01,
            logging_steps=10,
            remove_unused_columns=False  # Ensures the trainer uses all columns
        )

        # Trainer setup
        incremental_trainer = Trainer(
            model=model,
            args=incremental_training_args,
            train_dataset=tokenized_incremental_dataset,
            data_collator=DataCollatorForTokenClassification(tokenizer),
        )

        # Train the model
        incremental_trainer.train()

        # Save the model
        model.save_pretrained(model_path)
        tokenizer.save_pretrained(model_path)

        return {"message": "Model updated successfully."}

    except Exception as e:
        return {"message": f"Model update failed: {str(e)}"}


# Function to get updated sentences
def get_updated_sentences(ann, autotaglist):
    updated_sentences = []

    for ini_sentence, fin_sentence in zip(ann, autotaglist):
        annotations_ini = ini_sentence["annotations"]
        annotations_fin = fin_sentence["annotations"]

        modified = False
        words, tags = [], []

        for word, fin_tag in annotations_fin.items():
            ini_tag = annotations_ini.get(word, 'O')
            if fin_tag != ini_tag:
                modified = True
            words.append(word)
            tags.append(fin_tag)

        if modified:
            updated_sentences.append({"Words": words, "Tags": tags})

    return pd.DataFrame(updated_sentences)


# Root Route
@app.get("/")
def home():
    return {"message": "NER API is running"}

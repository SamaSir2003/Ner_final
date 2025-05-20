# ✅ Step 1: Install required packages
#!pip install datasets seqeval scikit-learn evaluate
# ✅ Step 3: Load dataset
from datasets import load_dataset

dataset = load_dataset("nlpaueb/finer-139")

from collections import Counter
from itertools import chain

# Count all label IDs in the training set
all_train_labels = list(chain(*dataset["train"]["ner_tags"]))
label_counts = Counter(all_train_labels)

# Define threshold (e.g., keep only tags with >=10 occurrences)
THRESHOLD = 10
rare_label_ids = {label_id for label_id, count in label_counts.items() if count < THRESHOLD}

# Replace rare label IDs with "O" (which is label_id = 0)
def replace_rare_labels(example):
    example["ner_tags"] = [0 if tag in rare_label_ids else tag for tag in example["ner_tags"]]
    return example

# Apply to all splits (especially train, val, test)
dataset["train"] = dataset["train"].map(replace_rare_labels).shuffle(seed=42).select(range(100000))
dataset["validation"] = dataset["validation"].map(replace_rare_labels).shuffle(seed=42).select(range(15000))
dataset["test"] = dataset["test"].map(replace_rare_labels).shuffle(seed=42).select(range(15000))

label_list = dataset["train"].features["ner_tags"].feature.names
label_to_id = {l: i for i, l in enumerate(label_list)}
id_to_label = {i: l for i, l in enumerate(label_list)}

# ✅ Step 4: Load tokenizer and model
from transformers import AutoTokenizer, AutoModelForTokenClassification

model_name = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name, model_max_length=512)
model = AutoModelForTokenClassification.from_pretrained(model_name, num_labels=len(label_list))

# ✅ Step 5: Tokenization and alignment
def tokenize_and_align_labels(examples):
    tokenized_inputs = tokenizer(
        examples["tokens"],
        truncation=True,
        is_split_into_words=True,
        max_length=512,
        padding="max_length"
    )
    labels = []
    for i, label in enumerate(examples["ner_tags"]):
        word_ids = tokenized_inputs.word_ids(batch_index=i)
        previous_word_idx = None
        label_ids = []
        for word_idx in word_ids:
            if word_idx is None:
                label_ids.append(-100)
            elif word_idx != previous_word_idx:
                label_ids.append(label[word_idx] if word_idx < len(label) else -100)
            else:
                label_ids.append(-100)
            previous_word_idx = word_idx
        label_ids += [-100] * (512 - len(label_ids)) if len(label_ids) < 512 else []
        label_ids = label_ids[:512]
        labels.append(label_ids)
    tokenized_inputs["labels"] = labels
    return tokenized_inputs

tokenized_train = dataset["train"].map(tokenize_and_align_labels, batched=True)
tokenized_val = dataset["validation"].map(tokenize_and_align_labels, batched=True)
tokenized_test = dataset["test"].map(tokenize_and_align_labels, batched=True)

# ✅ Step 6: Data collator
from transformers import DataCollatorForTokenClassification
data_collator = DataCollatorForTokenClassification(tokenizer)

# ✅ Step 7: Define metrics
import evaluate
seqeval = evaluate.load("seqeval")

def compute_metrics(p):
    predictions, labels = p
    predictions = predictions.argmax(axis=-1)
    true_labels = [[id_to_label[l] for l in label if l != -100] for label in labels]
    true_preds = [[id_to_label[p] for p, l in zip(pred, label) if l != -100]
                  for pred, label in zip(predictions, labels)]
    return seqeval.compute(predictions=true_preds, references=true_labels)

# ✅ Step 8: Training setup
from transformers import TrainingArguments, Trainer

training_args = TrainingArguments(
    output_dir="./distilbert-finner-ner",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=5e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=3,
    fp16=True,
    report_to="none",
    logging_steps=100,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_val,
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

# ✅ Step 9: Train the model
trainer.train()

# ✅ Step 10: Save final model and tokenizer
trainer.save_model("./distilbert-finner-ner")
tokenizer.save_pretrained("./distilbert-finner-ner")

# ✅ Step 11: Evaluate
from sklearn.metrics import classification_report

predictions, labels, _ = trainer.predict(tokenized_val)
predicted_label_ids = predictions.argmax(axis=-1)

true_labels = [
    [id_to_label[label] for label in sent if label != -100]
    for sent in labels
]
true_preds = [
    [id_to_label[p] for (p, l) in zip(pred, sent) if l != -100]
    for pred, sent in zip(predicted_label_ids, labels)
]

flat_preds = [p for sent in true_preds for p in sent]
flat_labels = [l for sent in true_labels for l in sent]

print("📊 Classification Report (Validation Set):")
print(classification_report(flat_labels, flat_preds, digits=4))

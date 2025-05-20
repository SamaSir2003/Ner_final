# import json
# import pandas as pd
# import re

# def get_tagged_words(annotations, is_first_example):
#     tag_map = []
#     for i, ann in enumerate(annotations):
#         if is_first_example and i < 2:
#             start = ann["start"] - 1
#             end = ann["end"] - 1
#         else:
#             start = ann["start"]
#             end = ann["end"]
#         tag_map.append({
#             "start": start,
#             "end": end,
#             "tag": ann["tag_name"]
#         })
#     return tag_map

# def annotate_words(text, tag_map):
#     rows = []
#     sentences = text.split(".")
#     sentence_start = 0
#     sentence_no = 1

#     for sentence in sentences:
#         sentence = sentence.strip()
#         if not sentence:
#             sentence_start += 1  # for the dot
#             continue

#         for match in re.finditer(r'\S+', sentence):  # all non-space chunks
#             word = match.group()
#             start_offset = sentence_start + match.start()
#             end_offset = sentence_start + match.end()

#             tag = "O"
#             for ann in tag_map:
#                 # Check for overlap instead of strict containment
#                 if not (end_offset <= ann["start"] or start_offset >= ann["end"]):
#                     tag = ann["tag"]
#                     break

#             rows.append({
#                 "sentence_no": sentence_no,
#                 "word": word,
#                 "tag": tag
#             })

#         sentence_start += len(sentence) + 1  # +1 for the period
#         sentence_no += 1

#     return rows

# def json_to_excel(json_path, output_path):
#     with open(json_path, "r", encoding="utf-8") as f:
#         data = json.load(f)

#     all_rows = []
#     for i, example in enumerate(data["examples"]):
#         text = example["content"]
#         annotations = example.get("annotations", [])
#         tag_map = get_tagged_words(annotations, is_first_example=(i == 0))
#         rows = annotate_words(text, tag_map)
#         all_rows.extend(rows)

#     df = pd.DataFrame(all_rows)
#     df.to_excel(output_path, index=False)

# # Usage

# json_to_excel("C:/Users/Vaivaswatha/Downloads/covid ner/Corona2.json", "C:/Users/Vaivaswatha/Downloads/covid ner/ner_annotations3.xlsx")
# Use a pipeline as a high-level helper
['B-Entity', 'B-Event', 'I-Entity', 'I-Event', 'O']
{'B-Entity': 0, 'B-Event': 1, 'I-Entity': 2, 'I-Event': 3, 'O': 4}

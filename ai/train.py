import argparse
import random
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
import torch
from datasets import Dataset, Features, Sequence as DatasetSequence, Value, load_dataset
from sklearn.metrics import fbeta_score, recall_score
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

DEFAULT_MODEL = "nlpaueb/legal-bert-base-uncased"
DEFAULT_OUTPUT_DIR = "/models/legal-bert"
SEED = 42


def get_label_names(dataset: Any) -> list[str]:
    feature = dataset["train"].features["labels"]
    if hasattr(feature, "feature") and hasattr(feature.feature, "names"):
        return list(feature.feature.names)
    if hasattr(feature, "names"):
        return list(feature.names)
    raise ValueError("The dataset's labels feature does not provide class names.")


def normalize_label_ids(value: Any, label_names: list[str], is_sequence_class_label: bool) -> set[int]:
    if value is None:
        return set()
    values = value if isinstance(value, (list, tuple, np.ndarray)) else [value]
    if not values:
        return set()
    if all(isinstance(item, str) for item in values):
        label_to_id = {name.casefold(): index for index, name in enumerate(label_names)}
        unknown = [item for item in values if item.casefold() not in label_to_id]
        if unknown:
            raise ValueError(f"Unknown dataset labels: {unknown}")
        return {label_to_id[item.casefold()] for item in values}
    if not is_sequence_class_label and len(values) == len(label_names) and all(
        item in (0, 1, False, True) for item in values
    ):
        return {index for index, value in enumerate(values) if value}
    result = {int(item) for item in values}
    if any(index < 0 or index >= len(label_names) for index in result):
        raise ValueError(f"Dataset label IDs must be between 0 and {len(label_names) - 1}.")
    return result


def build_records(dataset: Any, label_names: list[str]) -> list[dict[str, Any]]:
    feature = dataset["train"].features["labels"]
    is_sequence_class_label = hasattr(feature, "feature") and hasattr(feature.feature, "names")
    grouped_labels: dict[str, set[int]] = defaultdict(set)
    texts: dict[str, str] = {}

    for split in dataset.values():
        for row in split:
            text = re.sub(r"\s+", " ", str(row["text"])).strip()
            if not text:
                continue
            grouped_labels[text].update(
                normalize_label_ids(row["labels"], label_names, is_sequence_class_label)
            )
            texts[text] = text

    return [
        {
            "text": text,
            "labels": [float(index in grouped_labels[text]) for index in range(len(label_names))],
        }
        for text in texts
    ]


def calculate_metrics(prediction: Any) -> dict[str, float]:
    logits, labels = prediction
    probabilities = 1.0 / (1.0 + np.exp(-logits))
    predicted = probabilities >= 0.5
    return {
        "recall": float(recall_score(labels, predicted, average="macro", zero_division=0)),
        "f2": float(fbeta_score(labels, predicted, beta=2, average="macro", zero_division=0)),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune Legal-BERT on the LexGLUE UNFAIR-ToS dataset.")
    parser.add_argument("--model-name", default=DEFAULT_MODEL)
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=256)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(SEED)
        torch.backends.cudnn.benchmark = True

    print("Loading the LexGLUE UNFAIR-ToS dataset...")
    source = load_dataset("coastalcph/lex_glue", "unfair_tos")
    label_names = get_label_names(source)
    records = build_records(source, label_names)
    if len(records) < 10:
        raise ValueError(f"Expected at least 10 labeled examples; found {len(records)}.")

    features = Features(
        {
            "text": Value("string"),
            "labels": DatasetSequence(Value("float32")),
        }
    )
    all_examples = Dataset.from_list(records, features=features).shuffle(seed=SEED)
    train_test = all_examples.train_test_split(test_size=0.2, seed=SEED)
    validation_test = train_test["test"].train_test_split(test_size=0.5, seed=SEED)
    splits = {
        "train": train_test["train"],
        "validation": validation_test["train"],
        "test": validation_test["test"],
    }
    total = len(all_examples)
    print(
        "Deterministic split sizes: "
        f"train={len(splits['train'])} ({len(splits['train']) / total:.1%}), "
        f"validation={len(splits['validation'])} ({len(splits['validation']) / total:.1%}), "
        f"test={len(splits['test'])} ({len(splits['test']) / total:.1%})"
    )
    print(f"Unique sentence/clause examples: {total}; labels: {', '.join(label_names)}")

    tokenizer = AutoTokenizer.from_pretrained(args.model_name)

    def tokenize_batch(batch: dict[str, list[Any]]) -> dict[str, Any]:
        return tokenizer(batch["text"], truncation=True, max_length=args.max_length)

    tokenized = {
        name: split.map(
            tokenize_batch,
            batched=True,
            remove_columns=["text"],
            desc=f"Tokenizing {name} split",
        )
        for name, split in splits.items()
    }
    id2label = {index: label for index, label in enumerate(label_names)}
    label2id = {label: index for index, label in id2label.items()}
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name,
        num_labels=len(label_names),
        problem_type="multi_label_classification",
        id2label=id2label,
        label2id=label2id,
    )

    use_cuda = torch.cuda.is_available()
    use_bf16 = use_cuda and torch.cuda.is_bf16_supported()
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=2e-5,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_f2",
        greater_is_better=True,
        save_total_limit=2,
        logging_steps=25,
        report_to="none",
        fp16=use_cuda and not use_bf16,
        bf16=use_bf16,
        gradient_checkpointing=True,
        dataloader_pin_memory=use_cuda,
        seed=SEED,
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=calculate_metrics,
    )
    trainer.train()
    metrics = trainer.evaluate(tokenized["test"], metric_key_prefix="test")
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    print(f"Test recall (macro): {metrics['test_recall']:.4f}")
    print(f"Test F2-score (macro): {metrics['test_f2']:.4f}")
    print(f"Fine-tuned checkpoint saved to {output_dir}")


if __name__ == "__main__":
    main()

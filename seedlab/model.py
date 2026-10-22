"""Optional local open-weight model; no hosted inference API and no API key."""
from dataclasses import asdict
import json
import os
from pathlib import Path
import sys

from seedlab.core import Policy, parse_model_output

MODEL_ID = "Qwen/Qwen2.5-Coder-0.5B-Instruct"


def propose(parent: Policy, generation: int) -> dict:
    # This module is a child process with an allowlisted environment and timeout.
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, set_seed

    torch.set_num_threads(2)
    set_seed(generation)
    revision = os.environ.get("SEED_MODEL_REVISION", "main")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, revision=revision, trust_remote_code=False)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID, revision=revision, trust_remote_code=False, use_safetensors=True,
        torch_dtype=torch.float32,
    )
    messages = [
        {"role": "system", "content": "You optimize a task-scheduling policy in a simulation. Output only valid JSON with four numeric fields. Never output code, prose, tool calls or additional fields."},
        {"role": "user", "content": (
            "Tasks have value, arrival, deadline and effort. Hourly budget is 8; tasks expire. "
            "Task priority = (value_weight * value + urgency_weight * 10 / hours_until_deadline "
            "+ age_weight * age_in_hours / 8) / effort**effort_power. "
            "Maximize total completed value. Suggest one improvement to: " + json.dumps(asdict(parent)) +
            '. Fields value_weight, urgency_weight, age_weight must be 0..8; effort_power must be 0..2. '
            'Return exactly {"value_weight":number,"urgency_weight":number,"age_weight":number,"effort_power":number}.'
        )},
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt")
    with torch.inference_mode():
        output = model.generate(**inputs, max_new_tokens=160, do_sample=True, temperature=0.6,
                                top_p=0.9, pad_token_id=tokenizer.eos_token_id)
    response = tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    policy = parse_model_output(response)
    return {"policy": asdict(policy), "model": MODEL_ID,
            "revision": getattr(model.config, "_commit_hash", revision)}


if __name__ == "__main__":
    request = json.loads(Path(sys.argv[1]).read_text())
    result = propose(Policy.parse(request["policy"]), request["generation"])
    Path(sys.argv[2]).write_text(json.dumps(result), encoding="utf-8")

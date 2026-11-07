import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.inference import load_model
from app import inference


def main() -> None:
    load_model()
    model = inference.model
    if model is None:
        raise RuntimeError("load_model() did not initialize the model")

    base_name = model.base_model.model.config._name_or_path
    peft_config = model.peft_config
    default_config = peft_config["default"]
    trainable, total = model.get_nb_trainable_parameters()
    adapter_parameters = sum(
        parameter.numel()
        for name, parameter in model.named_parameters()
        if "lora_" in name
    )

    print(f"model_type={type(model).__name__}")
    print(f"base_model_name={base_name}")
    print(f"peft_config_keys={list(peft_config.keys())}")
    print(f"r={default_config.r}")
    print(f"alpha={default_config.lora_alpha}")
    print(f"trainable_parameters={trainable}")
    print(f"adapter_parameters={adapter_parameters}")
    print(f"total_parameters={total}")
    print(f"trainable_percentage={trainable / total * 100:.2f}%")

    try:
        assert default_config.base_model_name_or_path == "openai/whisper-small"
    except AssertionError:
        print("FAIL: adapter base model is not openai/whisper-small")
    else:
        print("PASS: adapter base model is openai/whisper-small")


if __name__ == "__main__":
    main()

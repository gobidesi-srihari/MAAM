import json
from pathlib import Path


CATALOG_PATH = (
    Path(__file__).resolve().parent
    / "config"
    / "transformer_test_parameters.json"
)


def load_test_catalog():
    with CATALOG_PATH.open(encoding="utf-8") as catalog_file:
        return json.load(catalog_file)


def get_test_parameter(parameter_key: str):
    for parameter in load_test_catalog()["parameters"]:
        if parameter["key"] == parameter_key:
            return parameter
    return None

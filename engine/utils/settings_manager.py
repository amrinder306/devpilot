import json, os, platform
from pathlib import Path
from typing import Any, Dict, Tuple

SCHEMA_VERSION = 1

def _app_config_dir() -> Path:
    sys = platform.system().lower()
    if "windows" in sys:
        base = os.environ.get("APPDATA") or str(Path.home() / "AppData/Roaming")
        return Path(base) / "DevPilot"
    if "darwin" in sys:
        return Path.home() / "Library/Application Support/DevPilot"
    return Path(os.environ.get("XDG_CONFIG_HOME") or (Path.home() / ".config")) / "devpilot"

def settings_paths() -> Tuple[Path, Path, Path]:
    """return (settings.json, backup1, backup2)"""
    d = _app_config_dir()
    d.mkdir(parents=True, exist_ok=True)
    return d / "settings.json", d / "settings.json.bak", d / "settings.json.bak2"

def load_settings(defaults: Dict[str, Any]) -> Dict[str, Any]:
    path, bak1, bak2 = settings_paths()
    def _merge(src: Dict[str, Any], dst: Dict[str, Any]):
        for k, v in src.items():
            if isinstance(v, dict) and isinstance(dst.get(k), dict):
                _merge(v, dst[k])
            else:
                dst[k] = v
        return dst
    try:
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            if data.get("_schema") != SCHEMA_VERSION:
                # naive migrate -> attach _schema and shallow-merge into defaults
                data["_schema"] = SCHEMA_VERSION
            merged = _merge(data, defaults.copy())
            merged["_schema"] = SCHEMA_VERSION
            return merged
    except Exception:
        # leave a marker file for debugging
        bad = path.with_suffix(".bad.json")
        try: path.rename(bad)
        except: pass
    # no settings or failed -> return defaults with schema
    d = defaults.copy()
    d["_schema"] = SCHEMA_VERSION
    return d

def save_settings(settings: Dict[str, Any]) -> None:
    path, bak1, bak2 = settings_paths()
    # rotate backups
    if bak1.exists():
        if bak2.exists():
            bak2.unlink(missing_ok=True)  # type: ignore
        bak1.rename(bak2)
    if path.exists():
        path.rename(bak1)
    settings["_schema"] = SCHEMA_VERSION
    path.write_text(json.dumps(settings, indent=2), encoding="utf-8")

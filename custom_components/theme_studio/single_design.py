"""Lossless adapters for independent designs; no palette generation."""
from copy import deepcopy
from hashlib import sha256


def select_design(settings, mode):
    if mode not in ("light", "dark"):
        raise ValueError("Invalid design mode")
    palette = deepcopy(settings[mode])
    return {"mode": mode, "light": palette, "dark": deepcopy(palette),
            "effects": deepcopy(settings["effects"])}


def split_profiles(profiles):
    """Stable IDs; originals remain untouched until an explicit storage write."""
    result = []
    reserved = {p["id"] for p in profiles}
    for profile in profiles:
        if profile["settings"].get("mode") in ("light", "dark"):
            result.append(deepcopy(profile))
            continue
        for mode, suffix in (("dark", "Dunkel"), ("light", "Hell")):
            item = deepcopy(profile)
            if mode == "light":
                salt = 0
                while True:
                    candidate = sha256(f'{profile["id"]}:light:{salt}'.encode()).hexdigest()[:32]
                    if candidate not in reserved:
                        break
                    salt += 1
                item["id"] = candidate
                reserved.add(candidate)
            item["name"] = profile["name"][:38].rstrip() + " – " + suffix
            item["settings"] = select_design(profile["settings"], mode)
            result.append(item)
    return sorted(result, key=lambda p: p["name"].casefold())

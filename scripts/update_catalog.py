#!/usr/bin/env python3
"""Actualiza el catálogo a partir de la publicación oficial de horarios DAE."""
import base64, datetime as dt, gzip, hashlib, html, json, re, sys
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

SOURCE = "https://dae.ing.uc.edu.ve/horarios/"
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CATALOG = DATA / "courses.json.gz.b64"
META = DATA / "meta.json"
CHANGELOG = DATA / "changes.json"
SLOT = re.compile(r"\b(LU|MA|MI|JU|VI|SA|DO)(0800|0850|0940|1030|1120|1210|1300|1350|1440|1530|1620|1710|1800|1850|1940)\s+([A-Z0-9]+)\b")
HEADER = re.compile(r"^([A-Z][A-Z0-9]{3,7})\s+(.+?)\s+(\d{2})(?:\s+PROF\.\s*(.*?))?(?:\s+\((CERRADA|NUEVA)\))?$", re.I)

def fetch_text():
    headers = {"User-Agent": "Mozilla/5.0 (compatible; UCHorariosBot/1.0)"}
    response = requests.get(SOURCE, headers=headers, timeout=45)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or response.encoding
    soup = BeautifulSoup(response.text, "html.parser")
    text = soup.get_text("\n", strip=True)
    if len(SLOT.findall(text)) >= 100:
        return text, response.url

    # Respaldo para versiones de la página que enlazan o incrustan un PDF.
    urls = []
    for tag, attr in (("a", "href"), ("iframe", "src"), ("embed", "src"), ("object", "data")):
        for node in soup.find_all(tag):
            value = node.get(attr)
            if value:
                url = urljoin(response.url, value)
                if ".pdf" in urlparse(url).path.lower() or "pdf" in url.lower():
                    urls.append(url)
    for url in urls:
        pdf = requests.get(url, headers=headers, timeout=60)
        pdf.raise_for_status()
        try:
            import fitz
            doc = fitz.open(stream=pdf.content, filetype="pdf")
            candidate = "\n".join(page.get_text("text") for page in doc)
            if len(SLOT.findall(candidate)) >= 100:
                return candidate, url
        except Exception as exc:
            print(f"No se pudo leer PDF {url}: {exc}", file=sys.stderr)
    return text, response.url

def parse_header(line, curriculum):
    line = " ".join(html.unescape(line).replace("\xa0", " ").split())
    # Los bloques horarios pueden venir en la misma línea del encabezado.
    line_without_slots = SLOT.sub("", line).strip()
    match = HEADER.match(line_without_slots)
    if not match:
        return None
    code, name, section, professor, status = match.groups()
    return {
        "id": f"{code.upper()}|{section}",
        "code": code.upper(),
        "name": name.strip(),
        "section": section,
        "professor": (professor or "").strip(),
        "status": (status or "ACTIVA").upper(),
        "curriculum": curriculum,
        "slots": [{"day": d, "start": t, "room": room} for d, t, room in SLOT.findall(line)]
    }

def parse_catalog(text):
    result, current = [], None
    curriculum = "viejo"
    for raw in text.splitlines():
        line = " ".join(raw.replace("\xa0", " ").split())
        if not line:
            continue
        upper = line.upper()
        if "PENSUM NUEVO" in upper:
            curriculum = "nuevo"
            continue
        if "PENSUM VIEJO" in upper:
            curriculum = "viejo"
            continue
        if upper.startswith("HORARIOS PERIODO") or upper.startswith("HORARIOS PERÍODO"):
            continue
        if upper.startswith("ACTUALIZADO AL") or "DAE SOLO MUESTRA" in upper:
            continue
        # En el HTML de la DAE, el rótulo PROF. y el nombre del docente
        # pueden aparecer en un nodo separado del encabezado de la sección.
        if current and upper == "PROF.":
            current["_awaiting_professor"] = True
            continue
        if current and upper.startswith("PROF."):
            teacher_line = line[5:].strip()
            status_match = re.search(r"\\s+\\((CERRADA|NUEVA)\\)$", teacher_line, re.I)
            if status_match:
                current["status"] = status_match.group(1).upper()
                teacher_line = teacher_line[:status_match.start()].strip()
            current["professor"] = teacher_line
            current.pop("_awaiting_professor", None)
            continue
        if current and current.get("_awaiting_professor"):
            teacher_line = line.strip()
            status_match = re.search(r"\\s+\\((CERRADA|NUEVA)\\)$", teacher_line, re.I)
            if status_match:
                current["status"] = status_match.group(1).upper()
                teacher_line = teacher_line[:status_match.start()].strip()
            current["professor"] = teacher_line
            current.pop("_awaiting_professor", None)
            continue
        if current and upper in ("(CERRADA)", "(NUEVA)"):
            current["status"] = upper.strip("()")
            continue

        item = parse_header(line, curriculum)
        if item:
            current = item
            result.append(current)
        elif current:
            current["slots"].extend(
                {"day": d, "start": t, "room": room}
                for d, t, room in SLOT.findall(line)
            )

    # Evita duplicados conservando la última aparición de cada sección.
    unique = {item["id"]: item for item in result}
    courses = list(unique.values())
    order = {"LU": 0, "MA": 1, "MI": 2, "JU": 3, "VI": 4, "SA": 5, "DO": 6}
    for item in courses:
        item["slots"].sort(key=lambda slot: (order[slot["day"]], slot["start"], slot["room"]))
    return courses


def version_reference(meta):
    return {
        "period": meta.get("period"),
        "updated_at": meta.get("updated_at"),
        "generated_at": meta.get("generated_at"),
        "sections": meta.get("sections"),
        "sha256": meta.get("sha256")
    }

def course_details(course):
    return {
        "name": course.get("name", ""),
        "professor": course.get("professor", ""),
        "status": course.get("status", "ACTIVA"),
        "curriculum": course.get("curriculum", ""),
        "slots": course.get("slots", [])
    }

def build_change_entry(old_courses, new_courses, old_meta, new_meta):
    old_map = {course["id"]: course for course in old_courses}
    new_map = {course["id"]: course for course in new_courses}
    changes = []

    for section_id in sorted(set(old_map) | set(new_map)):
        before = old_map.get(section_id)
        after = new_map.get(section_id)
        if before is None:
            changes.append({
                "type": "added", "id": section_id, "code": after.get("code", ""),
                "name": after.get("name", ""), "section": after.get("section", ""),
                "after": course_details(after)
            })
            continue
        if after is None:
            changes.append({
                "type": "removed", "id": section_id, "code": before.get("code", ""),
                "name": before.get("name", ""), "section": before.get("section", ""),
                "before": course_details(before)
            })
            continue

        fields = {}
        for field in ("name", "professor", "status", "curriculum", "slots"):
            old_value = before.get(field, [] if field == "slots" else "")
            new_value = after.get(field, [] if field == "slots" else "")
            if old_value != new_value:
                fields[field] = {"before": old_value, "after": new_value}
        if fields:
            changes.append({
                "type": "modified", "id": section_id, "code": after.get("code", ""),
                "name": after.get("name", ""), "section": after.get("section", ""),
                "fields": fields
            })

    summary = {
        "added": sum(change["type"] == "added" for change in changes),
        "removed": sum(change["type"] == "removed" for change in changes),
        "modified": sum(change["type"] == "modified" for change in changes),
        "schedule_changes": sum("slots" in change.get("fields", {}) for change in changes),
        "professor_changes": sum("professor" in change.get("fields", {}) for change in changes),
        "status_changes": sum("status" in change.get("fields", {}) for change in changes)
    }
    return {
        "generated_at": new_meta.get("generated_at"),
        "updated_at": new_meta.get("updated_at"),
        "period": new_meta.get("period"),
        "from": version_reference(old_meta),
        "to": version_reference(new_meta),
        "summary": summary,
        "changes": changes
    }

def load_change_history():
    if CHANGELOG.exists():
        try:
            value = json.loads(CHANGELOG.read_text(encoding="utf-8"))
            if isinstance(value, dict) and isinstance(value.get("history"), list):
                return value
        except Exception:
            pass
    return {"schema_version": 1, "history": []}

def save_change_history(history):
    history["history"] = history.get("history", [])[-15:]
    CHANGELOG.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main():
    DATA.mkdir(exist_ok=True)
    text, resolved_url = fetch_text()
    courses = parse_catalog(text)
    slot_count = sum(len(course["slots"]) for course in courses)
    if len(courses) < 50 or slot_count < 100:
        raise SystemExit(f"Validación fallida: {len(courses)} secciones y {slot_count} bloques; no se reemplazó el catálogo.")

    old_courses = []
    old_count = 0
    if CATALOG.exists():
        try:
            old = gzip.decompress(base64.b64decode(CATALOG.read_text().strip()))
            old_courses = json.loads(old.decode("utf-8"))
            old_count = len(old_courses)
        except Exception as exc:
            raise SystemExit(f"No se pudo leer el catálogo anterior; se cancela la comparación para evitar un historial incorrecto: {exc}")
    if old_count and len(courses) < old_count * 0.70:
        raise SystemExit(f"Validación de seguridad: catálogo bajó de {old_count} a {len(courses)} secciones.")

    compact = json.dumps(courses, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    digest = hashlib.sha256(compact).hexdigest()
    period_match = re.search(r"HORARIOS\s+PER[IÍ]ODO\s+([^\r\n]+)", text, re.I)
    date_match = re.search(r"Actualizado\s+al\s+([^\r\n]+)", text, re.I)
    period = period_match.group(1).strip() if period_match else "No identificado"
    updated_at = date_match.group(1).strip() if date_match else "No indicada por la DAE"

    previous_meta = {}
    if META.exists():
        try:
            previous_meta = json.loads(META.read_text(encoding="utf-8"))
        except Exception:
            previous_meta = {}

    same_catalog = previous_meta.get("sha256") == digest
    same_publication = (
        previous_meta.get("period") == period
        and previous_meta.get("updated_at") == updated_at
        and previous_meta.get("sections") == len(courses)
        and previous_meta.get("subjects") == len({c["code"] for c in courses})
        and previous_meta.get("slots") == slot_count
    )
    if same_catalog and same_publication and CATALOG.exists():
        if not CHANGELOG.exists():
            baseline = {
                "generated_at": previous_meta.get("generated_at"),
                "updated_at": previous_meta.get("updated_at"),
                "period": previous_meta.get("period"),
                "from": None,
                "to": version_reference(previous_meta),
                "baseline": True,
                "summary": {
                    "added": 0, "removed": 0, "modified": 0,
                    "schedule_changes": 0, "professor_changes": 0, "status_changes": 0
                },
                "changes": []
            }
            save_change_history({"schema_version": 1, "history": [baseline]})
            print("Se creó el punto inicial del historial de cambios DAE.")
        else:
            print("La DAE no publicó cambios en los horarios. Se conserva la versión actual.")
        return

    # Solo reescribe el archivo de datos cuando el contenido realmente cambió.
    if not same_catalog or not CATALOG.exists():
        compressed = gzip.compress(compact, compresslevel=9, mtime=0)
        CATALOG.write_text(base64.b64encode(compressed).decode("ascii") + "\n", encoding="ascii")

    meta = {
        "period": period,
        "updated_at": updated_at,
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "sections": len(courses),
        "subjects": len({c["code"] for c in courses}),
        "sections_with_professor": sum(bool(c.get("professor")) for c in courses),
        "slots": slot_count,
        "source_url": resolved_url,
        "source_page": SOURCE,
        "sha256": digest,
        "status": "ok"
    }
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    history = load_change_history()
    if not history["history"] and previous_meta:
        history["history"].append({
            "generated_at": previous_meta.get("generated_at"),
            "updated_at": previous_meta.get("updated_at"),
            "period": previous_meta.get("period"),
            "from": None,
            "to": version_reference(previous_meta),
            "baseline": True,
            "summary": {
                "added": 0, "removed": 0, "modified": 0,
                "schedule_changes": 0, "professor_changes": 0, "status_changes": 0
            },
            "changes": []
        })

    entry = build_change_entry(old_courses, courses, previous_meta, meta)
    history["history"].append(entry)
    save_change_history(history)

    print(json.dumps(meta, ensure_ascii=False, indent=2))
    print(json.dumps(entry["summary"], ensure_ascii=False))

if __name__ == "__main__":
    main()

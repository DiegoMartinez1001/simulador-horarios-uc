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

def main():
    DATA.mkdir(exist_ok=True)
    text, resolved_url = fetch_text()
    courses = parse_catalog(text)
    slot_count = sum(len(course["slots"]) for course in courses)
    if len(courses) < 50 or slot_count < 100:
        raise SystemExit(f"Validación fallida: {len(courses)} secciones y {slot_count} bloques; no se reemplazó el catálogo.")

    old_count = 0
    if CATALOG.exists():
        try:
            old = gzip.decompress(base64.b64decode(CATALOG.read_text().strip()))
            old_count = len(json.loads(old.decode("utf-8")))
        except Exception:
            pass
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
    print(json.dumps(meta, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

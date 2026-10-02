#!/usr/bin/env python3
"""Build every page from the plain-text sources in text/*.txt.

The text files are the source of truth (copied from the zhalve repo's docs/). Each
page links its own text file, which is served unchanged at /text/<page>.txt.
"""
import html, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["live", "how", "roster", "ticks", "private", "circuits", "relayer", "novelty", "limits", "status", "program"]
HEADERS = {"rule", "era", "#", "suite"}
esc = html.escape


def nav(current):
    cur = ' aria-current="page"'
    items = "".join(f'<li><a href="/{p}"{cur if p == current else ""}>{p}</a></li>' for p in PAGES)
    items += '<li><a href="https://x.com/" rel="external noopener" target="_blank">x</a></li>'
    return items


def shell(page, title, description, body):
    footer_links = "".join(f'<a href="/{p}">{p}</a>' for p in PAGES)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(page)} · z/halve</title>
<meta name="description" content="{esc(description)}">
<meta name="theme-color" content="#f3eee3">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Besley:wght@500;600;700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap">
<link rel="stylesheet" href="/assets/site.css">
<script>document.documentElement.classList.add("js")</script>
</head>
<body data-page="{page}">
<a class="skip" href="#main">skip to content</a>
<header class="bar">
  <nav class="bar__inner" aria-label="sections">
    <a class="brand" href="/">z<span>/</span>halve</a>
    <ul class="bar__links">{nav(page)}</ul>
  </nav>
</header>
<main id="main" class="page">
{body}
</main>
<footer class="foot">
  <span>z/halve · not deployed · not audited</span>
  <nav aria-label="footer">{footer_links}</nav>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""


def is_rule(line):
    return len(line) >= 2 and set(line) == {"-"}


def cols(line):
    return [c for c in re.split(r"\s{2,}", line.strip()) if c]


def render_block(lines):
    """One blank-line-separated block (no headings) to HTML."""
    if all(l.startswith("    ") for l in lines):
        return '<div class="wide"><pre class="ascii">' + esc("\n".join(l[4:] if l.startswith("    ") else l for l in lines)) + "</pre></div>"
    if all(re.match(r"^\d+\. ", l) for l in lines):
        items = [esc(re.sub(r"^\d+\. ", "", l)) for l in lines]
        return "<ol>" + "".join(f"<li>{t}</li>" for t in items) + "</ol>"
    if len(lines) > 1 and all(len(l.split()) == 1 for l in lines):
        rows = "".join(f'<tr><td>{esc(l)}</td><td class="dim">not deployed</td></tr>' for l in lines)
        return f'<div class="tbl-wrap wide dense"><table class="rules"><thead><tr><th>field</th><th>value</th></tr></thead><tbody>{rows}</tbody></table></div>'
    # aligned columns: every line either splits into 2+ columns or continues the one above
    rows = []
    tabular = True
    for l in lines:
        if rows and re.match(r"^\s{10,}\S", l):
            rows[-1][-1] += " " + l.strip()
            continue
        c = cols(l)
        if len(c) < 2:
            tabular = False
            break
        rows.append(c)
    if tabular and rows:
        width = max(len(r) for r in rows)
        rows = [r[: width - 1] + [" ".join(r[width - 1:])] if len(r) > width else r + [""] * (width - len(r)) for r in rows]
        if rows[0][0].lower() in HEADERS or (len(rows[0]) >= 2 and rows[0][0] in {"field"}):
            head = "<thead><tr>" + "".join(f"<th>{esc(h)}</th>" for h in rows[0]) + "</tr></thead>"
            body = rows[1:]
        elif width == 2:
            return '<dl class="gloss">' + "".join(f"<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>" for a, b in rows) + "</dl>"
        else:
            head, body = "", rows
        trs = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in body)
        return f'<div class="tbl-wrap wide dense"><table class="rules">{head}<tbody>{trs}</tbody></table></div>'
    return "<p>" + esc(" ".join(l.strip() for l in lines)) + "</p>"


def build(page):
    raw = (ROOT / "text" / f"{page}.txt").read_text().rstrip("\n").split("\n")
    if raw and raw[0].startswith("z/halve  "):
        raw = raw[1:]
    # split into sections at "TITLE / ----" pairs
    sections, cur = [], None
    i = 0
    while i < len(raw):
        if i + 1 < len(raw) and is_rule(raw[i + 1]) and raw[i].strip():
            cur = {"title": raw[i].strip(), "lines": []}
            sections.append(cur)
            i += 2
            continue
        if cur is not None:
            cur["lines"].append(raw[i])
        i += 1
    out, description = [], ""
    for n, sec in enumerate(sections):
        blocks, b = [], []
        for l in sec["lines"]:
            if l.strip():
                b.append(l.rstrip())
            elif b:
                blocks.append(b)
                b = []
        if b:
            blocks.append(b)
        # consecutive single-line numbered blocks form one list
        merged = []
        for blk in blocks:
            if merged and len(blk) == 1 and re.match(r"^\d+\. ", blk[0]) and all(re.match(r"^\d+\. ", x) for x in merged[-1]):
                merged[-1] = merged[-1] + blk
            else:
                merged.append(blk)
        html_blocks = [render_block(blk) for blk in merged]
        if n == 0:
            first = merged[0] if merged else []
            lede = " ".join(l.strip() for l in first) if first and render_block(first).startswith("<p>") else ""
            description = re.split(r"(?<=\.)\s", lede)[0] if lede else sec["title"].lower()
            rest = html_blocks[1:] if lede else html_blocks
            out.append(f'<header class="head col">\n  <p class="path">~/z-halve/<b>{page}</b></p>\n  <h1>{esc(sec["title"])}</h1>\n'
                       + (f'  <p class="lede">{esc(lede)}</p>\n' if lede else "")
                       + f'  <p class="note">Plain text of this page: <a href="/text/{page}.txt">/text/{page}.txt</a></p>\n</header>')
            if rest:
                out.append('<div class="col">' + "\n".join(rest) + "</div>")
        else:
            sid = re.sub(r"[^a-z0-9]+", "-", sec["title"].lower()).strip("-")
            out.append(f'<section class="sec col" id="{sid}" aria-labelledby="{sid}-h">\n  <span class="sec__label"><a href="#{sid}">§{n}</a></span>\n  <h2 id="{sid}-h">{esc(sec["title"])}</h2>\n'
                       + "\n".join(html_blocks) + "\n</section>")
    (ROOT / page).mkdir(exist_ok=True)
    (ROOT / page / "index.html").write_text(shell(page, sections[0]["title"], description, "\n\n".join(out)))


if __name__ == "__main__":
    for p in PAGES:
        build(p)
        print("built", p)

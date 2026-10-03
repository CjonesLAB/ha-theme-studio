"""Build the localized Theme Studio user-guide PDFs from Markdown."""

from __future__ import annotations

import html
import re
import shutil
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
GUIDES = ROOT / "docs" / "guides"
OUTPUT = ROOT / "output" / "pdf"
DOWNLOADS = ROOT / "docs" / "downloads"

GUIDE_SPECS = (
    ("USER_GUIDE.en.md", "theme-studio-user-guide-en.pdf", "Theme Studio User Guide", "English"),
    ("BENUTZERHANDBUCH.de.md", "theme-studio-benutzerhandbuch-de.pdf", "Theme Studio Benutzerhandbuch", "Deutsch"),
    ("GUIDE_UTILISATEUR.fr.md", "theme-studio-guide-utilisateur-fr.pdf", "Guide utilisateur Theme Studio", "Français"),
    ("GUIA_USUARIO.es.md", "theme-studio-guia-usuario-es.pdf", "Guía de usuario Theme Studio", "Español"),
)

ACCENT = colors.HexColor("#20b7bc")
ACCENT_DARK = colors.HexColor("#0c7478")
INK = colors.HexColor("#15242d")
MUTED = colors.HexColor("#566771")
PANEL = colors.HexColor("#eef5f6")
WARNING = colors.HexColor("#fff4d6")
LINE = colors.HexColor("#c8d6da")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("GuideSans", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("GuideSans-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
    pdfmetrics.registerFont(TTFont("GuideMono", r"C:\Windows\Fonts\consola.ttf"))
    pdfmetrics.registerFont(TTFont("GuideMono-Bold", r"C:\Windows\Fonts\consolab.ttf"))


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "GuideTitle", parent=base["Title"], fontName="GuideSans-Bold",
            fontSize=25, leading=30, textColor=INK, alignment=TA_LEFT,
            spaceAfter=8 * mm,
        ),
        "h2": ParagraphStyle(
            "GuideH2", parent=base["Heading2"], fontName="GuideSans-Bold",
            fontSize=17, leading=21, textColor=ACCENT_DARK,
            spaceBefore=4 * mm, spaceAfter=3 * mm, keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "GuideH3", parent=base["Heading3"], fontName="GuideSans-Bold",
            fontSize=12.5, leading=16, textColor=INK,
            spaceBefore=3 * mm, spaceAfter=1.5 * mm, keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "GuideBody", parent=base["BodyText"], fontName="GuideSans",
            fontSize=9.4, leading=13.2, textColor=INK, spaceAfter=2.4 * mm,
        ),
        "small": ParagraphStyle(
            "GuideSmall", parent=base["BodyText"], fontName="GuideSans",
            fontSize=7.8, leading=10.5, textColor=MUTED, spaceAfter=2 * mm,
        ),
        "quote": ParagraphStyle(
            "GuideQuote", parent=base["BodyText"], fontName="GuideSans",
            fontSize=9.1, leading=13, textColor=INK, leftIndent=5 * mm,
            rightIndent=4 * mm, borderColor=colors.HexColor("#e3ad24"),
            borderWidth=1.2, borderPadding=6, backColor=WARNING,
            spaceBefore=2 * mm, spaceAfter=3 * mm,
        ),
        "code": ParagraphStyle(
            "GuideCode", parent=base["Code"], fontName="GuideMono",
            fontSize=7.7, leading=10.2, textColor=colors.HexColor("#dce8ed"),
            backColor=colors.HexColor("#1c2b34"), borderPadding=7,
            leftIndent=0, rightIndent=0, spaceBefore=1 * mm, spaceAfter=3 * mm,
        ),
        "caption": ParagraphStyle(
            "GuideCaption", parent=base["BodyText"], fontName="GuideSans",
            fontSize=7.5, leading=9.5, textColor=MUTED, alignment=TA_CENTER,
            spaceBefore=1.2 * mm, spaceAfter=4 * mm,
        ),
        "table": ParagraphStyle(
            "GuideTable", parent=base["BodyText"], fontName="GuideSans",
            fontSize=7.7, leading=10.2, textColor=INK,
        ),
        "table_head": ParagraphStyle(
            "GuideTableHead", parent=base["BodyText"], fontName="GuideSans-Bold",
            fontSize=7.7, leading=10.2, textColor=colors.white,
        ),
    }


def inline_markup(value: str) -> str:
    value = html.escape(value.strip())
    value = re.sub(r"`([^`]+)`", r'<font name="GuideMono">\1</font>', value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    value = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+|[^)]+)\)",
        r'<link href="\2" color="#0c7478"><u>\1</u></link>',
        value,
    )
    return value


def image_flowable(source: Path, alt: str, styles_map: dict):
    with PILImage.open(source) as picture:
        width, height = picture.size
    max_width = 174 * mm
    max_height = 92 * mm
    scale = min(max_width / width, max_height / height, 1)
    image = Image(str(source), width=width * scale, height=height * scale)
    image.hAlign = "CENTER"
    return KeepTogether(
        [image, Paragraph(inline_markup(alt), styles_map["caption"])]
    )


def table_flowable(rows: list[list[str]], styles_map: dict):
    columns = max(len(row) for row in rows)
    available = 174 * mm
    widths = [available / columns] * columns
    data = []
    for index, row in enumerate(rows):
        style = styles_map["table_head"] if index == 0 else styles_map["table"]
        padded = row + [""] * (columns - len(row))
        data.append([Paragraph(inline_markup(cell), style) for cell in padded])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT_DARK),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def parse_markdown(path: Path, styles_map: dict):
    lines = path.read_text(encoding="utf-8").splitlines()
    story = []
    index = 0
    while index < len(lines):
        line = lines[index].rstrip()
        if not line:
            index += 1
            continue

        image_match = re.fullmatch(r"!\[([^]]*)\]\(([^)]+)\)", line)
        if image_match:
            source = (path.parent / image_match.group(2)).resolve()
            story.append(image_flowable(source, image_match.group(1), styles_map))
            index += 1
            continue

        if line.startswith("# "):
            story.extend(
                [
                    Spacer(1, 10 * mm),
                    Paragraph(inline_markup(line[2:]), styles_map["title"]),
                    HRFlowable(width="100%", thickness=2, color=ACCENT),
                    Spacer(1, 5 * mm),
                ]
            )
            index += 1
            continue

        if line.startswith("## "):
            story.append(PageBreak())
            story.append(Paragraph(inline_markup(line[3:]), styles_map["h2"]))
            index += 1
            continue

        if line.startswith("### "):
            story.append(Paragraph(inline_markup(line[4:]), styles_map["h3"]))
            index += 1
            continue

        if line.startswith("> "):
            quote_lines = []
            while index < len(lines) and lines[index].startswith("> "):
                quote_lines.append(lines[index][2:].strip())
                index += 1
            story.append(Paragraph(inline_markup(" ".join(quote_lines)), styles_map["quote"]))
            continue

        if line.startswith("```"):
            code_lines = []
            index += 1
            while index < len(lines) and not lines[index].startswith("```"):
                code_lines.append(lines[index])
                index += 1
            index += 1
            escaped = "<br/>".join(html.escape(item).replace(" ", "&nbsp;") for item in code_lines)
            story.append(Paragraph(escaped, styles_map["code"]))
            continue

        if line.startswith("|"):
            raw_rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                raw_rows.append([cell.strip() for cell in lines[index].strip().strip("|").split("|")])
                index += 1
            if len(raw_rows) > 1 and all(re.fullmatch(r":?-{3,}:?", cell) for cell in raw_rows[1]):
                raw_rows.pop(1)
            story.append(table_flowable(raw_rows, styles_map))
            story.append(Spacer(1, 3 * mm))
            continue

        if re.match(r"^- ", line):
            items = []
            while index < len(lines) and re.match(r"^- ", lines[index]):
                items.append(ListItem(Paragraph(inline_markup(lines[index][2:]), styles_map["body"])))
                index += 1
            story.append(
                ListFlowable(
                    items, bulletType="bullet", bulletChar="•", leftIndent=6 * mm,
                    bulletColor=ACCENT_DARK, bulletFontName="GuideSans", bulletFontSize=8,
                )
            )
            story.append(Spacer(1, 1.5 * mm))
            continue

        if re.match(r"^\d+\. ", line):
            items = []
            while index < len(lines) and re.match(r"^\d+\. ", lines[index]):
                text = re.sub(r"^\d+\. ", "", lines[index])
                items.append(ListItem(Paragraph(inline_markup(text), styles_map["body"])))
                index += 1
            story.append(
                ListFlowable(
                    items, bulletType="1", leftIndent=8 * mm, bulletColor=ACCENT_DARK,
                    bulletFontName="GuideSans", bulletFontSize=8,
                )
            )
            story.append(Spacer(1, 1.5 * mm))
            continue

        paragraph_lines = [line]
        index += 1
        while index < len(lines) and lines[index].strip() and not re.match(
            r"^(#{1,3} |>|```|\||- |\d+\. |!\[)", lines[index].strip()
        ):
            paragraph_lines.append(lines[index].strip())
            index += 1
        story.append(Paragraph(inline_markup(" ".join(paragraph_lines)), styles_map["body"]))

    return story


def header_footer(canvas, doc, title: str, language: str, first_page: bool = False):
    canvas.saveState()
    width, height = A4
    if not first_page:
        canvas.setStrokeColor(LINE)
        canvas.line(18 * mm, height - 14 * mm, width - 18 * mm, height - 14 * mm)
        canvas.setFont("GuideSans", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, height - 10.5 * mm, title)
        canvas.drawRightString(width - 18 * mm, height - 10.5 * mm, "Version 0.8.0")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.setFont("GuideSans", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9.5 * mm, f"Theme Studio · {language}")
    canvas.drawRightString(width - 18 * mm, 9.5 * mm, str(doc.page))
    canvas.restoreState()


def build_one(source_name: str, output_name: str, title: str, language: str) -> Path:
    source = GUIDES / source_name
    target = OUTPUT / output_name
    style_map = styles()
    document = SimpleDocTemplate(
        str(target), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=19 * mm, bottomMargin=19 * mm,
        title=title, author="CjonesLAB", subject="Theme Studio 0.8.0",
    )
    story = parse_markdown(source, style_map)
    document.build(
        story,
        onFirstPage=lambda canvas, doc: header_footer(canvas, doc, title, language, True),
        onLaterPages=lambda canvas, doc: header_footer(canvas, doc, title, language, False),
    )
    published = DOWNLOADS / output_name
    shutil.copy2(target, published)
    return target


def main() -> None:
    register_fonts()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    for spec in GUIDE_SPECS:
        result = build_one(*spec)
        print(f"built {result.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

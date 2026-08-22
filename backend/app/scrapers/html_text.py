"""Turn the HTML from a job description into clean readable plain text.

The descriptions come from a rich text editor, so they are mostly paragraphs
and bullet lists. Block level tags become line breaks and list items get a
leading dash, which keeps the text readable for a person and keeps the
responsibilities and requirements separated for the skill extraction later.

This uses the standard library HTML parser, no third party parser is needed.
"""

import re
from html.parser import HTMLParser

# Tags that should force a line break when they open or close
BLOCK_TAGS = {
    "p", "div", "br", "tr", "table", "section", "article", "header", "footer",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "hr",
}

# Tags whose contents are code or styling, not readable text
SKIP_TAGS = {"script", "style", "head", "title"}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self._skip_depth += 1
            return
        if tag == "li":
            self.parts.append("\n- ")
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if tag in BLOCK_TAGS or tag == "li":
            self.parts.append("\n")

    def handle_data(self, data):
        if self._skip_depth == 0:
            self.parts.append(data)


def html_to_text(raw_html: str | None) -> str:
    """Strip tags from raw_html and return tidy plain text."""
    if not raw_html:
        return ""

    parser = _TextExtractor()
    parser.feed(raw_html)
    parser.close()
    text = "".join(parser.parts)

    # Non breaking spaces arrive as real characters once charrefs are converted
    text = text.replace("\xa0", " ")

    # Collapse runs of spaces and tabs, but keep the line structure
    text = re.sub(r"[ \t]+", " ", text)
    # Tidy the space a line break leaves behind
    text = re.sub(r" *\n *", "\n", text)
    # At most one blank line between blocks
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Drop bullets that ended up with no content
    text = re.sub(r"\n-\s*(?=\n|$)", "", text)
    # Keep list items on consecutive lines rather than spaced apart
    text = re.sub(r"\n{2,}(?=- )", "\n", text)

    return text.strip()

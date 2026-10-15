// Renders a resolved resume version to a .docx buffer (US Letter, single column, ATS-friendly: no tables or text boxes).
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, LevelFormat, Packer, Paragraph,
  Tab, TabStopType, TextRun,
} from "docx";
import { educationLine, range } from "./resume-data.mjs";

const FONT = "Arial"; // metric-identical to Liberation Sans, so local previews match Word
const ACCENT = "1F3A5F";
const MUTED = "555555";
const pt = (n) => n * 2; // docx sizes are half-points

// Right-aligned tab stop at the right margin (US Letter 8.5in minus 0.6in margins = 7.3in = 10512 DXA).
const RIGHT_EDGE = 10512;
const rightTabStop = [{ type: TabStopType.RIGHT, position: RIGHT_EDGE }];

const sectionHeading = (text) => new Paragraph({
  spacing: { before: 160, after: 60 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 2 } },
  children: [new TextRun({ text: text.toUpperCase(), bold: true, size: pt(11.5), color: ACCENT, characterSpacing: 20 })],
});

const body = (children, opts = {}) => new Paragraph({ spacing: { after: 60 }, ...opts, children });
const bullet = (text, level = 0) => new Paragraph({ numbering: { reference: "bullets", level }, spacing: { after: 20 }, children: [new TextRun(text)] });
const link = (text, url) => new ExternalHyperlink({ link: url, children: [new TextRun({ text, color: ACCENT })] });
const shortUrl = (url) => url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");

export async function toDocx({ basics, skills, work, education, certificates }) {
  const contact = [basics.email, basics.phone, `${basics.location.city}, ${basics.location.region}`].filter(Boolean);
  const links = [{ url: basics.url }, ...basics.profiles].map((p) => link(shortUrl(p.url), p.url));
  const sep = () => new TextRun({ text: " · ", color: MUTED });

  const children = [
    new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: basics.name.toUpperCase(), bold: true, size: pt(24), color: ACCENT, characterSpacing: 30 })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: basics.label, size: pt(12.5), color: MUTED })] }),
    new Paragraph({ spacing: { after: 120 }, children: [...contact.map((c) => new TextRun(c)), ...links].flatMap((r, i) => [...(i ? [sep()] : []), r]) }),
    body([new TextRun(basics.summary)]),

    sectionHeading("Technical Skills"),
    ...skills.map((s) => body([
      new TextRun({ text: `${s.name}: `, bold: true }),
      ...s.keywords.flatMap((k, i) => [
        ...(i ? [new TextRun(", ")] : []),
        new TextRun({ text: k.name, bold: !!k.proficient }),
      ]),
    ], { spacing: { after: 20 } })),
    body([new TextRun({ text: "Bold indicates proficiency.", italics: true, size: pt(8.5), color: MUTED })], { spacing: { before: 40, after: 0 } }),

    sectionHeading("Experience"),
  ];

  for (const w of work) {
    children.push(new Paragraph({
      keepNext: true,
      tabStops: rightTabStop,
      spacing: { before: 110, after: 0 },
      children: [
        new TextRun({ text: w.position, bold: true }),
        new TextRun({ text: `  |  ${w.name}`, bold: true, color: ACCENT }),
        new TextRun({ children: [new Tab(), range(w.startDate, w.endDate)], color: MUTED }),
      ],
    }));
    const meta = [w.location, w.endDate ? w.note : null].filter(Boolean).join("  ·  ");
    if (meta) children.push(new Paragraph({ keepNext: true, spacing: { after: 40 }, children: [new TextRun({ text: meta, italics: true, size: pt(9), color: MUTED })] }));
    if (w.summary) children.push(body([new TextRun(w.summary)], { spacing: { before: meta ? 0 : 40, after: 40 } }));
    for (const h of w.highlights) children.push(bullet(h));
    for (const r of w.roles ?? []) {
      children.push(new Paragraph({
        keepNext: true,
        tabStops: rightTabStop,
        spacing: { before: 60, after: 20 },
        children: [new TextRun({ text: r.position, bold: true, italics: true }), new TextRun({ children: [new Tab(), range(r.startDate, r.endDate)], color: MUTED, italics: true })],
      }));
      for (const h of r.highlights) children.push(bullet(h));
    }
    if (w.technologies) children.push(body([new TextRun({ text: "Technologies: ", bold: true, size: pt(9) }), new TextRun({ text: w.technologies.join(", "), size: pt(9), color: MUTED })], { spacing: { before: 40, after: 0 } }));
    if (w.note && !w.endDate) children.push(body([new TextRun({ text: w.note, italics: true, size: pt(9), color: MUTED })], { spacing: { before: 20, after: 0 } }));
  }

  children.push(sectionHeading("Education & Certifications"));
  for (const e of education) {
    const { degree, where, years } = educationLine(e);
    children.push(body([new TextRun({ text: degree, bold: true }), new TextRun(`  |  ${where}`), new TextRun({ children: [new Tab(), years], color: MUTED })], { tabStops: rightTabStop, spacing: { after: 30 } }));
  }

  for (const c of certificates) {
    children.push(body([new TextRun({ text: c.name, bold: true }), ...(c.issuer && c.date ? [new TextRun(`  |  ${c.issuer}`), new TextRun({ children: [new Tab(), c.date], color: MUTED })] : [])], { tabStops: rightTabStop, spacing: { after: 30 } }));
  }

  const doc = new Document({
    creator: basics.name,
    title: `${basics.name} - ${basics.label}`,
    styles: { default: { document: { run: { font: FONT, size: pt(9.5) } } } },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 240 } } } },
        ],
      }],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 648, bottom: 648, left: 864, right: 864 } } },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}

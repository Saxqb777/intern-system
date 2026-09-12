import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  dayOf,
  dayShort,
  officeTime,
  sheetDate,
  weekOf,
  sheetDays,
} from "@/lib/dates";

export type SheetRow = {
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  status: string;
  /** The supervisor's drawing, not the intern's. */
  signature: string | null;
  signed_by_name: string | null;
  signed_at: string | null;
  note: string | null;
};

export type SheetInput = {
  internName: string;
  position: string | null;
  department: string | null;
  mentor: string | null;
  fromDate: string;
  toDate: string;
  internshipStart: string;
  rows: SheetRow[];
};

const GREEN = "779A0B";
const INK = "1D1D1B";
const GREY = "6E6F62";

/**
 * Rebuilds the university's attendance sheet as a Word file: same heading,
 * same four header fields, same six columns, one row per working day.
 * Anyone who has seen the paper version should recognise this immediately.
 */
export async function buildAttendanceSheet(input: SheetInput): Promise<Buffer> {
  const byDate = new Map(
    input.rows.map((row) => [dayOf(row.work_date), row])
  );
  const days = sheetDays(input.fromDate, input.toDate, byDate.keys());

  const initials = initialsOf(input.internName);
  const logo = await loadLogo();
  const header: Paragraph[] = [];

  if (logo) {
    header.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logo,
            transformation: { width: 128, height: 85 },
            type: "png",
          }),
        ],
      })
    );
  }

  header.push(
    new Paragraph({
      spacing: { before: logo ? 120 : 0, after: 220 },
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: "Agthia Internship/ Apprenticeship Attendance Sheet",
          bold: true,
          size: 30,
          color: INK,
          font: "Calibri",
        }),
      ],
    }),
    detailLine("Intern Name", input.internName),
    detailLine("Internal position", input.position ?? "", "Department", input.department ?? ""),
    detailLine("Mentor", input.mentor ?? ""),
    new Paragraph({ text: "", spacing: { after: 160 } })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      headerRow(),
      ...days.map((day) =>
        bodyRow(day, byDate.get(day), input.internshipStart, days, initials)
      ),
    ],
  });

  const doc = new Document({
    creator: "Al Foah Attendance",
    title: `Attendance sheet, ${input.internName}`,
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 20, color: INK } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children: [
          ...header,
          table,
          new Paragraph({
            spacing: { before: 240 },
            children: [
              new TextRun({
                text: `Generated ${sheetDate(todayIso())} from the Al Foah attendance system. Times are recorded when the intern signs in and out inside the office. Each signature is the supervisor\u2019s, added from their own account, with their initials and the time they signed.`,
                size: 16,
                color: GREY,
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function todayIso(): string {
  return new Date(Date.now() + 4 * 60 * 60_000).toISOString().slice(0, 10);
}

function detailLine(
  label: string,
  value: string,
  label2?: string,
  value2?: string
): Paragraph {
  const runs = [
    new TextRun({ text: `${label}: `, bold: true, size: 20 }),
    new TextRun({
      text: value || "_".repeat(28),
      size: 20,
      color: value ? INK : GREY,
    }),
  ];

  if (label2) {
    runs.push(
      new TextRun({ text: "          ", size: 20 }),
      new TextRun({ text: `${label2}: `, bold: true, size: 20 }),
      new TextRun({
        text: value2 || "_".repeat(24),
        size: 20,
        color: value2 ? INK : GREY,
      })
    );
  }

  return new Paragraph({ spacing: { after: 90 }, children: runs });
}

const COLUMNS = ["Weeks", "Day", "Date", "Time In", "Time Out", "Signature"];

function headerRow(): TableRow {
  return new TableRow({
    tableHeader: true,
    children: COLUMNS.map(
      (label) =>
        new TableCell({
          shading: { fill: GREEN },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 70, bottom: 70, left: 110, right: 110 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: label, bold: true, color: "FFFFFF", size: 19 }),
              ],
            }),
          ],
        })
    ),
  });
}

function bodyRow(
  day: string,
  row: SheetRow | undefined,
  internshipStart: string,
  allDays: string[],
  initials: string
): TableRow {
  const week = weekOf(day, internshipStart);
  // The paper sheet only writes the week number against its first row.
  const firstOfWeek =
    allDays.findIndex((d) => weekOf(d, internshipStart) === week) ===
    allDays.indexOf(day);

  let timeIn = "";
  let timeOut = "";

  if (row?.status === "leave") {
    timeIn = "Approved leave";
  } else if (row?.status === "absent") {
    timeIn = "Absent";
  } else if (row) {
    timeIn = officeTime(row.time_in) ?? "";
    timeOut = officeTime(row.time_out) ?? "";
  }

  return new TableRow({
    children: [
      cell(firstOfWeek ? String(week) : "", { center: true, bold: true }),
      cell(dayShort(day), { center: true }),
      cell(sheetDate(day)),
      cell(timeIn, { center: true }),
      cell(timeOut, { center: true }),
      signatureCell(row, initials),
    ],
  });
}

/**
 * What the intern actually drew, at the size a signature is written at, with
 * their initials and the minute they signed underneath it.
 *
 * The drawing is the point. A cell reading "signed electronically" proves
 * nothing to a university; a signature and a timestamp look like the paper
 * form they already trust.
 */
function signatureCell(row: SheetRow | undefined, initials: string): TableCell {
  const children: Paragraph[] = [];

  if (row?.status === "leave") {
    children.push(noteLine(row.note ?? "Approved leave"));
  } else if (row?.status === "absent") {
    children.push(noteLine(row.note ?? ""));
  } else if (row?.signature && row.time_out) {
    const drawn = decodeSignature(row.signature);
    const by = row.signed_by_name ? initialsOf(row.signed_by_name) : initials;
    if (drawn) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 0 },
          children: [
            new ImageRun({
              data: drawn,
              // A signature box on paper is roughly this size. Keeping the
              // drawing's own 2.4:1 shape stops it looking stretched.
              transformation: { width: 108, height: 45 },
              type: "png",
            }),
          ],
        })
      );
    }
    children.push(stampLine(by, officeTime(row.signed_at)));
  } else if (row?.time_out) {
    // Signed out but not yet certified by a supervisor.
    children.push(noteLine("Awaiting signature"));
  }

  if (children.length === 0) children.push(new Paragraph({ text: "" }));

  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    borders: cellBorders(),
    children,
  });
}

/** "MB · 17:04", small, under the drawing. */
function stampLine(initials: string, at: string | null): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 20 },
    children: [
      new TextRun({ text: initials, bold: true, size: 15, color: INK }),
      new TextRun({ text: at ? `  ${at}` : "", size: 15, color: GREY }),
    ],
  });
}

function noteLine(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, size: 16, color: GREY, italics: true })],
  });
}

/** The data URL the browser produced, back into PNG bytes. */
function decodeSignature(dataUrl: string): Buffer | null {
  const comma = dataUrl.indexOf(",");
  if (comma === -1 || !dataUrl.startsWith("data:image/png;base64,")) return null;
  try {
    const bytes = Buffer.from(dataUrl.slice(comma + 1), "base64");
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  }
}

/** First and last initial, the way a signature block is initialled. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function cellBorders() {
  return {
    top:    { style: BorderStyle.SINGLE, size: 2, color: "D4D3C8" },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: "D4D3C8" },
    left:   { style: BorderStyle.SINGLE, size: 2, color: "D4D3C8" },
    right:  { style: BorderStyle.SINGLE, size: 2, color: "D4D3C8" },
  };
}

function cell(
  text: string,
  opts: { center?: boolean; bold?: boolean; small?: boolean } = {}
): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    borders: cellBorders(),
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: opts.small ? 16 : 19,
            color: opts.small ? GREY : INK,
          }),
        ],
      }),
    ],
  });
}

/** The same logo the app uses. Missing file is not worth failing a report over. */
async function loadLogo(): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "agthia-logo.png"));
  } catch {
    return null;
  }
}

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
  dayShort,
  officeTime,
  sheetDate,
  weekOf,
  weekdaysBetween,
} from "@/lib/dates";

export type SheetRow = {
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  status: string;
  signature: string | null;
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
    input.rows.map((row) => [row.work_date.slice(0, 10), row])
  );
  const days = weekdaysBetween(input.fromDate, input.toDate);

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
    rows: [headerRow(), ...days.map((day) => bodyRow(day, byDate.get(day), input.internshipStart, days))],
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
                text: `Generated ${sheetDate(todayIso())} from the Al Foah attendance system. Times are recorded at sign in and sign out inside the office.`,
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
  allDays: string[]
): TableRow {
  const week = weekOf(day, internshipStart);
  // The paper sheet only writes the week number against its first row.
  const firstOfWeek =
    allDays.findIndex((d) => weekOf(d, internshipStart) === week) ===
    allDays.indexOf(day);

  let timeIn = "";
  let timeOut = "";
  let signature = "";

  if (row?.status === "leave") {
    timeIn = "Approved leave";
    signature = row.note ?? "";
  } else if (row?.status === "absent") {
    timeIn = "Absent";
    signature = row.note ?? "";
  } else if (row) {
    timeIn = officeTime(row.time_in) ?? "";
    timeOut = officeTime(row.time_out) ?? "";
    if (row.time_out) {
      signature = row.signature
        ? "Signed electronically"
        : `Signed ${officeTime(row.time_out)}`;
    }
  }

  return new TableRow({
    children: [
      cell(firstOfWeek ? String(week) : "", { center: true, bold: true }),
      cell(dayShort(day), { center: true }),
      cell(sheetDate(day)),
      cell(timeIn, { center: true }),
      cell(timeOut, { center: true }),
      cell(signature, { center: true, small: true }),
    ],
  });
}

function cell(
  text: string,
  opts: { center?: boolean; bold?: boolean; small?: boolean } = {}
): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 2, color: "D4D3C8" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "D4D3C8" },
      left:   { style: BorderStyle.SINGLE, size: 2, color: "D4D3C8" },
      right:  { style: BorderStyle.SINGLE, size: 2, color: "D4D3C8" },
    },
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

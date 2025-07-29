// Enhanced export utilities with proper Excel support
export interface TapChangeLogEntry {
  timestamp: string
  action: string
  fromPosition: number
  toPosition: number
  mode: string
  voltageBefore: number
  voltageAfter: number
  initiatedBy: string
  status: string
}

export interface EventLogEntry {
  timestamp: string
  type: string
  severity: string
  description: string
  additionalData: string
  acknowledged: boolean
}

export class ExportManager {
  static exportTapChangeLogToCSV(data: TapChangeLogEntry[], transformerName: string) {
    const headers = [
      "Timestamp",
      "Action",
      "From Position",
      "To Position",
      "Mode",
      "Voltage Before (V)",
      "Voltage After (V)",
      "Initiated By",
      "Status",
    ]

    const csvData = [
      headers,
      ...data.map((log) => [
        log.timestamp,
        log.action,
        log.fromPosition.toString(),
        log.toPosition.toString(),
        log.mode,
        log.voltageBefore.toString(),
        log.voltageAfter.toString(),
        log.initiatedBy,
        log.status,
      ]),
    ]

    this.downloadCSV(csvData, `${transformerName}_tap_change_log_${this.getDateString()}.csv`)
  }

  static exportEventLogToCSV(data: EventLogEntry[], transformerName: string) {
    const headers = ["Timestamp", "Event Type", "Severity", "Description", "Additional Data", "Acknowledged"]

    const csvData = [
      headers,
      ...data.map((event) => [
        event.timestamp,
        event.type,
        event.severity,
        event.description,
        event.additionalData,
        event.acknowledged ? "Yes" : "No",
      ]),
    ]

    this.downloadCSV(csvData, `${transformerName}_event_log_${this.getDateString()}.csv`)
  }

  static exportTapChangeLogToExcel(data: TapChangeLogEntry[], transformerName: string) {
    const headers = [
      "Timestamp",
      "Action",
      "From Position",
      "To Position",
      "Mode",
      "Voltage Before (V)",
      "Voltage After (V)",
      "Initiated By",
      "Status",
    ]

    const excelData = [
      headers,
      ...data.map((log) => [
        log.timestamp,
        log.action,
        log.fromPosition,
        log.toPosition,
        log.mode,
        log.voltageBefore,
        log.voltageAfter,
        log.initiatedBy,
        log.status,
      ]),
    ]

    this.downloadExcel(excelData, `${transformerName}_tap_change_log_${this.getDateString()}.xlsx`, "Tap Change Log")
  }

  static exportEventLogToExcel(data: EventLogEntry[], transformerName: string) {
    const headers = ["Timestamp", "Event Type", "Severity", "Description", "Additional Data", "Acknowledged"]

    const excelData = [
      headers,
      ...data.map((event) => [
        event.timestamp,
        event.type,
        event.severity,
        event.description,
        event.additionalData,
        event.acknowledged ? "Yes" : "No",
      ]),
    ]

    this.downloadExcel(excelData, `${transformerName}_event_log_${this.getDateString()}.xlsx`, "Event Log")
  }

  private static downloadCSV(data: string[][], filename: string) {
    const csvContent = data
      .map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && (cell.includes(",") || cell.includes('"') || cell.includes("\n"))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell,
          )
          .join(","),
      )
      .join("\n")

    const BOM = "\uFEFF" // UTF-8 BOM for proper Excel encoding
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    this.downloadBlob(blob, filename)
  }

  private static downloadExcel(data: any[][], filename: string, sheetName: string) {
    // Create a simple Excel-compatible XML format
    const xmlHeader = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="${sheetName}">
<Table>`

    const xmlRows = data
      .map(
        (row) =>
          `<Row>${row.map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${this.escapeXml(cell?.toString() || "")}</Data></Cell>`).join("")}</Row>`,
      )
      .join("")

    const xmlFooter = `</Table>
</Worksheet>
</Workbook>`

    const xmlContent = xmlHeader + xmlRows + xmlFooter
    const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" })
    this.downloadBlob(blob, filename)
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  private static downloadBlob(blob: Blob, filename: string) {
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  private static getDateString(): string {
    return new Date().toISOString().split("T")[0]
  }
}

import ExcelJS from 'exceljs';

/**
 * Export a workbook as an Excel file download
 */
export async function exportToExcel(
  workbook: ExcelJS.Workbook,
  fileName: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Add a centered title across a range of cells
 * @param worksheet - ExcelJS worksheet
 * @param title - Title text
 * @param startCell - e.g., 'A1'
 * @param endCell - e.g., 'E1'
 */
export function addTitle(
  worksheet: ExcelJS.Worksheet,
  title: string,
  startCell: string,
  endCell: string
): void {
  worksheet.mergeCells(`${startCell}:${endCell}`);
  const titleCell = worksheet.getCell(startCell);
  titleCell.value = title;
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
}

/**
 * Add a header row with bold and centered text
 * @param worksheet - ExcelJS worksheet
 * @param headers - Array of header strings
 * @param rowIndex - Row number (1-based)
 */
export function addHeaderRow(
  worksheet: ExcelJS.Worksheet,
  headers: string[],
  rowIndex: number
): void {
  const row = worksheet.getRow(rowIndex);
  headers.forEach((header, colIndex) => {
    const cell = row.getCell(colIndex + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
}

/**
 * Set column widths (auto-sizing based on provided widths)
 * @param worksheet - ExcelJS worksheet
 * @param widths - Array of widths for each column (default: all 15)
 */
export function autoSizeColumns(
  worksheet: ExcelJS.Worksheet,
  widths: number[] = [15, 15, 15, 15, 15]
): void {
  worksheet.columns.forEach((col, idx) => {
    if (idx < widths.length) {
      col.width = widths[idx];
    } else {
      col.width = 15;
    }
  });
}
import type { Cell } from '../../lib/importClienti'

/** Rows of the first sheet of an .xlsx file. The reader is loaded only when needed. */
export async function readSpreadsheet(file: File): Promise<Cell[][]> {
  const { readSheet } = await import('read-excel-file/browser')
  return (await readSheet(file)) as unknown as Cell[][]
}

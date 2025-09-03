import * as XLSX from 'xlsx';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

interface ExcelProduct {
  id: number;
  name: string;
  category: string;
  brand: string;
  tags: string;
  brief: string;
  description: string;
  price: number;
  status: string;
  iframeLink: string;
  image: string;
  fileUrl: string;
  intro: string;
  createdAt: string;
}


export const parseExcelFile = (buffer: Buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: ExcelProduct[] = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    console.error('解析Excel文件失败:', error);
    throw error;
  }
};

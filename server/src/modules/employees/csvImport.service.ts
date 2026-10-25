export interface CsvEmployeeRow {
  name: string;
  email: string;
  phone?: string;
  departmentName: string;
  designationTitle: string;
  joinDate: string; // YYYY-MM-DD
  basicSalary: number;
}

export interface CsvRowError {
  row: number;
  field: string;
  reason: string;
}

export interface CsvValidationResult {
  validRows: CsvEmployeeRow[];
  errors: CsvRowError[];
}

export class CsvImportParser {
  public static parse(csvContent: string): CsvValidationResult {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const errors: CsvRowError[] = [];
    const validRows: CsvEmployeeRow[] = [];

    if (lines.length < 2) {
      errors.push({
        row: 0,
        field: 'csv',
        reason: 'CSV file must contain a header line and at least one data row',
      });
      return { validRows, errors };
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const phoneIdx = header.indexOf('phone');
    const deptIdx = header.indexOf('department');
    const desigIdx = header.indexOf('designation');
    const joinDateIdx = header.indexOf('joindate');
    const salaryIdx = header.indexOf('basicsalary');

    if (nameIdx === -1 || emailIdx === -1 || deptIdx === -1 || desigIdx === -1 || joinDateIdx === -1 || salaryIdx === -1) {
      errors.push({
        row: 1,
        field: 'header',
        reason: 'Missing required header columns (name, email, department, designation, joinDate, basicSalary)',
      });
      return { validRows, errors };
    }

    const seenEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const values = lines[i].split(',').map((v) => v.trim());

      const name = values[nameIdx] || '';
      const email = values[emailIdx] || '';
      const phone = phoneIdx !== -1 ? values[phoneIdx] : undefined;
      const departmentName = values[deptIdx] || '';
      const designationTitle = values[desigIdx] || '';
      const joinDate = values[joinDateIdx] || '';
      const salaryStr = values[salaryIdx] || '';

      if (!name) {
        errors.push({ row: rowNum, field: 'name', reason: 'Name is required' });
      }

      if (!email) {
        errors.push({ row: rowNum, field: 'email', reason: 'Email is required' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNum, field: 'email', reason: 'Invalid email format' });
      } else if (seenEmails.has(email.toLowerCase())) {
        errors.push({ row: rowNum, field: 'email', reason: 'Duplicate email within CSV' });
      } else {
        seenEmails.add(email.toLowerCase());
      }

      if (!departmentName) {
        errors.push({ row: rowNum, field: 'department', reason: 'Department is required' });
      }

      if (!designationTitle) {
        errors.push({ row: rowNum, field: 'designation', reason: 'Designation is required' });
      }

      if (!joinDate) {
        errors.push({ row: rowNum, field: 'joinDate', reason: 'Join date is required' });
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(joinDate) || isNaN(new Date(joinDate).getTime())) {
        errors.push({ row: rowNum, field: 'joinDate', reason: 'Join date must be a valid ISO format (YYYY-MM-DD)' });
      }

      const basicSalary = Number(salaryStr);
      if (isNaN(basicSalary) || basicSalary <= 0) {
        errors.push({ row: rowNum, field: 'basicSalary', reason: 'Basic salary must be a positive number' });
      }

      // If no errors for this row, add to valid rows
      const hasRowErrors = errors.some((e) => e.row === rowNum);
      if (!hasRowErrors) {
        validRows.push({
          name,
          email: email.toLowerCase(),
          phone,
          departmentName,
          designationTitle,
          joinDate,
          basicSalary,
        });
      }
    }

    return { validRows, errors };
  }
}

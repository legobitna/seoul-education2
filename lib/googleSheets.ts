import { google } from "googleapis";

// CSV 안전 파서 (쌍따옴표 내 콤마/개행 대응)
export function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let entry = "";

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        entry += '"';
        i++; // 연속된 쌍따옴표는 하나의 따옴표로 처리
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(entry.trim());
      entry = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(entry.trim());
      if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
        result.push(row);
      }
      row = [];
      entry = "";
    } else {
      entry += char;
    }
  }
  if (entry || row.length > 0) {
    row.push(entry.trim());
    result.push(row);
  }
  return result;
}

// 구글 스프레드시트 URL에서 Sheet ID 추출
export function getSheetId(url: string): string | null {
  const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
}

// 공개 링크를 이용하여 특정 시트의 CSV를 획득 (가장 빠름)
export async function fetchSheetCSV(url: string, sheetName?: string): Promise<string[][]> {
  const sheetId = getSheetId(url);
  if (!sheetId) throw new Error("유효하지 않은 구글 스프레드시트 URL입니다.");

  let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  if (sheetName) {
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  }

  const response = await fetch(csvUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`스프레드시트 데이터를 가져오지 못했습니다. (Status: ${response.status})`);
  }

  const text = await response.text();
  return parseCSV(text);
}

// 서비스 계정 키를 사용해 분류 결과 구글 시트에 기록
export async function updateGoogleSheet(
  url: string,
  credentialsJson: string,
  updates: { id: string; category: string }[]
): Promise<void> {
  const sheetId = getSheetId(url);
  if (!sheetId) throw new Error("유효하지 않은 구글 스프레드시트 URL입니다.");

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    throw new Error("Google Service Account JSON Key 파싱에 실패했습니다.");
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // 1. 첫 번째 시트의 전체 데이터 가져오기 (행 번호 매칭용)
  // 일반적으로 첫 번째 탭의 이름을 몰라도 'Sheet1' 또는 시트의 인덱스를 쓸 수 있지만, 
  // API의 경우 '시트1' 이나 실제 이름을 지정해야 할 수 있습니다. 
  // 여기서는 스프레드시트의 메타데이터를 먼저 조회하여 첫 번째 시트의 실제 이름을 가져옵니다.
  const spreadsheetMeta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  });

  const firstSheetName = spreadsheetMeta.data.sheets?.[0]?.properties?.title;
  if (!firstSheetName) throw new Error("스프레드시트에서 시트를 찾을 수 없습니다.");

  const readResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${firstSheetName}'!A:E`, // 민원번호 A열, 분류 E열 기준
  });

  const rows = readResponse.data.values;
  if (!rows || rows.length === 0) return;

  // 헤더 탐색 및 매핑
  const headers = rows[0].map(h => h.trim());
  const idIndex = headers.indexOf("민원번호");
  const categoryIndex = headers.indexOf("분류");

  if (idIndex === -1 || categoryIndex === -1) {
    throw new Error("스프레드시트에 '민원번호' 또는 '분류' 열이 존재하지 않습니다.");
  }

  // 구글 시트의 열 인덱스를 알파벳(A, B, C...)으로 매핑
  const getColLetter = (index: number) => String.fromCharCode(65 + index);
  const categoryColLetter = getColLetter(categoryIndex);

  const batchUpdates = [];

  // 각 업데이트 대상에 대해 행 인덱스 매칭 후 업데이트 요청 작성
  for (const update of updates) {
    const rowIndex = rows.findIndex((row) => row[idIndex] === update.id);
    if (rowIndex !== -1) {
      // 1-indexed (행 번호는 1부터 시작하므로 rowIndex + 1)
      batchUpdates.push({
        range: `'${firstSheetName}'!${categoryColLetter}${rowIndex + 1}`,
        values: [[update.category]],
      });
    }
  }

  if (batchUpdates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: batchUpdates,
      },
    });
  }
}

import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { getGeminiApiKey } from "./settings";

export interface ComplaintInput {
  id: string;
  title: string;
  content: string;
}

export interface CategoryInput {
  name: string;
  description: string;
  keywords: string;
}

export interface ClassificationResult {
  id: string;
  category: string;
  confidence: number; // 0 ~ 100
  isUncertain: boolean;
  uncertainReason: string | null;
}

const MODEL_NAME = "gemini-2.5-flash";

// Gemini API를 사용해 민원 데이터들을 배치로 분류
export async function classifyComplaintsBatch(
  complaints: ComplaintInput[],
  categories: CategoryInput[],
  apiKey?: string
): Promise<ClassificationResult[]> {
  const key = apiKey || (await getGeminiApiKey());
  if (!key) {
    throw new Error("Gemini API 키가 설정되지 않았습니다. 설정 페이지나 .env에서 API 키를 입력해 주세요.");
  }

  if (complaints.length === 0) return [];

  const genAI = new GoogleGenerativeAI(key);

  // 출력 구조 정의 (Gemini JSON Schema)
  const responseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      results: {
        type: SchemaType.ARRAY,
        description: "각 민원 건별 분류 결과 리스트",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: {
              type: SchemaType.STRING,
              description: "민원번호 (예: M2024-0001)",
            },
            category: {
              type: SchemaType.STRING,
              description: "분류된 카테고리 이름 (반드시 제공된 카테고리 중 하나여야 함)",
            },
            confidence: {
              type: SchemaType.INTEGER,
              description: "AI의 분류 신뢰도 점수 (0 ~ 100 사이의 정수)",
            },
            isUncertain: {
              type: SchemaType.BOOLEAN,
              description: "민원 내용이 너무 모호하거나, 정보가 부족하거나, 카테고리에 적합하지 않아 분류가 불확실하고 어려운 경우 true",
            },
            uncertainReason: {
              type: SchemaType.STRING,
              description: "isUncertain이 true인 경우 분류가 모호한 이유 설명. 그 외엔 null 또는 빈 문자열",
            },
          },
          required: ["id", "category", "confidence", "isUncertain"],
        },
      },
    },
    required: ["results"],
  };

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1, // 결정적이고 정확한 분류를 위해 낮은 온도를 설정
    },
  });

  const categoriesPrompt = categories
    .map((c) => `- **${c.name}**: ${c.description} (예시 키워드: ${c.keywords})`)
    .join("\n");

  const complaintsPrompt = complaints
    .map((c) => `[민원번호: ${c.id}]\n제목: ${c.title}\n내용: ${c.content}`)
    .join("\n\n---\n\n");

  const prompt = `
당신은 교육청에 접수되는 민원 데이터를 자동으로 분류하는 AI 전문가입니다.
아래 제공되는 [분류 카테고리 및 기준]을 엄격하게 준수하여 [민원 목록]을 알맞은 카테고리로 분류하십시오.

[분류 카테고리 및 기준]
${categoriesPrompt}

[주의사항]
1. 모든 민원은 반드시 비어있지 않아야 하며, 지정된 카테고리 중 하나로 맵핑되어야 합니다.
2. 만약 민원 내용이 너무 모호하거나, 짧거나, 노이즈 데이터여서 분류하기 매우 어렵거나(신뢰도가 낮을 것으로 판단됨), 혹은 적절한 카테고리가 전혀 없다고 생각되는 경우:
   - 카테고리는 가장 유사한 것 또는 '기타'로 배정하되, 반드시 "isUncertain" 값을 true로 설정하고 "uncertainReason"에 사유를 기술하십시오.
3. 분류 기준을 꼼꼼하게 대조하여 신뢰도(0~100)를 산출해 주십시오.

[분류할 민원 목록]
${complaintsPrompt}
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // JSON 응답 파싱
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as { results: ClassificationResult[] };

    if (!parsed || !Array.isArray(parsed.results)) {
      throw new Error("Gemini AI가 예상치 못한 구조의 JSON을 반환했습니다.");
    }

    return parsed.results;
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    throw new Error(`AI 민원 분류 중 오류가 발생했습니다: ${(error as Error).message}`);
  }
}

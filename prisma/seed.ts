import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: "주간 팀 회의",
      promptHint:
        "주간 진행 상황, 블로커, 다음 주 목표를 중심으로 정리하세요.",
    },
    {
      name: "프로젝트 검토",
      promptHint:
        "일정, 리스크, 의사결정, 담당자 할당을 명확히 정리하세요.",
    },
    {
      name: "빈 템플릿",
      promptHint: "",
    },
  ];

  for (const t of templates) {
    const existing = await prisma.meetingTemplate.findFirst({
      where: { name: t.name },
    });
    if (!existing) {
      await prisma.meetingTemplate.create({ data: t });
    }
  }

  console.log("Seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

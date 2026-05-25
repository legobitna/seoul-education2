"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ContactGroup {
  id: string;
  name: string;
  contacts: { id: string; email: string; name: string | null }[];
}

interface Template {
  id: string;
  name: string;
  promptHint: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [geminiKey, setGeminiKey] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateHint, setNewTemplateHint] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.smtpUser) setSmtpUser(d.smtpUser);
        if (d.smtpFrom) setSmtpFrom(d.smtpFrom);
      });
    fetch("/api/contacts")
      .then((r) => r.json())
      .then(setGroups);
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates);
  }, []);

  const testGemini = async () => {
    setMsg("Gemini 연결 테스트 중...");
    const res = await fetch("/api/settings/test-gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: geminiKey }),
    });
    const data = await res.json();
    setMsg(data.ok ? "✅ Gemini 연결 성공" : `❌ ${data.error}`);
  };

  const sendTestEmail = async () => {
    setMsg("테스트 메일 발송 중...");
    const res = await fetch("/api/settings/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smtpUser,
        smtpPass,
        smtpFrom: smtpFrom || smtpUser,
        testTo: testEmail || smtpUser,
      }),
    });
    const data = await res.json();
    setMsg(data.ok ? "✅ 테스트 메일 발송 성공" : `❌ ${data.error}`);
  };

  const saveAndFinish = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        geminiApiKey: geminiKey || undefined,
        smtpUser,
        smtpPass: smtpPass || undefined,
        smtpFrom: smtpFrom || smtpUser,
        markComplete: true,
      }),
    });
    router.push("/");
  };

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createGroup", name: newGroupName }),
    });
    const g = await res.json();
    setGroups([...groups, g]);
    setNewGroupName("");
  };

  const addContact = async (groupId: string, email: string, name: string) => {
    if (!email.includes("@")) return;
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addContact",
        groupId,
        email,
        name: name || null,
      }),
    });
    const c = await res.json();
    setGroups(
      groups.map((g) =>
        g.id === groupId ? { ...g, contacts: [...g.contacts, c] } : g
      )
    );
  };

  const addTemplate = async () => {
    if (!newTemplateName.trim()) return;
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: newTemplateName,
        promptHint: newTemplateHint,
      }),
    });
    const t = await res.json();
    setTemplates([...templates, t]);
    setNewTemplateName("");
    setNewTemplateHint("");
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-slate-500 text-sm mt-1">
          최초 1회 설정 후 바로 회의를 시작할 수 있습니다.
        </p>
      </div>

      {msg && (
        <p className="text-sm p-3 bg-slate-100 rounded-lg">{msg}</p>
      )}

      <section className="card space-y-4">
        <h2 className="font-semibold">1. Gemini API</h2>
        <p className="text-xs text-slate-500">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            Google AI Studio
          </a>
          에서 무료 API 키를 발급하세요.
        </p>
        <input
          className="input"
          type="password"
          placeholder="Gemini API Key"
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={testGemini}>
          연결 테스트
        </button>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">2. Gmail 발송</h2>
        <p className="text-xs text-slate-500">
          Gmail 2단계 인증 후{" "}
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            앱 비밀번호
          </a>
          를 생성해 입력하세요.
        </p>
        <input
          className="input"
          placeholder="Gmail 주소"
          value={smtpUser}
          onChange={(e) => setSmtpUser(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="앱 비밀번호 (16자)"
          value={smtpPass}
          onChange={(e) => setSmtpPass(e.target.value)}
        />
        <input
          className="input"
          placeholder="발신 표시 (기본: Gmail 주소)"
          value={smtpFrom}
          onChange={(e) => setSmtpFrom(e.target.value)}
        />
        <input
          className="input"
          placeholder="테스트 수신 이메일"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={sendTestEmail}>
          테스트 메일 보내기
        </button>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">3. 자주 쓰는 참석자 (선택)</h2>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="그룹 이름 (예: 개발팀)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={addGroup}>
            그룹 추가
          </button>
        </div>
        {groups.map((g) => (
          <ContactGroupEditor
            key={g.id}
            group={g}
            onAdd={(email, name) => addContact(g.id, email, name)}
          />
        ))}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">4. 회의 템플릿 (선택)</h2>
        <ul className="text-sm space-y-1 text-slate-600">
          {templates.map((t) => (
            <li key={t.id}>• {t.name}</li>
          ))}
        </ul>
        <input
          className="input"
          placeholder="템플릿 이름"
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
        />
        <textarea
          className="input min-h-[80px]"
          placeholder="AI 프롬프트 힌트 (선택)"
          value={newTemplateHint}
          onChange={(e) => setNewTemplateHint(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={addTemplate}>
          템플릿 추가
        </button>
      </section>

      <button type="button" className="btn btn-primary w-full btn-lg" onClick={saveAndFinish}>
        설정 완료 → 대시보드로
      </button>
    </div>
  );
}

function ContactGroupEditor({
  group,
  onAdd,
}: {
  group: ContactGroup;
  onAdd: (email: string, name: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="border border-slate-100 rounded-lg p-3">
      <p className="font-medium text-sm mb-2">{group.name}</p>
      <ul className="text-xs text-slate-600 mb-2 space-y-1">
        {group.contacts.map((c) => (
          <li key={c.id}>{c.name ? `${c.name} - ${c.email}` : c.email}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="input text-xs"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input text-xs w-20"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary text-xs"
          onClick={() => {
            onAdd(email, name);
            setEmail("");
            setName("");
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

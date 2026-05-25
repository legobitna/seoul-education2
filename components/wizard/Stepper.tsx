const STEPS = ["회의 준비", "녹음", "완료"];

export function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`w-12 h-0.5 ${done || active ? "bg-blue-600" : "bg-slate-200"}`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  active
                    ? "bg-blue-600 text-white"
                    : done
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : step}
              </div>
              <span
                className={`text-xs ${active ? "text-blue-600 font-medium" : "text-slate-500"}`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { getActiveRules } from "@/data/course/rules";
import type { HarmonyRule } from "@/types/course";

type Props = {
  activeRuleIds: string[];
  newRuleIds?: string[]; // reglas introducidas en esta lección específicamente
  locale: string;
};

const SEVERITY_STYLES: Record<HarmonyRule["severity"], string> = {
  error: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  suggestion: "bg-blue-50 border-blue-200 text-blue-700",
};

const SEVERITY_ICONS: Record<HarmonyRule["severity"], string> = {
  error: "🚫",
  warning: "⚠️",
  suggestion: "💡",
};

export default function RulesReference({
  activeRuleIds,
  newRuleIds = [],
  locale,
}: Props) {
  const rules = getActiveRules(activeRuleIds);
  const es = locale === "es";

  if (rules.length === 0) return null;

  const newRules = rules.filter((r) => newRuleIds.includes(r.id));
  const previousRules = rules.filter((r) => !newRuleIds.includes(r.id));

  return (
    <div className="my-8 rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
          {es ? "Reglas activas en esta lección" : "Active rules in this lesson"}
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Reglas nuevas */}
        {newRules.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
              ✨ {es ? "Nuevas en esta lección" : "New in this lesson"}
            </p>
            {newRules.map((rule) => (
              <RuleItem key={rule.id} rule={rule} locale={locale} isNew />
            ))}
          </div>
        )}

        {/* Reglas de lecciones anteriores */}
        {previousRules.length > 0 && (
          <div>
            {newRules.length > 0 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">
                {es ? "Acumuladas de lecciones anteriores" : "From previous lessons"}
              </p>
            )}
            {previousRules.map((rule) => (
              <RuleItem key={rule.id} rule={rule} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleItem({
  rule,
  locale,
  isNew = false,
}: {
  rule: HarmonyRule;
  locale: string;
  isNew?: boolean;
}) {
  const es = locale === "es";
  return (
    <div
      className={`
        flex gap-3 p-3 rounded-lg border text-sm mb-2
        ${SEVERITY_STYLES[rule.severity]}
        ${isNew ? "ring-2 ring-offset-1 ring-green-200" : ""}
      `}
    >
      <span className="text-base flex-shrink-0 mt-0.5">
        {SEVERITY_ICONS[rule.severity]}
      </span>
      <div>
        <p className="font-semibold">
          {rule.name[locale as "es" | "en"]}
        </p>
        <p className="text-xs opacity-80 mt-0.5">
          {rule.description[locale as "es" | "en"]}
        </p>
      </div>
    </div>
  );
}

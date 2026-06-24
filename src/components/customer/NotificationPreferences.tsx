import { Bell, BellOff, Info, RotateCcw } from "lucide-react";
import { useCustomerNotificationPreferences } from "@/hooks/customer/useCustomerNotificationPreferences";
import type { NotificationPreferences as NotificationPreferencesData } from "@/types/notification-preferences";
import {
  getNotificationDescription,
  getNotificationLabel,
} from "@/types/notification-preferences";

interface NotificationPreferencesProps {
  onUpdate?: (preferences: NotificationPreferencesData) => void;
}

export function NotificationPreferences({ onUpdate }: NotificationPreferencesProps) {
  const {
    preferences,
    isLoading,
    error,
    updatePreferences,
    resetPreferences,
    isUpdating,
    isResetting,
    updateSucceeded,
    updateFailed,
  } = useCustomerNotificationPreferences({ onUpdate });

  const handleToggle = (key: keyof NotificationPreferencesData) => {
    if (!preferences) {
      return;
    }

    updatePreferences({ [key]: !preferences[key] });
  };

  const handleReset = () => {
    if (confirm("Restaurar as preferencias de notificacao para o padrao?")) {
      resetPreferences();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(42,100%,55%)] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm font-medium text-red-100">Nao foi possivel carregar as preferencias de notificacao.</p>
      </div>
    );
  }

  if (!preferences) {
    return null;
  }

  const preferenceKeys = Object.keys(preferences) as Array<keyof NotificationPreferencesData>;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <Bell className="h-5 w-5 text-[hsl(42,100%,55%)]" />
            Preferencias de notificacao
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Controle os avisos opcionais que voce quer receber.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-[hsl(42,100%,55%)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar padrao
        </button>
      </div>

      <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-300" />
          <p className="text-sm leading-relaxed text-sky-100">
            Notificacoes criticas, como escolha de personagem, pagamentos, confirmacoes de pedido
            e atrasos de producao, continuam sempre ativas porque afetam seus pedidos.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)]">
        {preferenceKeys.map((key) => {
          const isEnabled = preferences[key];
          const label = getNotificationLabel(key);
          const description = getNotificationDescription(key);

          return (
            <div
              key={key}
              className="border-b border-[hsl(0,0%,12%)] p-4 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isEnabled ? (
                      <Bell className="h-5 w-5 text-[hsl(42,100%,55%)]" />
                    ) : (
                      <BellOff className="h-5 w-5 text-zinc-500" />
                    )}
                    <h3 className="font-medium text-white">{label}</h3>
                  </div>
                  <p className="ml-7 mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(key)}
                  disabled={isUpdating}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(42,100%,55%)] focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${
                    isEnabled ? "bg-[hsl(42,100%,45%)]" : "bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`Alternar ${label}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {updateSucceeded && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-100">Preferencias atualizadas com sucesso.</p>
        </div>
      )}

      {updateFailed && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-100">
            Nao foi possivel atualizar as preferencias. Tente novamente.
          </p>
        </div>
      )}
    </section>
  );
}

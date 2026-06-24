import { CustomerChat } from "./CustomerChat";

export function AppLayoutExample() {
  return (
    <div className="min-h-screen">
      <header>Header</header>
      <main>Main Content</main>
      <footer>Footer</footer>
      <CustomerChat />
    </div>
  );
}

export function ConditionalChatExample() {
  const isAuthenticated = true;

  return (
    <div className="min-h-screen">
      <main>Main Content</main>
      {isAuthenticated ? <CustomerChat /> : null}
    </div>
  );
}

export function CustomerDashboardExample() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">Meu Painel</h1>

      <div className="grid gap-6">
        <div className="rounded-lg bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Meus Pedidos</h2>
        </div>

        <div className="rounded-lg bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Minha Conta</h2>
        </div>
      </div>

      <CustomerChat />
    </div>
  );
}

import { MemberGroupList } from '@/components/groups/MemberGroupList';

export default function MemberGroupsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Meus Grupos</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe as mensagens dos grupos que você participa
        </p>
      </div>

      <MemberGroupList />
    </div>
  );
}

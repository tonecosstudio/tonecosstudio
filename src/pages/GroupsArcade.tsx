import { ArcadePage, ArcadeHero } from "@/components/arcade/ArcadeLayout";
import { MemberGroupList } from "@/components/groups/MemberGroupList";

export default function GroupsArcade() {
  return (
    <ArcadePage title="Meus Grupos | ORDAX" description="Acompanhe seus grupos e mensagens">
      <ArcadeHero
        badge="SQUAD COMMS"
        title="MEUS GRUPOS"
        subtitle="COMUNICAÇÃO COM SEUS ESQUADRÕES"
      />
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <MemberGroupList />
      </section>
    </ArcadePage>
  );
}

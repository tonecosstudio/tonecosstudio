import { ArcadeHero } from "@/components/arcade/ArcadeLayout";
import { Page } from "@/components/layouts/Page";
import { BRAND_NAME } from "@/config/brand";
import { MemberGroupList } from "@/components/groups/MemberGroupList";

export default function GroupsArcade() {
  return (
    <Page title={`Meus Grupos | ${BRAND_NAME}`} description="Acompanhe seus grupos e mensagens">
      <ArcadeHero
        badge="SQUAD COMMS"
        title="MEUS GRUPOS"
        subtitle="COMUNICAÇÃO COM SEUS ESQUADRÕES"
      />
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <MemberGroupList />
      </section>
    </Page>
  );
}

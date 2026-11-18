import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCharacterReviewInventory,
  fetchPublishedCatalogModels,
  mergeCandidateAndPublicModels,
  reconcileCandidateContract,
  serializeReviewQueueCsv,
} from "./character-catalog-inventory.mjs";

const row = (overrides = {}) => ({
  id: "model-1",
  slug: "character-model",
  code: "TC-001",
  name: "Hero Figure",
  variant_name: "Standard",
  category: "Anime",
  category_slug: "anime",
  franchise: "Series",
  franchise_slug: "series",
  collection: null,
  folder_path: null,
  ...overrides,
});

const response = (payload) => Response.json(payload);

test("paginates the public catalog and creates review slots without inventing identities", async () => {
  const requests = [];
  const fetcher = async (input) => {
    const url = new URL(input);
    requests.push(url);
    if (!url.searchParams.has("cursor")) {
      return response({ items: [row()], nextCursor: "page-2" });
    }
    return response({
      items: [row({ id: "model-2", slug: "second-model", name: "Second Figure" })],
      nextCursor: null,
    });
  };

  const result = await fetchPublishedCatalogModels({
    baseUrl: "https://catalog.example.test/catalogo-api/",
    fetcher,
    pageDelayMs: 0,
  });
  const inventory = buildCharacterReviewInventory({
    ...result,
    capturedAt: "2026-11-17T00:00:00.000Z",
  });

  assert.equal(result.pages, 2);
  assert.equal(result.models.length, 2);
  assert.equal(requests[0].searchParams.get("limit"), "60");
  assert.equal(requests[1].searchParams.get("cursor"), "page-2");
  assert.equal(inventory.recordCount, 2);
  assert.equal(inventory.policy.verifiedCharacterLinks, 0);
  assert.equal(inventory.policy.biographyDrafts, 0);
  assert.equal(inventory.models[0].characterReview.status, "pending_evidence");
  assert.equal(inventory.models[0].characterReview.characterId, null);
  assert.deepEqual(inventory.models[0].characterReview.evidence, []);
  assert.equal(inventory.models[0].biographyReview.status, "not_started_identity_unverified");
});

test("research preparation references only inventory IDs and remains unapproved", () => {
  const packet = JSON.parse(readFileSync(
    new URL("../../docs/review/character-editorial-research-preparation.json", import.meta.url),
    "utf8",
  ));
  const queueLines = readFileSync(
    new URL("../../docs/review/character-catalog-review-queue.csv", import.meta.url),
    "utf8",
  ).trimEnd().split(/\r?\n/);
  const inventoryModels = new Map(queueLines.slice(1).map((line) => {
    const [modelId, modelSlug] = line.split(",", 3);
    return [modelId, modelSlug];
  }));
  const sourceIds = new Set(packet.sources.map((source) => source.id));
  const links = packet.candidates.flatMap((candidate) => candidate.candidateModelLinks);
  const relationshipKeys = packet.candidates.flatMap((candidate) =>
    candidate.candidateModelLinks.map((link) => `${candidate.candidateName}:${link.modelId}`));

  assert.equal(packet.authority, "review-only; not a character catalog or publication source");
  assert.equal(packet.snapshot.catalogModelCount, inventoryModels.size);
  assert.equal(packet.snapshot.sourceResearchedIdentityCount, 85);
  assert.equal(packet.snapshot.preparedCandidateModelLinkCount, 869);
  assert.equal(packet.candidates.length, 85);
  assert.equal(packet.sources.length, 96);
  assert.equal(new Set(packet.sources.map((source) => source.url)).size, packet.sources.length);
  assert.equal(packet.policy.publicProjectionEligible, false);
  assert.equal(packet.policy.databaseWritePerformed, false);
  assert.equal(packet.policy.approvedIdentityCount, 0);
  assert.equal(packet.policy.approvedModelLinkCount, 0);
  assert.equal(packet.policy.preparedIdentityCount, 85);
  assert.equal(packet.policy.humanReviewedIdentityCount, 0);
  assert.equal(packet.policy.preparedCandidateModelLinkCount, 869);
  assert.equal(packet.policy.humanReviewedModelLinkCount, 0);
  assert.equal(packet.policy.independentlyEvidenceBackedModelLinkCount, 0);
  assert.equal(links.length, 869);
  assert.equal(new Set(relationshipKeys).size, links.length);

  const thorCandidates = packet.candidates.filter((candidate) =>
    candidate.catalogDisplayNameCandidate === "Thor");
  assert.equal(thorCandidates.length, 2);
  const marvelThor = thorCandidates.find((candidate) => candidate.candidateName === "Thor Odinson");
  const godOfWarThor = thorCandidates.find((candidate) =>
    candidate.candidateName === "Thor (God of War Ragnarök)");
  assert.equal(marvelThor.candidateModelLinks.length, 17);
  assert.equal(godOfWarThor.candidateModelLinks.length, 1);
  assert.deepEqual(marvelThor.catalogFranchiseCandidates, ["Equipes e Grupos"]);
  assert.deepEqual(godOfWarThor.catalogFranchiseCandidates, ["God of War"]);
  assert.equal(marvelThor.identityStatus, "prepared_pending_human_review");
  assert.equal(godOfWarThor.identityStatus, "prepared_pending_human_review");
  assert.ok(marvelThor.claims.some((claim) =>
    claim.attribute === "identity.ambiguity.alternate_mantle_holder" &&
    claim.sourceIds.includes("marvel-jane-foster-thor")));

  const trunks = packet.candidates.find((candidate) =>
    candidate.candidateName === "Trunks (future teen)");
  assert.equal(trunks.candidateModelLinks.length, 8);
  assert.match(trunks.biographyDraft, /adolescente.*futuro/i);
  assert.equal(trunks.identityStatus, "prepared_pending_human_review");
  assert.equal(packet.candidates.find((candidate) => candidate.candidateName === "Dante")
    .candidateModelLinks.length, 9);
  assert.equal(packet.candidates.find((candidate) => candidate.candidateName === "Recoome")
    .candidateModelLinks.length, 8);
  assert.equal(packet.candidates.find((candidate) => candidate.candidateName === "Daredevil")
    .candidateModelLinks.length, 7);
  assert.equal(packet.candidates.find((candidate) => candidate.candidateName === "Gambit")
    .candidateModelLinks.length, 7);
  const marvelReviewCandidates = [
    ["Apocalypse (En Sabah Nur)", "Apocalipse", 7],
    ["Iron Man", "Homem de Ferro", 7],
    ["Sabretooth (Victor Creed candidate)", "Dentes de Sabre", 7],
    ["Beast (Henry McCoy candidate)", "Fera", 6],
  ];
  for (const [candidateName, catalogLabel, expectedModels] of marvelReviewCandidates) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate);
    assert.equal(candidate.catalogDisplayNameCandidate, catalogLabel);
    assert.equal(candidate.candidateModelLinks.length, expectedModels);
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.equal(candidate.franchiseCandidate, "Marvel Universe");
    assert.ok(candidate.ambiguities.length > 0);
  }
  const additionalPublisherCandidates = [
    ["Ada Wong (Resident Evil candidate)", "Ada Wong", "Resident Evil", 6],
    ["Sonya Blade (Mortal Kombat 11 timeline candidate)", "Sonya Blade", "Mortal Kombat", 6],
    ["Guts (Black Swordsman candidate)", "Guts", "Berserk", 9],
    ["Ciri (The Witcher 3 candidate)", "Ciri", "The Witcher", 6],
  ];
  for (const [candidateName, catalogLabel, franchise, expectedModels] of additionalPublisherCandidates) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate);
    assert.equal(candidate.catalogDisplayNameCandidate, catalogLabel);
    assert.equal(candidate.franchiseCandidate, franchise);
    assert.equal(candidate.candidateModelLinks.length, expectedModels);
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.ok(candidate.ambiguities.length > 0);
  }
  const finalResearchCandidates = [
    ["Cable (Nathan Summers candidate)", "Cable", "Marvel Universe", 6],
    ["He-Man (Prince Adam candidate)", "He-Man", "Masters of the Universe", 7],
  ];
  for (const [candidateName, catalogLabel, franchise, expectedModels] of finalResearchCandidates) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate);
    assert.equal(candidate.catalogDisplayNameCandidate, catalogLabel);
    assert.equal(candidate.franchiseCandidate, franchise);
    assert.equal(candidate.candidateModelLinks.length, expectedModels);
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.ok(candidate.ambiguities.length > 0);
  }
  const finalPublisherCandidates = [
    ["Zarbon (Dragon Ball candidate)", "Zarbon", "Dragon Ball", 6],
    ["Akuma (Street Fighter V candidate)", "Akuma", "Street Fighter", 6],
    ["Michelangelo (Teenage Mutant Ninja Turtles candidate)", "Michelangelo", "Teenage Mutant Ninja Turtles", 6],
  ];
  for (const [candidateName, catalogLabel, franchise, expectedModels] of finalPublisherCandidates) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate);
    assert.equal(candidate.catalogDisplayNameCandidate, catalogLabel);
    assert.equal(candidate.franchiseCandidate, franchise);
    assert.equal(candidate.candidateModelLinks.length, expectedModels);
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.ok(candidate.ambiguities.length > 0);
  }
  const identityAmbiguityCandidates = [
    ["Colossus (Piotr Rasputin candidate)", "Colossus", "Marvel Universe", 6],
    ["Psylocke (Betsy/Kwannon unresolved)", "Psylocke", "Marvel Universe", 6],
    ["Ghost Rider (mantle; bearer unresolved)", "Motoqueiro Fantasma", "Marvel Universe", 6],
  ];
  for (const [candidateName, catalogLabel, franchise, expectedModels] of identityAmbiguityCandidates) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate);
    assert.equal(candidate.catalogDisplayNameCandidate, catalogLabel);
    assert.equal(candidate.franchiseCandidate, franchise);
    assert.equal(candidate.candidateModelLinks.length, expectedModels);
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.ok(candidate.ambiguities.length > 0);
  }
  const raphael = packet.candidates.find((candidate) =>
    candidate.candidateName === "Raphael (Nickelodeon candidate)");
  assert.ok(raphael);
  assert.equal(raphael.catalogDisplayNameCandidate, "Raphael");
  assert.equal(raphael.franchiseCandidate, "Teenage Mutant Ninja Turtles");
  assert.equal(raphael.candidateModelLinks.length, 6);
  assert.equal(raphael.identityStatus, "prepared_pending_human_review");
  assert.ok(raphael.ambiguities.length > 0);
  const latestCandidates = [
    ["Sub-Zero (Bi-Han/Kuai Liang mantle unresolved)", "Sub-Zero", "Mortal Kombat", 5],
    ["Lara Croft (Tomb Raider candidate)", "Lara Croft", "Tomb Raider", 5],
  ];
  for (const [candidateName, catalogLabel, franchise, expectedModels] of latestCandidates) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate);
    assert.equal(candidate.catalogDisplayNameCandidate, catalogLabel);
    assert.equal(candidate.franchiseCandidate, franchise);
    assert.equal(candidate.candidateModelLinks.length, expectedModels);
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.ok(candidate.ambiguities.length > 0);
  }
  const latestMarvelCandidates = [
    ["Emma Frost", "Emma Frost", "Marvel Universe", 5],
    ["Loki (Marvel comics candidate)", "Loki", "Marvel Universe", 5],
    ["Doctor Doom (Victor von Doom candidate)", "Doutor Destino", "Marvel Universe", 5],
    ["Nightcrawler (Kurt Wagner, X-Men ’97 candidate)", "Noturno", "Marvel Universe", 6],
  ];
  for (const [candidateName, catalogLabel, franchise, expectedModels] of latestMarvelCandidates) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate);
    assert.equal(candidate.catalogDisplayNameCandidate, catalogLabel);
    assert.equal(candidate.franchiseCandidate, franchise);
    assert.equal(candidate.candidateModelLinks.length, expectedModels);
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.ok(candidate.ambiguities.length > 0);
  }
  const newestResearchCandidates = [
    ["All Might (My Hero Academia anime profile candidate)", "All Might", "My Hero Academia", 5],
    ["Leon S. Kennedy (Resident Evil candidate)", "Leon S. Kennedy", "Resident Evil", 5],
    ["Naruto Uzumaki (official profile candidate)", "Naruto Uzumaki", "Naruto", 5],
    ["Krillin (Goku Training Arc; Kuririn label candidate)", "Kuririn", "Dragon Ball", 5],
    ["Cloud Strife (Final Fantasy VII Rebirth candidate)", "Cloud", "Final Fantasy VII", 5],
    ["Tifa Lockhart (Final Fantasy VII Rebirth candidate)", "Tifa", "Final Fantasy VII", 5],
    ["Burter (Namek saga candidate)", "Burter", "Dragon Ball", 5],
    ["Shenron (Earth Dragon Balls; Shenlong label candidate)", "Shenlong", "Dragon Ball", 5],
    ["Mumm-Ra (1985 ThunderCats profile candidate)", "Mumm-Ra", "ThunderCats", 6],
    ["Cheetara (1985 ThunderCats profile candidate)", "Cheetara", "ThunderCats", 5],
    ["Lunch (Launch catalog localization candidate)", "Launch", "Dragon Ball", 6],
    ["Mileena (Mortal Kombat 1 roster candidate)", "Mileena", "Mortal Kombat", 5],
    ["Goro (Mortal Kombat 1 Kameo profile candidate)", "Goro", "Mortal Kombat", 6],
    ["T-800/Carl (Dark Fate continuity candidate)", "T-800", "Terminator", 7],
    ["John Wick (film franchise candidate)", "John Wick", "John Wick", 5],
    ["Natasha Romanoff/Romanova (Black Widow comics candidate)", "Viúva Negra", "Marvel Universe", 5],
    ["Norrin Radd (Silver Surfer comics candidate)", "Surfista Prateado", "Marvel Universe", 5],
  ];
  for (const [candidateName, catalogLabel, franchise, expectedModels] of newestResearchCandidates) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate);
    assert.equal(candidate.catalogDisplayNameCandidate, catalogLabel);
    assert.equal(candidate.franchiseCandidate, franchise);
    assert.equal(candidate.candidateModelLinks.length, expectedModels);
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.ok(candidate.ambiguities.length > 0);
    assert.ok(candidate.claims.every((claim) => claim.reviewStatus === "pending_human_review"));
    assert.ok(candidate.candidateModelLinks.every((link) =>
      link.independentModelEvidence.length === 0 && link.reviewRequired));
  }
  const allMight = packet.candidates.find((item) =>
    item.candidateName === "All Might (My Hero Academia anime profile candidate)");
  assert.ok(allMight.claims.some((claim) =>
    claim.attribute === "biography.fact.eighth_successor_and_teacher" &&
    claim.sourceIds.includes("heroaca-all-might-character")));
  const leon = packet.candidates.find((item) =>
    item.candidateName === "Leon S. Kennedy (Resident Evil candidate)");
  assert.ok(leon.claims.some((claim) =>
    claim.attribute === "biography.fact.raccoon_city_and_government_agent" &&
    claim.sourceIds.includes("capcom-leon-resident-evil-portal")));
  const naruto = packet.candidates.find((item) =>
    item.candidateName === "Naruto Uzumaki (official profile candidate)");
  assert.ok(naruto.claims.some((claim) =>
    claim.attribute === "biography.fact.seventh_hokage_in_boruto" &&
    claim.sourceIds.includes("naruto-official-character-overview")));
  assert.ok(naruto.candidateModelLinks.every((link) =>
    !["mdl_4b49b9f65ccc3b7d874c", "mdl_d822c2582bcc102e6ef5"].includes(link.modelId)));
  const newestSourceClaims = [
    ["Krillin (Goku Training Arc; Kuririn label candidate)", "dragon-ball-krillin-goku-training-arc", "biography.fact.goku_training_arc"],
    ["Cloud Strife (Final Fantasy VII Rebirth candidate)", "square-enix-ffvii-rebirth-cloud", "biography.fact.rebirth_mercenary_and_avalanche"],
    ["Tifa Lockhart (Final Fantasy VII Rebirth candidate)", "square-enix-ffvii-rebirth-tifa", "biography.fact.rebirth_avalanche_and_search_for_path"],
    ["Burter (Namek saga candidate)", "dragon-ball-burter-namek-showcase", "biography.fact.ginyu_force_namek"],
    ["Shenron (Earth Dragon Balls; Shenlong label candidate)", "dragon-ball-shenron-character-overview", "biography.fact.earth_dragon_balls_and_wishes"],
    ["Mumm-Ra (1985 ThunderCats profile candidate)", "hbomax-thundercats-1985-series-and-episodes", "biography.fact.mutants_alliance"],
    ["Cheetara (1985 ThunderCats profile candidate)", "hbomax-thundercats-1985-series-and-episodes", "biography.fact.sixth_sense_episode"],
    ["Lunch (Launch catalog localization candidate)", "dragon-ball-lunch-official-character-showcase", "biography.fact.sneeze_personality_change"],
    ["Mileena (Mortal Kombat 1 roster candidate)", "wb-games-mk1-faq", "biography.fact.mortal_kombat_1_main_roster"],
    ["Goro (Mortal Kombat 1 Kameo profile candidate)", "netherrealm-mk1-roster", "biography.fact.mortal_kombat_1_kameo_partner"],
    ["T-800/Carl (Dark Fate continuity candidate)", "paramount-terminator-dark-fate-t800", "biography.fact.dark_fate_t800_carl"],
    ["John Wick (film franchise candidate)", "peacock-john-wick-franchise-guide", "biography.fact.retired_hitman_and_return"],
    ["Natasha Romanoff/Romanova (Black Widow comics candidate)", "marvel-black-widow-comics-profile", "biography.fact.red_room_and_defection"],
    ["Norrin Radd (Silver Surfer comics candidate)", "marvel-silver-surfer-heralds-galactus", "biography.fact.norrin_radd_becomes_herald"],
  ];
  for (const [candidateName, sourceId, attribute] of newestSourceClaims) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate.claims.some((claim) =>
      claim.attribute === attribute && claim.sourceIds.includes(sourceId)));
  }
  const thundercatsSource = packet.sources.find((source) =>
    source.id === "hbomax-thundercats-1985-series-and-episodes");
  assert.equal(thundercatsSource.publisher, "HBO Max / Warner Bros. Discovery");
  assert.equal(thundercatsSource.sourceKind, "official");
  for (const candidateName of [
    "Mumm-Ra (1985 ThunderCats profile candidate)",
    "Cheetara (1985 ThunderCats profile candidate)",
  ]) {
    const candidate = packet.candidates.find((item) => item.candidateName === candidateName);
    assert.ok(candidate.ambiguities.some((item) => /inspeção visual/i.test(item)));
    assert.ok(candidate.candidateModelLinks.every((link) =>
      link.independentModelEvidence.length === 0 && link.reviewRequired));
  }
  const launchCandidate = packet.candidates.find((item) =>
    item.candidateName === "Lunch (Launch catalog localization candidate)");
  assert.ok(launchCandidate.ambiguities.some((item) => /Lunch.*Launch/.test(item)));
  assert.ok(launchCandidate.biographySourceIds.includes("dragon-ball-lunch-kame-house"));
  assert.ok(launchCandidate.candidateModelLinks.every((link) =>
    link.independentModelEvidence.length === 0 && link.reviewRequired));
  const t800 = packet.candidates.find((item) =>
    item.candidateName === "T-800/Carl (Dark Fate continuity candidate)");
  const johnWick = packet.candidates.find((item) =>
    item.candidateName === "John Wick (film franchise candidate)");
  assert.deepEqual(t800.catalogFranchiseCandidates, ["Exterminador do Futuro"]);
  assert.deepEqual(johnWick.catalogFranchiseCandidates, ["John Wick (Franquia)"]);
  assert.ok(t800.ambiguities.some((item) => /Dark Fate/.test(item)));
  assert.ok(johnWick.ambiguities.some((item) => /qual filme/.test(item)));
  const blackWidow = packet.candidates.find((item) =>
    item.candidateName === "Natasha Romanoff/Romanova (Black Widow comics candidate)");
  const silverSurfer = packet.candidates.find((item) =>
    item.candidateName === "Norrin Radd (Silver Surfer comics candidate)");
  assert.deepEqual(blackWidow.catalogFranchiseCandidates, ["Equipes e Grupos"]);
  assert.deepEqual(silverSurfer.catalogFranchiseCandidates, ["Equipes e Grupos"]);
  assert.ok(blackWidow.ambiguities.some((item) => /portadoras|uniformes/.test(item)));
  assert.ok(silverSurfer.ambiguities.some((item) => /fase, uniforme ou continuidade/.test(item)));
  const burter = packet.candidates.find((item) => item.candidateName === "Burter (Namek saga candidate)");
  const shenron = packet.candidates.find((item) =>
    item.candidateName === "Shenron (Earth Dragon Balls; Shenlong label candidate)");
  assert.equal(burter.candidateModelLinks.filter((link) =>
    !link.catalogEvidenceSnapshot.candidateContractPublished).length, 1);
  assert.equal(shenron.candidateModelLinks.filter((link) =>
    !link.catalogEvidenceSnapshot.candidateContractPublished).length, 1);
  assert.ok(shenron.ambiguities.some((item) => /Shenron.*Shenlong/.test(item)));

  for (const source of packet.sources) {
    assert.equal(new URL(source.url).protocol, "https:");
    assert.equal(source.sourceKind, "official");
  }
  for (const candidate of packet.candidates) {
    assert.equal(candidate.identityStatus, "prepared_pending_human_review");
    assert.ok([
      "prepared_pending_human_review",
      "ambiguous_pending_human_review",
    ].includes(candidate.franchiseStatus));
    assert.equal(candidate.biographyStatus, "prepared_pending_human_review");
    assert.equal(candidate.candidateModelLinks.length, candidate.catalogCandidateModelCount);
    assert.ok(candidate.biographyDraft.length > 40);
    assert.ok(candidate.biographySourceIds.length > 0);
    for (const claim of candidate.claims) {
      assert.equal(claim.reviewStatus, "pending_human_review");
      assert.ok(claim.sourceIds.length > 0);
      assert.ok(claim.sourceIds.every((sourceId) => sourceIds.has(sourceId)));
    }
    for (const sourceId of candidate.biographySourceIds) assert.ok(sourceIds.has(sourceId));
    for (const link of candidate.candidateModelLinks) {
      assert.equal(inventoryModels.get(link.modelId), link.modelSlug);
      assert.equal(link.relationshipStatus, "candidate_pending_visual_and_editorial_review");
      assert.deepEqual(link.independentModelEvidence, []);
      assert.equal(link.reviewRequired, true);
      assert.ok(["candidate_and_published", "candidate_only", "published_only"]
        .includes(link.catalogEvidenceSnapshot.sourceStatus));
      assert.ok([true, false, null].includes(
        link.catalogEvidenceSnapshot.candidateContractPublished,
      ));
    }
  }
});

test("rejects an insecure catalog base before making requests", async () => {
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "http://catalog.example.test/",
      fetcher: async () => { throw new Error("must not fetch"); },
    }),
    /invalid_catalog_api_base/,
  );
});

test("rejects repeated cursors", async () => {
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => response({ items: [row()], nextCursor: "same" }),
      pageDelayMs: 0,
    }),
    /catalog_page_cursor_invalid/,
  );
});

test("rejects a cursor cycle that revisits an earlier page", async () => {
  let calls = 0;
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => {
        calls += 1;
        const nextCursor = ["page-a", "page-b", "page-a"][calls - 1] ?? null;
        return response({
          items: [row({ id: `model-${calls}`, slug: `model-${calls}` })],
          nextCursor,
        });
      },
      pageDelayMs: 0,
    }),
    /catalog_page_cursor_repeated/,
  );
});

test("rejects duplicate IDs across pages", async () => {
  let calls = 0;
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => {
        calls += 1;
        return calls === 1
          ? response({ items: [row()], nextCursor: "next" })
          : response({ items: [row()], nextCursor: null });
      },
      pageDelayMs: 0,
    }),
    /duplicate_catalog_model_id/,
  );
});

test("rejects duplicate slugs across pages even when IDs differ", async () => {
  let calls = 0;
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => {
        calls += 1;
        return calls === 1
          ? response({ items: [row()], nextCursor: "next" })
          : response({
            items: [row({ id: "model-2", name: "Second figure" })],
            nextCursor: null,
          });
      },
      pageDelayMs: 0,
    }),
    /duplicate_catalog_model_slug/,
  );
});

test("rejects incomplete responses and invalid rows", async () => {
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => response({ items: [{ id: "missing-fields" }], nextCursor: null }),
    }),
    /invalid_catalog_slug_at_row_1/,
  );
  await assert.rejects(
    fetchPublishedCatalogModels({
      baseUrl: "https://catalog.example.test/",
      fetcher: async () => response({ items: "not-an-array", nextCursor: null }),
    }),
    /catalog_page_items_invalid/,
  );
});

test("reconciles candidate and live model IDs without treating either as identity evidence", () => {
  const result = reconcileCandidateContract({
    modelTotal: 2,
    models: [
      {
        id: "model-1",
        slug: "changed-slug",
        code: "TC-001",
        displayName: "Model One",
        variantName: null,
        categoryName: "Anime",
        categorySlug: "anime",
        franchiseName: "Series",
        franchiseSlug: "series",
        published: true,
      },
      {
        id: "candidate-only",
        slug: "candidate-only",
        code: "TC-002",
        displayName: "Candidate Only",
        variantName: null,
        categoryName: "Games",
        categorySlug: "games",
        franchiseName: "Series",
        franchiseSlug: "series",
        published: false,
      },
    ],
  }, [
    { id: "model-1", slug: "character-model" },
    { id: "public-only", slug: "public-only" },
  ]);

  assert.equal(result.matchingIds, 1);
  assert.deepEqual(result.candidateOnlyIds, ["candidate-only"]);
  assert.deepEqual(result.publicOnlyIds, ["public-only"]);
  assert.deepEqual(result.slugMismatches, [{
    id: "model-1",
    candidateSlug: "changed-slug",
    publicSlug: "character-model",
  }]);
  assert.match(result.note, /no character identity/);
});

test("merges candidate and published inventories once per ID and preserves provenance", () => {
  const candidate = {
    modelTotal: 2,
    models: [
      {
        id: "model-1",
        slug: "candidate-slug",
        code: "TC-001",
        displayName: "Candidate Name",
        variantName: "Candidate Variant",
        categoryName: "Candidate Category",
        categorySlug: "candidate-category",
        franchiseName: "Candidate Franchise",
        franchiseSlug: "candidate-franchise",
        published: 1,
      },
      {
        id: "candidate-only",
        slug: "candidate-only",
        code: "TC-002",
        displayName: "Candidate Only",
        variantName: null,
        categoryName: "Games",
        categorySlug: "games",
        franchiseName: "Series",
        franchiseSlug: "series",
        folderPath: ["Candidate", "Folder"],
        published: 0,
      },
    ],
  };
  const live = [
    {
      id: "model-1",
      slug: "public-slug",
      code: "TC-001",
      name: "Public Name",
      variantName: "Public Variant",
      category: "Anime",
      categorySlug: "anime",
      franchise: "Series",
      franchiseSlug: "series",
      collection: null,
      folderPath: null,
    },
    {
      id: "public-only",
      slug: "public-only",
      code: "TC-003",
      name: "Public Only",
      variantName: "",
      category: "Games",
      categorySlug: "games",
      franchise: "Series",
      franchiseSlug: "series",
      collection: null,
      folderPath: null,
    },
  ];
  const merged = mergeCandidateAndPublicModels(candidate, live);
  const inventory = buildCharacterReviewInventory({
    models: merged,
    source: "https://catalog.example.test/api/catalog",
    capturedAt: "2026-11-17T00:00:00.000Z",
  });

  assert.equal(merged.length, 3);
  assert.equal(merged[0].sourceStatus, "candidate_and_published");
  assert.equal(merged[0].name, "Public Name");
  assert.equal(merged[0].candidateContract.slug, "candidate-slug");
  assert.equal(merged[0].candidateContract.published, true);
  assert.equal(merged[0].publicCatalog.slug, "public-slug");
  assert.equal(merged[1].sourceStatus, "candidate_only");
  assert.equal(merged[1].folderPath, "Candidate/Folder");
  assert.equal(merged[1].publicCatalog, null);
  assert.equal(merged[2].sourceStatus, "published_only");
  assert.equal(inventory.models[0].characterReview.status, "pending_evidence");
  assert.match(inventory.models[1].catalogEvidence.scope, /does not prove character identity/);
  assert.deepEqual(
    inventory.models[0].identityCandidate.names.map((candidate) => candidate.value),
    ["Candidate Name", "Public Name"],
  );
  assert.equal(inventory.models[0].identityCandidate.verified, false);
  assert.equal(inventory.models[0].identityCandidate.reviewRequired, true);
  assert.ok(inventory.models[0].identityCandidate.ambiguityCodes.includes(
    "candidate_sources_disagree_on_model_name",
  ));
  assert.equal(inventory.models[0].identityCandidate.franchises.verified, false);
  assert.equal(inventory.models[0].identityCandidate.franchises.candidates.length, 2);
});

test("exports a spreadsheet-safe review queue with empty biography and evidence fields", () => {
  const inventory = buildCharacterReviewInventory({
    source: "https://catalog.example.test/api/catalog",
    capturedAt: "2026-11-17T00:00:00.000Z",
    models: [row({ name: 'Hero, "First Edition"' })].map((model) => ({
      id: model.id,
      slug: model.slug,
      code: model.code,
      name: model.name,
      variantName: model.variant_name,
      category: model.category,
      categorySlug: model.category_slug,
      franchise: model.franchise,
      franchiseSlug: model.franchise_slug,
      collection: model.collection,
      folderPath: model.folder_path,
    })),
  });
  const csv = serializeReviewQueueCsv(inventory);
  const [header, record] = csv.trimEnd().split("\r\n");

  assert.match(header, /identity_evidence,biography_status,biography_synopsis/);
  assert.match(header, /identity_candidate_names,candidate_status,candidate_sources/);
  assert.equal(new Set(header.split(",")).size, header.split(",").length);
  assert.match(record, /"Hero, ""First Edition"""/);
  assert.match(record, /pending_evidence,,,,not_started_identity_unverified/);
});

import { EnrichmentDraft, PersonProfile, ProvenanceField } from "@/lib/types";

export interface EnrichmentProvider {
  name: string;
  enrich(profile: PersonProfile): Promise<{ confidence: number; fields: ProvenanceField[]; conflictFlags: string[] }>;
}

export class LinkedInCompliantProvider implements EnrichmentProvider {
  name = "LinkedIn Marketing Developer Platform";

  async enrich(profile: PersonProfile) {
    const fields: ProvenanceField[] = [
      {
        fieldName: "organization",
        value: profile.organization || "Unknown",
        source: "LinkedIn API",
        sourceUrl: "https://www.linkedin.com",
        retrievedAt: new Date().toISOString(),
      },
      {
        fieldName: "roleTitle",
        value: profile.roleTitle || "Unknown",
        source: "LinkedIn API",
        sourceUrl: "https://www.linkedin.com",
        retrievedAt: new Date().toISOString(),
      },
    ];

    const conflictFlags: string[] = [];
    if (!profile.organization) {
      conflictFlags.push("missing_org");
    }

    return {
      confidence: profile.organization ? 0.91 : 0.62,
      fields,
      conflictFlags,
    };
  }
}

export class LicensedPeopleDataProvider implements EnrichmentProvider {
  name = "Licensed Professional Insights Provider";

  async enrich(profile: PersonProfile) {
    const highlights = profile.highlights.length
      ? profile.highlights.join("; ")
      : "No prior highlights on file";

    return {
      confidence: 0.83,
      fields: [
        {
          fieldName: "highlights",
          value: highlights,
          source: "Licensed Provider API",
          retrievedAt: new Date().toISOString(),
        },
      ],
      conflictFlags: profile.highlights.length ? [] : ["missing_highlights"],
    };
  }
}

const providerChain: EnrichmentProvider[] = [new LinkedInCompliantProvider(), new LicensedPeopleDataProvider()];

export async function runCompliantEnrichment(profile: PersonProfile): Promise<EnrichmentDraft> {
  const results = await Promise.all(providerChain.map((provider) => provider.enrich(profile)));
  const fields = results.flatMap((result) => result.fields);
  const conflictFlags = Array.from(new Set(results.flatMap((result) => result.conflictFlags)));
  const averageConfidence = results.reduce((sum, result) => sum + result.confidence, 0) / results.length;

  return {
    id: `enr_${profile.id}_${Date.now()}`,
    eventId: profile.eventId,
    personId: profile.id,
    provider: providerChain.map((provider) => provider.name).join(" + "),
    matchConfidence: Number(averageConfidence.toFixed(2)),
    status: "draft",
    conflictFlags,
    fields,
    generatedAt: new Date().toISOString(),
  };
}

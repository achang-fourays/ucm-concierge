"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { CopilotNudge, DashboardPayload, ExecutiveBrief, Speaker, TravelItem } from "@/lib/types";

const EVENT_ID = "evt_ucm_austin_2026";

type AttendeeOption = {
  attendeeId: string;
  userId: string;
  name: string;
  email: string;
};

type SectionKey = "brief" | "travelbot" | "nextActions" | "travel" | "agenda" | "speakers" | "admin";

const nicknameAliases: Record<string, string[]> = {
  andrew: ["andy"],
  andy: ["andrew"],
  thomas: ["tom"],
  tom: ["thomas"],
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function tokenizePersonName(value: string): string[] {
  return value
    .split(/[^a-zA-Z]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

function expandTokens(tokens: string[]): Set<string> {
  const expanded = new Set<string>();

  for (const token of tokens) {
    expanded.add(token);
    const aliases = nicknameAliases[token] ?? [];
    for (const alias of aliases) {
      expanded.add(alias);
    }
  }

  return expanded;
}

function findPreferredAttendeeId(
  attendeeOptions: AttendeeOption[],
  dashboardUserId: string,
  sessionEmail?: string,
  userName?: string,
): string | undefined {
  const byUserId = attendeeOptions.find((entry) => entry.userId === dashboardUserId)?.attendeeId;
  if (byUserId) {
    return byUserId;
  }

  const normalizedEmail = sessionEmail?.toLowerCase();
  const byEmail = normalizedEmail
    ? attendeeOptions.find((entry) => entry.email.toLowerCase() === normalizedEmail)?.attendeeId
    : undefined;
  if (byEmail) {
    return byEmail;
  }

  const emailTokens = normalizedEmail ? tokenizePersonName(normalizedEmail.split("@")[0]) : [];
  const nameTokens = userName ? tokenizePersonName(userName) : [];
  const tokenSet = expandTokens([...nameTokens, ...emailTokens]);

  if (tokenSet.size > 0) {
    const byName = attendeeOptions.find((entry) => {
      const attendeeTokens = expandTokens(tokenizePersonName(entry.name));
      for (const token of attendeeTokens) {
        if (tokenSet.has(token)) {
          return true;
        }
      }
      return false;
    })?.attendeeId;

    if (byName) {
      return byName;
    }
  }

  return attendeeOptions[0]?.attendeeId;
}

function getTimeZoneShort(timeZone: string) {
  const zonePart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;

  return zonePart ?? timeZone;
}

function fmt(date: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(date));
}

function formatTimeOnly(date: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(date));
}

const airportDropoffs: Record<string, string> = {
  SFO: "San Francisco International Airport, San Francisco, CA 94128",
  ORD: "Chicago O'Hare International Airport, Chicago, IL 60666",
  ATL: "Hartsfield-Jackson Atlanta International Airport, Atlanta, GA 30337",
  IAH: "George Bush Intercontinental Airport, Houston, TX 77032",
};

function buildUberLink(address: string) {
  return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address)}`;
}

function inferDropoffAddress(item: TravelItem, defaultAddress: string) {
  if (item.type === "flight" && item.location) {
    const routeMatch = item.location.match(/\b([A-Z]{3})\s*->\s*([A-Z]{3})\b/);
    if (routeMatch) {
      return airportDropoffs[routeMatch[2]] ?? defaultAddress;
    }
  }

  if (item.location && !item.location.match(/^[A-Z]{2,3}\s*\d+/)) {
    return item.location;
  }

  return defaultAddress;
}

function getUberLinkForTravel(item: TravelItem, defaultAddress: string) {
  return item.links.uber ?? buildUberLink(inferDropoffAddress(item, defaultAddress));
}

function getActionTitle(title: string, attendeeName: string) {
  if (!attendeeName) return title;
  return title.toLowerCase().startsWith(attendeeName.toLowerCase()) ? attendeeName : title;
}

const localSpeakerHeadshotsById: Record<string, string> = {
  spk_brad: "/openAI%20headshots/bradlightcap.jpeg",
  spk_nate: "/openAI%20headshots/nategross.jpeg",
  spk_ashley_alex: "/openAI%20headshots/ashleyalexander.jpeg",
  spk_olivier: "/openAI%20headshots/olivergodemont.jpeg",
  spk_hemal: "/openAI%20headshots/hemalshah.jpeg",
  spk_ashley_k: "/openAI%20headshots/ashleykramer.jpeg",
  spk_joy: "/openAI%20headshots/joyliao.jpeg",
  spk_glory: "/openAI%20headshots/gloryjain.jpeg",
  spk_angel: "/openAI%20headshots/angelbrodin.jpeg",
  spk_rob: "/openAI%20headshots/robpulford.jpeg",
};

function getSpeakerHeadshotSrc(speaker: Speaker): string {
  return (
    localSpeakerHeadshotsById[speaker.id] ||
    speaker.headshotUrl ||
    "https://ui-avatars.com/api/?background=E2E8F0&color=0F172A&name=" + encodeURIComponent(speaker.name)
  );
}

async function apiGet(path: string, accessToken: string) {
  const response = await fetch(path, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

async function apiPost(path: string, accessToken: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function apiPut(path: string, accessToken: string, body: unknown) {
  const response = await fetch(path, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export default function ConciergeApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [brief, setBrief] = useState<ExecutiveBrief | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [expandedSpeakerId, setExpandedSpeakerId] = useState<string | null>(null);
  const [travelItems, setTravelItems] = useState<TravelItem[]>([]);
  const [attendees, setAttendees] = useState<AttendeeOption[]>([]);
  const [selectedActionsAttendeeId, setSelectedActionsAttendeeId] = useState<string>("");
  const [selectedTravelAttendeeId, setSelectedTravelAttendeeId] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    brief: false,
    travelbot: false,
    nextActions: false,
    travel: false,
    agenda: false,
    speakers: false,
    admin: false,
  });

  const [chatQuestion, setChatQuestion] = useState("What is next for me?");
  const [chatAnswer, setChatAnswer] = useState<string>("");
  const [chatMeta, setChatMeta] = useState<{ confidence: string; sources: string[] }>({ confidence: "", sources: [] });
  const [adminNudges, setAdminNudges] = useState<CopilotNudge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const canManage = dashboard?.user.role === "assistant" || dashboard?.user.role === "admin";
  const userFullName = dashboard?.user.name || (session?.user?.user_metadata?.full_name as string | undefined) || "Traveler";
  const firstName = userFullName.split(" ")[0].split("@")[0];
  const eventTimeZone = dashboard?.event.timezone ?? "America/Los_Angeles";
  const eventTimeZoneShort = getTimeZoneShort(eventTimeZone);
  const selectedActionsAttendeeName = attendees.find((entry) => entry.attendeeId === selectedActionsAttendeeId)?.name ?? "";
  const sortedTravelItems = useMemo(() => {
    return [...travelItems].sort((a, b) => {
      if (a.type === "hotel" && b.type !== "hotel") return -1;
      if (b.type === "hotel" && a.type !== "hotel") return 1;
      return a.startAt.localeCompare(b.startAt);
    });
  }, [travelItems]);

  const reload = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const dashboardPath = selectedActionsAttendeeId
        ? `/api/events/${EVENT_ID}/dashboard?attendeeId=${encodeURIComponent(selectedActionsAttendeeId)}`
        : `/api/events/${EVENT_ID}/dashboard`;

      const travelPath = selectedTravelAttendeeId
        ? `/api/events/${EVENT_ID}/travel?attendeeId=${encodeURIComponent(selectedTravelAttendeeId)}`
        : `/api/events/${EVENT_ID}/travel`;

      const [dashboardPayload, speakersPayload, briefPayload, nudgesPayload, attendeesPayload, travelPayload] = await Promise.all([
        apiGet(dashboardPath, session.access_token),
        apiGet(`/api/events/${EVENT_ID}/speakers`, session.access_token),
        apiGet(`/api/events/${EVENT_ID}/briefing`, session.access_token),
        apiGet(`/api/events/${EVENT_ID}/copilot/nudges`, session.access_token),
        apiGet(`/api/events/${EVENT_ID}/attendees`, session.access_token),
        apiGet(travelPath, session.access_token),
      ]);

      const attendeeOptions: AttendeeOption[] = attendeesPayload.attendees ?? [];
      setAttendees(attendeeOptions);

      if (attendeeOptions.length > 0) {
        const preferredAttendee = findPreferredAttendeeId(
          attendeeOptions,
          dashboardPayload.user.id,
          session.user.email,
          dashboardPayload.user.name,
        );

        const actionsSelectionValid = attendeeOptions.some((entry) => entry.attendeeId === selectedActionsAttendeeId);
        const travelSelectionValid = attendeeOptions.some((entry) => entry.attendeeId === selectedTravelAttendeeId);

        if ((!selectedActionsAttendeeId || !actionsSelectionValid) && preferredAttendee) {
          setSelectedActionsAttendeeId(preferredAttendee);
        }

        if ((!selectedTravelAttendeeId || !travelSelectionValid) && preferredAttendee) {
          setSelectedTravelAttendeeId(preferredAttendee);
        }
      }

      setDashboard(dashboardPayload);
      setSpeakers(speakersPayload.speakers ?? []);
      setBrief(briefPayload.brief ?? null);
      setAdminNudges(nudgesPayload.nudges ?? []);
      setTravelItems(travelPayload.travel ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedActionsAttendeeId, selectedTravelAttendeeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const quickPrompt = useMemo(() => {
    if (!brief) {
      return "Who are the speakers and what should I ask?";
    }

    return `What should I ask ${speakers[0]?.name ?? "the first speaker"} based on this brief?`;
  }, [brief, speakers]);

  const askCopilot = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setError("");
      const selectedForCopilot = canManage ? selectedActionsAttendeeId || selectedTravelAttendeeId || undefined : undefined;
      const response = await apiPost(`/api/events/${EVENT_ID}/copilot/chat`, session.access_token, {
        message: chatQuestion,
        context_scope: "all",
        attendeeId: selectedForCopilot,
      });

      setChatAnswer(response.answer);
      setChatMeta({
        confidence: response.confidence,
        sources: (response.sources ?? []).map((source: { label: string }) => source.label),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copilot request failed");
    }
  }, [canManage, chatQuestion, selectedActionsAttendeeId, selectedTravelAttendeeId, session?.access_token]);

  const generateNudges = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      await apiPost(`/api/events/${EVENT_ID}/copilot/nudges/evaluate`, session.access_token);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nudge evaluation failed");
    }
  }, [reload, session?.access_token]);

  const updateNudge = useCallback(
    async (nudgeId: string, status: "approved" | "disabled") => {
      if (!session?.access_token) return;
      try {
        await apiPut(`/api/events/${EVENT_ID}/copilot/nudges/${nudgeId}`, session.access_token, { status });
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nudge update failed");
      }
    },
    [reload, session?.access_token],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, [supabase]);

  const jumpToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setIsMenuOpen(false);
  }, []);

  const toggleSection = useCallback((section: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  if (authLoading) {
    return <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-slate-200 bg-white p-6">Checking sign-in...</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-[#d9d9d9] bg-white p-6">
        <h1 className="text-2xl font-semibold text-[#800000]">UChicago Medicine Concierge</h1>
        <p className="mt-2 text-sm text-[#404040]">Please sign in using your email magic link.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-[#800000] px-4 py-2 text-sm text-white">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-4 sm:py-6 md:px-8">
      <header className="panel p-0 overflow-visible">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          {!logoFailed && (
            <img
              src="/branding/UCM_Stacked_Logo_RGB.jpg"
              alt="UChicago Medicine logo"
              className="h-10 w-auto object-contain sm:h-12"
              onError={() => setLogoFailed(true)}
            />
          )}
          <div className="relative">
            <button
              type="button"
              className="chip px-4 py-2 text-base"
              aria-label="Open section menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              Menu ≡
            </button>

            {isMenuOpen && (
              <nav className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-[#d9d9d9] bg-white p-2 shadow-lg">
                <div className="grid gap-1">
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f3f3]" onClick={() => jumpToSection("brief-section")}>Executive Brief</button>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f3f3]" onClick={() => jumpToSection("travelbot-section")}>TravelBot</button>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f3f3]" onClick={() => jumpToSection("next-actions-section")}>Your Next Actions</button>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f3f3]" onClick={() => jumpToSection("travel-section")}>Flights & Hotels</button>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f3f3]" onClick={() => jumpToSection("agenda-section")}>Agenda</button>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f3f3]" onClick={() => jumpToSection("speakers-section")}>Speakers</button>
                  {canManage && (
                    <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f3f3]" onClick={() => jumpToSection("admin-section")}>Admin Controls</button>
                  )}
                </div>
                <div className="mt-2 border-t border-[#e4e4e4] pt-2">
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f3f3]" onClick={logout}>
                    Sign out
                  </button>
                </div>
              </nav>
            )}
          </div>
        </div>

        <div className="border-t border-[#e4e4e4] px-4 py-4">
          <h1 className="text-2xl font-semibold text-[#800000]">OpenAI Meeting Copilot</h1>
        </div>
      </header>


      {loading && <div className="panel text-sm">Loading event data...</div>}
      {error && <div className="panel border-red-300 bg-red-50 text-sm text-red-900">{error}</div>}

      {dashboard && (
        <main className="grid gap-4 lg:grid-cols-3">
          <section id="brief-section" className="panel lg:col-span-3">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title mb-0">Executive Brief</h2>
              <button type="button" className="chip" onClick={() => toggleSection("brief")}>{collapsed.brief ? "Show" : "Hide"}</button>
            </div>
            {!collapsed.brief && (
              <>
                {brief ? (
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>{brief.summary}</p>
                    <h3 className="font-medium text-slate-900">Watch-outs</h3>
                    <ul className="list-disc pl-5">
                      {brief.watchouts.map((watchout) => (
                        <li key={watchout}>{watchout}</li>
                      ))}
                    </ul>
                    <h3 className="font-medium text-slate-900">Suggested questions</h3>
                    <ul className="list-disc pl-5">
                      {brief.suggestedQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No approved brief available yet.</p>
                )}
              </>
            )}
          </section>

          <section id="travelbot-section" className="panel">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title mb-0">{firstName}'s TravelBot</h2>
              <button type="button" className="chip" onClick={() => toggleSection("travelbot")}>{collapsed.travelbot ? "Show" : "Hide"}</button>
            </div>
            {!collapsed.travelbot && (
              <>
                <p className="text-sm text-slate-600">Ask for routing, speaker prep, or suggested executive questions.</p>
                <div className="mt-3 space-y-2">
                  <textarea
                    className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                    rows={3}
                    value={chatQuestion}
                    onChange={(event) => setChatQuestion(event.target.value)}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" className="btn w-full sm:w-auto" onClick={askCopilot}>
                      Ask
                    </button>
                    <button type="button" className="btn btn-muted w-full sm:w-auto" onClick={() => setChatQuestion(quickPrompt)}>
                      Prep Prompt
                    </button>
                  </div>
                  {chatAnswer && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="font-medium text-slate-900">{chatAnswer}</p>
                      <p className="mt-2 text-xs text-slate-600">Confidence: {chatMeta.confidence}</p>
                      {chatMeta.sources.length > 0 && <p className="text-xs text-slate-600">Sources: {chatMeta.sources.join(", ")}</p>}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section id="next-actions-section" className="panel lg:col-span-2">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="section-title mb-0">Your Next Actions</h2>
                <p className="text-xs text-slate-500">All times in {eventTimeZoneShort}.</p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                {canManage && attendees.length > 0 && (
                  <select
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm sm:flex-none"
                    value={selectedActionsAttendeeId}
                    onChange={(event) => setSelectedActionsAttendeeId(event.target.value)}
                  >
                    {attendees.map((entry) => (
                      <option key={entry.attendeeId} value={entry.attendeeId}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" className="chip" onClick={() => toggleSection("nextActions")}>{collapsed.nextActions ? "Show" : "Hide"}</button>
              </div>
            </div>
            {!collapsed.nextActions && (
              <div className="space-y-3">
                {dashboard.nextActions.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{item.type}</p>
                    <h3 className="font-medium text-slate-900">{getActionTitle(item.title, selectedActionsAttendeeName)}</h3>
                    <p className="text-sm text-slate-600">{item.description}</p>
                    <p className="text-sm text-slate-700">{fmt(item.when, eventTimeZone)}</p>
                    {item.links?.map((link) => (
                      <a key={link.href} href={link.href} className="mt-2 inline-block text-sm text-[#800000] underline" target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    ))}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="travel-section" className="panel">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="section-title mb-0">Flights and Hotels</h2>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                {canManage && attendees.length > 0 && (
                  <select
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm sm:flex-none"
                    value={selectedTravelAttendeeId}
                    onChange={(event) => setSelectedTravelAttendeeId(event.target.value)}
                  >
                    {attendees.map((entry) => (
                      <option key={entry.attendeeId} value={entry.attendeeId}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" className="chip" onClick={() => toggleSection("travel")}>{collapsed.travel ? "Show" : "Hide"}</button>
              </div>
            </div>
            {!collapsed.travel && (
              <div className="space-y-3">
                {sortedTravelItems.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                    <h3 className="font-medium">{item.provider}</h3>
                    <p>{item.location}</p>
                    <p className="text-slate-700">
                      {item.endAt
                        ? "Depart " + formatTimeOnly(item.startAt, eventTimeZone) + " | Arrive " + formatTimeOnly(item.endAt, eventTimeZone)
                        : "Departure " + formatTimeOnly(item.startAt, eventTimeZone)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.links.map && (
                        <a className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs" href={item.links.map} target="_blank" rel="noreferrer">
                          Open map
                        </a>
                      )}
                      <a
                        className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs"
                        href={getUberLinkForTravel(item, dashboard.event.venue)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Uber
                      </a>
                      {item.type !== "flight" && item.links.provider && (
                        <a className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs" href={item.links.provider} target="_blank" rel="noreferrer">
                          Open details
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="agenda-section" className="panel">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title mb-0">Agenda</h2>
              <button type="button" className="chip" onClick={() => toggleSection("agenda")}>{collapsed.agenda ? "Show" : "Hide"}</button>
            </div>
            {!collapsed.agenda && (
              <div className="space-y-3 text-sm">
                {dashboard.upcomingAgenda.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <h3 className="font-medium">{item.title}</h3>
                    <p>{item.location}</p>
                    <p className="text-slate-600">{fmt(item.startAt, eventTimeZone)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="speakers-section" className="panel lg:col-span-2">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title mb-0">Speakers & Invitee Intelligence</h2>
              <button type="button" className="chip" onClick={() => toggleSection("speakers")}>{collapsed.speakers ? "Show" : "Hide"}</button>
            </div>
            {!collapsed.speakers && (
              <div className="grid gap-3 md:grid-cols-2">
                {speakers.map((speaker) => {
                  const isExpanded = expandedSpeakerId === speaker.id;

                  return (
                    <article key={speaker.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 text-left"
                        onClick={() => setExpandedSpeakerId(isExpanded ? null : speaker.id)}
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getSpeakerHeadshotSrc(speaker)}
                            alt={speaker.name}
                            className="h-14 w-14 rounded-full object-cover"
                          />
                          <h3 className="font-medium text-slate-900">{speaker.name}</h3>
                        </div>
                        <span className="text-xs text-slate-500">{isExpanded ? "Hide" : "Show"}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3">
                          <p className="text-slate-700">
                            {speaker.title} at {speaker.org}
                          </p>
                          <p className="mt-1 text-slate-600">{speaker.bio}</p>
                          {speaker.linkedinUrl && (
                            <a
                              href={speaker.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-xs text-[#800000] underline"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {canManage && (
            <section id="admin-section" className="panel lg:col-span-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="section-title mb-0">Admin Controls: Proactive AI</h2>
                <button type="button" className="chip" onClick={() => toggleSection("admin")}>{collapsed.admin ? "Show" : "Hide"}</button>
              </div>
              {!collapsed.admin && (
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-900">Nudges</h3>
                      <button type="button" className="btn" onClick={generateNudges}>
                        Evaluate Nudges
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      {adminNudges.map((nudge) => (
                        <article key={nudge.id} className="rounded-xl border border-slate-200 p-3">
                          <p className="font-medium">{nudge.title}</p>
                          <p>{nudge.body}</p>
                          <p className="text-xs text-slate-600">
                            {fmt(nudge.scheduledAt, eventTimeZone)} | {nudge.status}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" className="chip" onClick={() => updateNudge(nudge.id, "approved")}>
                              On
                            </button>
                            <button type="button" className="chip" onClick={() => updateNudge(nudge.id, "disabled")}>
                              Off
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      )}
    </div>
  );
}

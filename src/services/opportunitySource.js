const HIMALAYAS_SEARCH_URL =
  "https://himalayas.app/jobs/api/search";

const ARBEITNOW_URL =
  "https://www.arbeitnow.com/api/job-board-api";

const MAX_ROLE_QUERIES = 2;
const MAX_RESULTS = 30;

const STUDENT_TERMS = [
  "intern",
  "internship",
  "co-op",
  "coop",
  "student",
  "trainee",
  "apprentice",
  "graduate",
  "new grad",
  "entry level",
  "entry-level",
  "junior",
  "early career",
  "working student",
  "werkstudent",
];

const SENIOR_TITLE_PATTERN =
  /\b(senior|sr\.?|staff|principal|lead|manager|director|head|vice president|vp|chief)\b/i;

const GENERIC_ROLE_WORDS = new Set([
  "engineer",
  "engineering",
  "intern",
  "internship",
  "student",
  "entry",
  "level",
  "junior",
  "graduate",
  "associate",
  "role",
  "position",
  "career",
  "job",
]);

/* =========================================================
   TEXT HELPERS
========================================================= */

function stripHtml(value = "") {
  const parser = new DOMParser();

  const parsed = parser.parseFromString(
    value,
    "text/html"
  );

  return (
    parsed.body.textContent
      ?.replace(/\s+/g, " ")
      .trim() || ""
  );
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .map((value) =>
          String(value || "").trim()
        )
        .filter(Boolean)
    ),
  ];
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date
    .toISOString()
    .split("T")[0];
}

/* =========================================================
   BUILD SEARCH TERMS FROM APPROVED PROFILE
========================================================= */

function buildSearchQueries(profile) {
  const targetRoles =
    Array.isArray(
      profile?.career?.targetRoles
    )
      ? profile.career.targetRoles
      : [];

  const fallbackTerms = [
    profile?.career?.dreamCareer,
    profile?.major,
  ];

  return uniqueStrings([
    ...targetRoles,
    ...fallbackTerms,
  ])
    .filter(
      (value) =>
        value.length >= 2
    )
    .slice(
      0,
      MAX_ROLE_QUERIES
    );
}

function buildProfileKeywords(profile) {
  const searchValues = [
    ...(Array.isArray(
      profile?.career?.targetRoles
    )
      ? profile.career.targetRoles
      : []),

    profile?.career?.dreamCareer,
    profile?.major,
  ];

  const keywords =
    searchValues.flatMap((value) =>
      normalizeText(value)
        .split(/\s+/)
        .filter(
          (word) =>
            word.length >= 3 &&
            !GENERIC_ROLE_WORDS.has(
              word
            )
        )
    );

  return uniqueStrings(keywords);
}

/* =========================================================
   STUDENT / EARLY CAREER CHECKS
========================================================= */

function containsStudentTerm(
  value = ""
) {
  const normalized =
    normalizeText(value);

  return STUDENT_TERMS.some(
    (term) =>
      normalized.includes(term)
  );
}

function titleLooksTooSenior(
  title = ""
) {
  return SENIOR_TITLE_PATTERN.test(
    title
  );
}

function looksStudentFriendly(
  opportunity
) {
  if (
    titleLooksTooSenior(
      opportunity.title
    )
  ) {
    return false;
  }

  if (
    opportunity.employmentType ===
    "Intern"
  ) {
    return true;
  }

  if (
    opportunity.seniority?.some(
      (level) =>
        String(level).toLowerCase() ===
        "entry-level"
    )
  ) {
    return true;
  }

  return containsStudentTerm(
    `${opportunity.title} ${opportunity.description}`
  );
}

/* =========================================================
   PROFILE RELEVANCE
========================================================= */

function calculateProfileRelevance(
  opportunity,
  profileKeywords
) {
  const title =
    normalizeText(
      opportunity.title
    );

  const description =
    normalizeText(
      opportunity.description
    );

  let score = 0;

  profileKeywords.forEach(
    (keyword) => {
      if (
        title.includes(keyword)
      ) {
        score += 5;
      } else if (
        description.includes(
          keyword
        )
      ) {
        score += 1;
      }
    }
  );

  if (
    opportunity.employmentType ===
    "Intern"
  ) {
    score += 4;
  }

  if (
    opportunity.seniority?.includes(
      "Entry-level"
    )
  ) {
    score += 3;
  }

  if (
    containsStudentTerm(
      opportunity.title
    )
  ) {
    score += 2;
  }

  return score;
}

/* =========================================================
   HIMALAYAS
========================================================= */

function formatHimalayasLocation(
  job
) {
  if (
    !Array.isArray(
      job.locationRestrictions
    ) ||
    job.locationRestrictions.length ===
      0
  ) {
    return "Worldwide Remote";
  }

  const locations =
    job.locationRestrictions
      .map((location) => {
        if (
          typeof location ===
          "string"
        ) {
          return location;
        }

        return (
          location?.name ||
          location?.alpha2 ||
          location?.slug ||
          ""
        );
      })
      .filter(Boolean);

  return locations.length
    ? `${locations.join(
        ", "
      )} · Remote`
    : "Remote";
}

function normalizeHimalayasJob(
  job
) {
  const description = stripHtml(
    job.description ||
      job.excerpt ||
      ""
  );

  return {
    externalId:
      `himalayas-${
        job.guid ||
        `${job.companySlug || "company"}-${job.title || "job"}`
      }`,

    source: "Himalayas",

    title:
      job.title ||
      "Untitled Opportunity",

    company:
      job.companyName ||
      "Company not listed",

    location:
      formatHimalayasLocation(
        job
      ),

    remote: true,

    workType:
      job.employmentType
        ? `Remote · ${job.employmentType}`
        : "Remote",

    employmentType:
      job.employmentType || "",

    seniority:
      Array.isArray(job.seniority)
        ? job.seniority
        : [],

    description,

    tags: uniqueStrings([
      ...(Array.isArray(
        job.categories
      )
        ? job.categories
        : []),

      ...(Array.isArray(
        job.parentCategories
      )
        ? job.parentCategories
        : []),
    ]),

    applicationUrl:
      job.applicationLink || "",

    deadline:
      normalizeDate(
        job.expiryDate
      ),

    sourcePublishedAt:
      job.pubDate || null,
  };
}

async function fetchHimalayasSearch(
  query,
  filters = {}
) {
  const params =
    new URLSearchParams();

  params.set("q", query);
  params.set("sort", "recent");
  params.set("page", "1");

  if (
    filters.employmentType
  ) {
    params.set(
      "employment_type",
      filters.employmentType
    );
  }

  if (filters.seniority) {
    params.set(
      "seniority",
      filters.seniority
    );
  }

  const response = await fetch(
    `${HIMALAYAS_SEARCH_URL}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Himalayas request failed with status ${response.status}.`
    );
  }

  const result =
    await response.json();

  if (
    !Array.isArray(result.jobs)
  ) {
    return [];
  }

  return result.jobs.map(
    normalizeHimalayasJob
  );
}

async function fetchHimalayasOpportunities(
  searchQueries
) {
  const requests = [];

  searchQueries.forEach(
    (query) => {
      requests.push(
        fetchHimalayasSearch(
          query,
          {
            employmentType:
              "Intern",
          }
        )
      );

      requests.push(
        fetchHimalayasSearch(
          query,
          {
            seniority:
              "Entry-level",
          }
        )
      );
    }
  );

  const results =
    await Promise.allSettled(
      requests
    );

  return results.flatMap(
    (result) =>
      result.status ===
      "fulfilled"
        ? result.value
        : []
  );
}

/* =========================================================
   ARBEITNOW FALLBACK
========================================================= */

function looksLikeStudentArbeitnowJob(
  job
) {
  if (
    titleLooksTooSenior(
      job.title || ""
    )
  ) {
    return false;
  }

  const searchableText = `
    ${job.title || ""}
    ${job.description || ""}
    ${(job.tags || []).join(" ")}
  `;

  return containsStudentTerm(
    searchableText
  );
}

function normalizeArbeitnowJob(
  job
) {
  return {
    externalId:
      `arbeitnow-${job.slug}`,

    source: "Arbeitnow",

    title:
      job.title ||
      "Untitled Opportunity",

    company:
      job.company_name ||
      "Company not listed",

    location:
      job.location ||
      "Location not listed",

    remote:
      Boolean(job.remote),

    workType:
      job.remote
        ? "Remote"
        : "On-site / Hybrid not specified",

    employmentType: "",

    seniority: [],

    description:
      stripHtml(
        job.description || ""
      ),

    tags:
      Array.isArray(job.tags)
        ? job.tags
        : [],

    applicationUrl:
      job.url || "",

    deadline: null,

    sourcePublishedAt:
      job.created_at || null,
  };
}

async function fetchArbeitnowFallback() {
  const response =
    await fetch(
      ARBEITNOW_URL
    );

  if (!response.ok) {
    return [];
  }

  const result =
    await response.json();

  if (
    !Array.isArray(result.data)
  ) {
    return [];
  }

  return result.data
    .filter(
      looksLikeStudentArbeitnowJob
    )
    .map(
      normalizeArbeitnowJob
    );
}

/* =========================================================
   DEDUPE
========================================================= */

function removeDuplicates(
  opportunities
) {
  const seen = new Set();

  return opportunities.filter(
    (opportunity) => {
      const key =
        opportunity.externalId;

      if (
        !key ||
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

/* =========================================================
   PUBLIC AEROPATH FETCH
========================================================= */

export async function fetchLiveOpportunities(
  profile
) {
  const searchQueries =
    buildSearchQueries(profile);

  if (
    searchQueries.length === 0
  ) {
    throw new Error(
      "Add at least one target role to your AeroPath profile before scanning."
    );
  }

  const profileKeywords =
    buildProfileKeywords(
      profile
    );

  /* ------------------------------
     PRIMARY SOURCE: HIMALAYAS
  ------------------------------ */

  let himalayasJobs = [];

  try {
    himalayasJobs =
      await fetchHimalayasOpportunities(
        searchQueries
      );
  } catch (error) {
    console.warn(
      "Himalayas search failed:",
      error
    );
  }

  const rankedHimalayas =
    himalayasJobs
      .filter(
        (opportunity) =>
          opportunity.applicationUrl &&
          opportunity.description
      )
      .filter(
        looksStudentFriendly
      )
      .map(
        (opportunity) => ({
          ...opportunity,

          relevanceScore:
            calculateProfileRelevance(
              opportunity,
              profileKeywords
            ),
        })
      )
      .filter(
        (opportunity) =>
          opportunity.relevanceScore >
          0
      )
      .sort(
        (first, second) =>
          second.relevanceScore -
          first.relevanceScore
      );

  /*
    If Himalayas gave us enough targeted
    results, don't pollute them with a
    broader European fallback feed.
  */

  if (
    rankedHimalayas.length >= 8
  ) {
    return removeDuplicates(
      rankedHimalayas
    )
      .slice(
        0,
        MAX_RESULTS
      )
      .map(
        ({
          relevanceScore,
          ...opportunity
        }) => opportunity
      );
  }

  /* ------------------------------
     FALLBACK SOURCE: ARBEITNOW
  ------------------------------ */

  let arbeitnowJobs = [];

  try {
    arbeitnowJobs =
      await fetchArbeitnowFallback();
  } catch (error) {
    console.warn(
      "Arbeitnow fallback failed:",
      error
    );
  }

  const rankedArbeitnow =
    arbeitnowJobs
      .filter(
        (opportunity) =>
          opportunity.applicationUrl &&
          opportunity.description
      )
      .map(
        (opportunity) => ({
          ...opportunity,

          relevanceScore:
            calculateProfileRelevance(
              opportunity,
              profileKeywords
            ),
        })
      )
      /*
        This is important:
        Arbeitnow is only allowed into
        AeroPath if it has actual profile
        relevance.
      */
      .filter(
        (opportunity) =>
          opportunity.relevanceScore >=
          3
      );

  const combined =
    removeDuplicates([
      ...rankedHimalayas,
      ...rankedArbeitnow,
    ])
      .sort(
        (first, second) =>
          second.relevanceScore -
          first.relevanceScore
      )
      .slice(
        0,
        MAX_RESULTS
      );

  return combined.map(
    ({
      relevanceScore,
      ...opportunity
    }) => opportunity
  );
}
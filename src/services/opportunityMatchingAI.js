import { getApp } from "firebase/app";

import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from "firebase/ai";

const matchSchema = Schema.object({
  properties: {
    matches: Schema.array({
      items: Schema.object({
        properties: {
          externalId: Schema.string(),
          matchScore: Schema.number(),
          eligible: Schema.boolean(),

          matchReason: Schema.string(),

          matchedSkills: Schema.array({
            items: Schema.string(),
          }),

          missingQualifications: Schema.array({
            items: Schema.string(),
          }),
        },
      }),
    }),
  },
});

function cleanProfile(profile) {
  return {
    college: profile.college || "",
    major: profile.major || "",
    academicLevel:
      profile.academicLevel || "",

    graduationYear:
      profile.graduationYear || null,

    gpa: profile.gpa || {},

    coursework:
      profile.courseworkStructured ||
      profile.coursework ||
      {},

    skills: profile.skills || [],

    certifications:
      profile.certifications || [],

    projects: profile.projects || {},

    experience: profile.experience || [],

    achievements:
      profile.achievements || {},

    career: profile.career || {},
  };
}

function cleanOpportunity(opportunity) {
  return {
    externalId: opportunity.externalId,
    title: opportunity.title,
    company: opportunity.company,
    location: opportunity.location,
    remote: opportunity.remote,
    workType: opportunity.workType,

    description:
      opportunity.description.slice(
        0,
        6500
      ),

    tags: opportunity.tags,
  };
}

export async function scoreOpportunities(
  profile,
  opportunities
) {
  if (!profile) {
    throw new Error(
      "AeroPath could not find your profile."
    );
  }

  if (!opportunities.length) {
    return [];
  }

  const app = getApp();

  const ai = getAI(app, {
    backend: new GoogleAIBackend(),
  });

  const model = getGenerativeModel(ai, {
    model: "gemini-3.6-flash",

    generationConfig: {
      responseMimeType:
        "application/json",

      responseSchema: matchSchema,

      temperature: 0.15,
    },
  });

  const prompt = `
You are AeroPath's opportunity matching engine.

Your task is to compare ONE student's approved
AeroPath profile against real opportunity listings.

STUDENT PROFILE:

${JSON.stringify(cleanProfile(profile), null, 2)}

OPPORTUNITIES:

${JSON.stringify(
  opportunities.map(cleanOpportunity),
  null,
  2
)}

STRICT MATCHING RULES:

1. Use ONLY information contained in the student's
profile.

2. Never invent or assume a qualification.

3. Do not assume the student knows a skill simply
because they took a related course.

4. Do not assume work authorization, citizenship,
age, race, gender, disability, veteran status,
security clearance, transportation, or relocation
ability unless explicitly included in the profile.

5. A preference mismatch should lower relevance,
but should not automatically mean the student is
ineligible.

6. Distinguish REQUIRED qualifications from
PREFERRED qualifications when the listing makes
that distinction.

7. If the listing has a hard requirement that the
student clearly does not meet, eligible should be
false.

8. Missing information is not automatically a
failure. If eligibility cannot be determined, do
not invent an answer.

9. Match scores must reflect actual evidence.

MATCH SCORE GUIDANCE:

90–100:
Exceptionally strong alignment. The student meets
most meaningful requirements and has highly
relevant evidence.

80–89:
Strong match. Good academic, skill, project, or
experience alignment with only modest gaps.

70–79:
Reasonable match. Several relevant qualifications
but noticeable gaps.

55–69:
Possible/stretch opportunity.

0–54:
Weak relevance or significant qualification
mismatch.

matchedSkills:
Include only skills or capabilities explicitly
present in BOTH the profile and opportunity.

missingQualifications:
Only list qualifications explicitly requested by
the opportunity that are absent from the student's
profile. Do not claim the student lacks something;
phrase it as "Not listed in profile: MATLAB" or
similar.

matchReason:
Write 1–3 concise sentences explaining the most
important evidence for the score.

Return one result for every supplied externalId.
`;

  const response =
    await model.generateContent(prompt);

  const text = response.response.text();

  if (!text) {
    throw new Error(
      "AeroPath could not generate opportunity matches."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "AeroPath received an invalid matching response."
    );
  }

  if (!Array.isArray(parsed.matches)) {
    throw new Error(
      "AeroPath received incomplete match results."
    );
  }

  return parsed.matches;
}
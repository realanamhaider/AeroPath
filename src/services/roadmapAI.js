import { getApp } from "firebase/app";

import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from "firebase/ai";

const roadmapSchema = Schema.object({
  properties: {
    careerGoal: Schema.string(),

    summary: Schema.string(),

    gaps: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          explanation: Schema.string(),
          importance: Schema.string(),
        },
      }),
    }),

    priorities: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          reason: Schema.string(),
          timeframe: Schema.string(),
        },
      }),
    }),

    nextActions: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          description: Schema.string(),
          category: Schema.string(),
          suggestedDays: Schema.number(),
        },
      }),
    }),
  },
});

function cleanProfile(profile) {
  return {
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

    skills:
      Array.isArray(profile.skills)
        ? profile.skills
        : [],

    certifications:
      Array.isArray(
        profile.certifications
      )
        ? profile.certifications
        : [],

    projects:
      profile.projects || {},

    experience:
      Array.isArray(profile.experience)
        ? profile.experience
        : [],

    achievements:
      profile.achievements || {},

    career:
      profile.career || {},
  };
}

export async function generateRoadmap(
  profile
) {
  if (!profile) {
    throw new Error(
      "AeroPath could not find your profile."
    );
  }

  const app = getApp();

  const ai = getAI(app, {
    backend: new GoogleAIBackend(),
  });

  const model =
    getGenerativeModel(ai, {
      model: "gemini-3.6-flash",

      generationConfig: {
        responseMimeType:
          "application/json",

        responseSchema:
          roadmapSchema,

        temperature: 0.2,
      },
    });

  const prompt = `
You are AeroPath's career roadmap engine.

Create a practical roadmap using ONLY the student's
approved AeroPath profile.

STUDENT PROFILE:

${JSON.stringify(
  cleanProfile(profile),
  null,
  2
)}

STRICT RULES:

1. Never invent qualifications, experience, skills,
   projects, coursework, awards, or certifications.

2. Do not assume the student knows a skill simply
   because they completed a related course.

3. Missing information may be identified as a gap,
   but do not claim the student definitely lacks
   something unless the profile supports that.

4. Base recommendations on the student's career goal,
   target roles, academic stage, skills, projects,
   coursework, experience, and achievements.

5. Recommendations must be realistic for the
   student's current academic level.

6. Avoid generic advice such as:
   "work hard"
   "network more"
   "improve your resume"

7. Every recommendation should produce a concrete
   action the student could actually complete.

8. Do not recommend lying, exaggerating experience,
   or claiming qualifications the student does not have.

ROADMAP STRUCTURE:

careerGoal:
State the primary career direction using the profile.

summary:
2-3 concise sentences describing the student's
current position and most important direction.

gaps:
Return 3-6 meaningful development areas.

importance must be one of:
"high"
"medium"
"low"

priorities:
Return the 3 most important priorities.

timeframe examples:
"Next 30 days"
"Next 3 months"
"This semester"

nextActions:
Return 4-8 concrete actions.

category must be one of:
"Skill"
"Project"
"Coursework"
"Experience"
"Application"
"Career"

suggestedDays:
Approximate number of days the student should give
the action before its target completion date.

Keep the roadmap ambitious but evidence-based.
`;

  const response =
    await model.generateContent(
      prompt
    );

  const text =
    response.response.text();

  if (!text) {
    throw new Error(
      "AeroPath could not generate your roadmap."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "AeroPath received an invalid roadmap response."
    );
  }
}
import { getApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from "firebase/ai";

const MAX_RAW_FILE_BYTES = 12 * 1024 * 1024;

const supportedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const profileSchema = Schema.object({
  properties: {
    fullName: Schema.string(),
    college: Schema.string(),
    major: Schema.string(),
    academicLevel: Schema.string(),
    graduationYear: Schema.string(),

    gpaScale: Schema.string(),
    currentGpa: Schema.string(),
    previousGpa: Schema.string(),

    currentClasses: Schema.array({
      items: Schema.string(),
    }),

    completedClasses: Schema.array({
      items: Schema.string(),
    }),

    skills: Schema.array({
      items: Schema.string(),
    }),

    certifications: Schema.array({
      items: Schema.string(),
    }),

    schoolProjects: Schema.array({
      items: Schema.string(),
    }),

    personalProjects: Schema.array({
      items: Schema.string(),
    }),

    experience: Schema.array({
      items: Schema.string(),
    }),

    awards: Schema.array({
      items: Schema.string(),
    }),

    scholarships: Schema.array({
      items: Schema.string(),
    }),

    competitions: Schema.array({
      items: Schema.string(),
    }),

    publications: Schema.array({
      items: Schema.string(),
    }),

    honors: Schema.array({
      items: Schema.string(),
    }),

    extractionNotes: Schema.array({
      items: Schema.string(),
    }),
  },
});

function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      try {
        const result = reader.result;

        if (typeof result !== "string") {
          reject(
            new Error(`Could not read ${file.name}.`)
          );
          return;
        }

        const base64Data = result.split(",")[1];

        if (!base64Data) {
          reject(
            new Error(`Could not prepare ${file.name}.`)
          );
          return;
        }

        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(
        new Error(`Could not read ${file.name}.`)
      );
    };

    reader.readAsDataURL(file);
  });
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) =>
      typeof item === "string" ? item.trim() : ""
    )
    .filter(Boolean);
}

function normalizeText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeResult(result) {
  return {
    fullName: normalizeText(result.fullName),
    college: normalizeText(result.college),
    major: normalizeText(result.major),
    academicLevel: normalizeText(
      result.academicLevel
    ),
    graduationYear: normalizeText(
      result.graduationYear
    ),

    gpaScale: normalizeText(result.gpaScale),
    currentGpa: normalizeText(result.currentGpa),
    previousGpa: normalizeText(
      result.previousGpa
    ),

    currentClasses: normalizeArray(
      result.currentClasses
    ),

    completedClasses: normalizeArray(
      result.completedClasses
    ),

    skills: normalizeArray(result.skills),

    certifications: normalizeArray(
      result.certifications
    ),

    schoolProjects: normalizeArray(
      result.schoolProjects
    ),

    personalProjects: normalizeArray(
      result.personalProjects
    ),

    experience: normalizeArray(result.experience),

    awards: normalizeArray(result.awards),

    scholarships: normalizeArray(
      result.scholarships
    ),

    competitions: normalizeArray(
      result.competitions
    ),

    publications: normalizeArray(
      result.publications
    ),

    honors: normalizeArray(result.honors),

    extractionNotes: normalizeArray(
      result.extractionNotes
    ),
  };
}

export async function analyzeProfileDocuments({
  resume,
  transcript,
  credentials = [],
}) {
  const files = [
    resume,
    transcript,
    ...credentials,
  ].filter(Boolean);

  if (files.length === 0) {
    throw new Error(
      "Choose at least one document to analyze."
    );
  }

  for (const file of files) {
    if (!supportedMimeTypes.has(file.type)) {
      throw new Error(
        `${file.name} is not supported. Use PDF, TXT, JPG, PNG, or WEBP.`
      );
    }
  }

  const totalBytes = files.reduce(
    (sum, file) => sum + file.size,
    0
  );

  if (totalBytes > MAX_RAW_FILE_BYTES) {
    throw new Error(
      "The selected documents are too large to analyze together. Keep the combined files under 12 MB."
    );
  }

  const app = getApp();

  const ai = getAI(app, {
    backend: new GoogleAIBackend(),
  });

  const model = getGenerativeModel(ai, {
    model: "gemini-3.6-flash",

    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: profileSchema,
    },
  });

  const documentParts = await Promise.all(
    files.map(fileToGenerativePart)
  );

  const prompt = `
You are AeroPath's student profile extraction system.

Analyze only the documents supplied by the student.

Your job is to extract accurate information that can be used to
pre-fill a student career profile.

STRICT RULES:

1. Never invent, estimate, infer, assume, or embellish information.
2. Only return information explicitly supported by the documents.
3. If a field is not clearly supported, return an empty string or empty array.
4. Do not infer a major from coursework.
5. Do not infer GPA scale if it is not stated or unmistakably shown.
6. Do not calculate a GPA yourself.
7. Do not infer academic level from age.
8. Do not turn interests into skills.
9. Do not turn course names into professional skills unless the document explicitly lists the skill elsewhere.
10. Preserve course names, certification names, awards, employers,
project names, and organizations accurately.
11. Deduplicate repeated information appearing across documents.
12. Do not extract addresses, phone numbers, student ID numbers,
birth dates, or other unnecessary identifying information.
13. Do not create career goals or target roles. Those will be asked
directly by AeroPath later.
14. If something is uncertain, omit it rather than guessing.

FIELD GUIDANCE:

fullName:
Student's name only when explicitly present.

college:
Current college or university when clearly identified.

major:
Current declared major/program only.

academicLevel:
Only if explicitly stated, such as First-year, Sophomore, Junior,
Senior, Graduate, or another clearly stated level.

graduationYear:
Only an explicitly stated expected graduation year.

gpaScale:
Explicit GPA scale only.

currentGpa:
Current/cumulative GPA only when explicitly listed.

previousGpa:
Only when a clearly older GPA is explicitly identified.

currentClasses:
Courses clearly shown as currently in progress.

completedClasses:
Courses clearly shown as completed.

skills:
Actual technical, professional, software, language, or other
skills explicitly supported by the documents.

certifications:
Earned certifications or credentials.

schoolProjects:
Academic/course/research projects clearly associated with school.

personalProjects:
Independent, entrepreneurial, technical, or personal projects.

experience:
Employment, internships, volunteering, leadership, research
positions, organizations, or significant extracurricular experience.

awards:
Awards or competitive recognition.

scholarships:
Scholarships, fellowships, or grants.

competitions:
Competitions, hackathons, challenges, or competitive events.

publications:
Published research, presentations, posters, papers, or conference work.

honors:
Dean's List, honor societies, academic honors, distinctions, or
similar recognition.

extractionNotes:
Only include short notes when something needs the student's attention.
Examples:
- "Graduation year was not found."
- "Two GPAs appeared; verify which one is current."
- "Major was not explicitly stated."

Return only the structured profile information.
`;

  const result = await model.generateContent([
    prompt,
    ...documentParts,
  ]);

  const responseText = result.response.text();

  if (!responseText) {
    throw new Error(
      "AeroPath could not extract information from these documents."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(
      "AeroPath received an invalid document analysis response."
    );
  }

  return normalizeResult(parsed);
}
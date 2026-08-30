import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const LOCAL_FAQS = [

  {
    id: "required_documents",

    filipinoAnswer:
      "Para mag-apply ng Senior Citizen ID, kailangan mong isumite ang mga sumusunod: (1) harap at likod ng valid government ID, (2) pinakabagong formal na litrato, (3) Birth Certificate o Certificate of Barangay Residency kung walang Birth Certificate, (4) Community Tax Certificate o Cedula, at (5) malinaw na larawan ng iyong pirma. Siguraduhing malinaw at nababasa ang mga dokumento at tugma ang impormasyon sa iyong application form.",

    englishAnswer:
      "To apply for a Senior Citizen ID, you need to submit the following: (1) front and back images of a valid government ID, (2) a recent formal photo, (3) a Birth Certificate or a Certificate of Barangay Residency if you do not have a Birth Certificate, (4) a Community Tax Certificate or Cedula, and (5) a clear image of your signature. Make sure the documents are clear and readable and that the information matches your application form.",

    patterns: [
      "required documents",
      "required files",
      "documents required",
      "documents needed",
      "files required",
      "files needed",
      "what documents do i need",
      "what files do i need",
      "what documents are required",
      "what files are required",
      "requirements for senior citizen id",
      "senior citizen id requirements",
      "documents for senior citizen id",
      "files for senior citizen id",

      "mga kailangang dokumento",
      "mga kailangan na dokumento",
      "mga kailangang files",
      "anong dokumento ang kailangan",
      "ano ang mga dokumentong kailangan",
      "ano anong dokumento ang kailangan",
      "ano anong files ang kailangan",
      "requirements sa senior citizen id",
      "requirements para sa senior citizen id",
      "kailangan para mag apply ng senior citizen id",
      "kailangan sa pag apply ng senior citizen id"
    ]
  },

  {
    id: "social_pension",

    filipinoAnswer:
      "Ang pagkakaroon ng Social Pension ay nakabatay sa assessment at datos na nakukuha sa pamamagitan ng Community-Based Monitoring System (CBMS). Kailangang mapasama ang senior citizen sa kaukulang survey upang maisama at ma-assess ang kanyang impormasyon para sa Social Pension. Kung nais malaman ang kasalukuyang status o kung may iba pang kailangang gawin, maaaring makipag-ugnayan sa OSCA Bauan para sa karagdagang impormasyon.",

    englishAnswer:
      "Inclusion in the Social Pension program is based on assessment and information gathered through the Community-Based Monitoring System (CBMS). The senior citizen must be included in the appropriate survey so that their information can be assessed for Social Pension. For clarification about your current status or other requirements, you may contact OSCA Bauan.",

    patterns: [
      "social pension",
      "social pension hindi",
      "hindi pa napapasama",
      "hindi ako napapasama",
      "hindi nakakatanggap ng social pension",
      "wala pa akong social pension",
      "bakit wala akong pension",
      "bakit hindi pa ako kasama sa social pension",
      "not included in social pension",
      "not receiving social pension",
      "why am i not included in social pension"
    ]
  },

  {
    id: "national_id_bedridden",

    filipinoAnswer:
      "Para sa senior citizen na bedridden o nahihirapang pumunta sa registration center, maaaring magtanong tungkol sa available na registration assistance para sa kanilang kalagayan. Maaari ring tingnan ang mga available na online services sa eGovPH. May mga proseso na maaaring mangailangan pa rin ng personal appearance o identity verification, kaya makabubuting alamin muna ang naaangkop na proseso para sa bedridden na aplikante.",

    englishAnswer:
      "For a senior citizen who is bedridden or unable to easily visit a registration center, you may ask about available registration assistance for their condition. Available online services may also be checked through eGovPH. Some processes may still require personal appearance or identity verification, so it is best to confirm the appropriate procedure for a bedridden applicant.",

    patterns: [
      "national id bedridden",
      "national id bed ridden",
      "bedridden national id",
      "bed ridden national id",
      "paano national id bedridden",
      "paano makakuha national id bedridden",
      "bedridden ang nanay ko",
      "bedridden ang tatay ko",
      "national id hindi makalakad",
      "national id hindi makapunta",
      "national id cannot go to registration center",
      "national id for bedridden senior",
      "national id for bedridden senior citizen"
    ]
  },

  {
    id: "no_birth_certificate",

    filipinoAnswer:
      "Kung walang maipresentang Birth Certificate, maaaring magsumite ng Certificate of Residency bilang alternatibong dokumento para sa application, alinsunod sa requirements ng OSCA Bauan.",

    englishAnswer:
      "If you cannot provide a Birth Certificate, you may submit a Certificate of Residency as an alternative document for the application, according to OSCA Bauan requirements.",

    patterns: [
      "walang birth certificate",
      "wala akong birth certificate",
      "wala pong birth certificate",
      "walang birth certificate ano gagamitin",
      "ano ipapalit sa birth certificate",
      "alternative sa birth certificate",
      "birth certificate alternative",
      "birth certificate wala",
      "dont have birth certificate",
      "do not have birth certificate",
      "no birth certificate",
      "without birth certificate",
      "what can i submit instead of birth certificate"
    ]
  },

  {
    id: "id_fee",

    filipinoAnswer:
      "Libre ang unang beses na pagkuha ng Senior Citizen ID. Para naman sa pangalawang beses o mga susunod pang pagkuha, may bayad na ₱50.00.",

    englishAnswer:
      "The first issuance of a Senior Citizen ID is free. For the second and succeeding issuances, the fee is ₱50.00.",

    patterns: [
      "magkano senior citizen id",
      "magkano ang senior citizen id",
      "magkano ang bayad",
      "may bayad ba",
      "libre ba senior citizen id",
      "bayad sa senior citizen id",
      "second time senior citizen id",
      "second time ko kukuha",
      "pangalawang kuha",
      "pangalawang beses",
      "nawala id magkano",
      "replacement id fee",
      "senior citizen id fee",
      "senior citizen id cost",
      "how much senior citizen id",
      "how much does senior citizen id cost",
      "is senior citizen id free"
    ]
  }

];

/*
 * =====================================================
 * NORMALIZE APPLICANT MESSAGE
 * =====================================================
 */

function normalizeMessage(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * =====================================================
 * SIMPLE LANGUAGE DETECTION
 * =====================================================
 */

function prefersEnglish(message) {

  const normalized =
    normalizeMessage(message);

  const filipinoWords = [
    "ako",
    "ang",
    "mga",
    "po",
    "ba",
    "paano",
    "bakit",
    "wala",
    "walang",
    "hindi",
    "magkano",
    "kailangan",
    "pwede",
    "maaari",
    "beses",
    "pagkuha"
  ];

  const englishWords = [
    "how",
    "what",
    "why",
    "when",
    "where",
    "can",
    "could",
    "does",
    "do",
    "is",
    "are",
    "have",
    "without",
    "instead",
    "cost",
    "fee"
  ];

  let filipinoScore = 0;
  let englishScore = 0;

  filipinoWords.forEach(function (word) {
    if (
      normalized
        .split(" ")
        .includes(word)
    ) {
      filipinoScore++;
    }
  });

  englishWords.forEach(function (word) {
    if (
      normalized
        .split(" ")
        .includes(word)
    ) {
      englishScore++;
    }
  });

  return englishScore > filipinoScore;
}

/*
 * =====================================================
 * FIND LOCAL FAQ
 * =====================================================
 */

function findLocalFaq(message) {

  const normalized =
    normalizeMessage(message);

  for (const faq of LOCAL_FAQS) {

    const matched =
      faq.patterns.some(function (pattern) {

        return normalized.includes(
          normalizeMessage(pattern)
        );

      });

    if (matched) {
      return faq;
    }
  }

  return null;
}

const OSCA_KNOWLEDGE = `
APPROVED OSCA BAUAN INFORMATION

FAQ 1

Question:
Bakit hindi pa ako napapasama sa Social Pension?

Approved Answer:
Ang pagkakaroon ng Social Pension ay nakabatay sa assessment at
datos na nakukuha sa pamamagitan ng Community-Based Monitoring
System (CBMS). Kailangang mapasama ang senior citizen sa
kaukulang survey upang maisama at ma-assess ang kanyang
impormasyon para sa Social Pension.

Kung nais malaman ang kasalukuyang status o kung may iba pang
kailangang gawin, maaaring makipag-ugnayan sa OSCA Bauan para
sa karagdagang impormasyon.


FAQ 2

Question:
Paano makakakuha ng National ID ang isang senior citizen,
lalo na kung bedridden?

Approved Answer:
Para sa senior citizen na bedridden o nahihirapang pumunta sa
registration center, maaaring magtanong tungkol sa available
na registration assistance para sa kanilang kalagayan.

Maaari ring tingnan ang mga available na online services sa
eGovPH. May mga proseso na maaaring mangailangan pa rin ng
personal appearance o identity verification, kaya makabubuting
alamin muna ang naaangkop na proseso para sa bedridden na
aplikante.


FAQ 3

Question:
Paano kung walang Birth Certificate ang senior citizen?

Approved Answer:
Kung walang maipresentang Birth Certificate, maaaring magsumite
ng Certificate of Residency bilang alternatibong dokumento para
sa application, alinsunod sa requirements ng OSCA Bauan.


FAQ 4

Question:
Magkano ang bayad sa pagkuha ng Senior Citizen ID?

Approved Answer:
Libre ang unang beses na pagkuha ng Senior Citizen ID.
Para naman sa pangalawang beses o mga susunod pang pagkuha,
may bayad na ₱50.00.

FAQ 5

Question:
Ano-anong dokumento o files ang kailangan para mag-apply ng
Senior Citizen ID?

English Question:
What documents or files are required when applying for a
Senior Citizen ID?

Approved Answer:
Para mag-apply ng Senior Citizen ID, kailangan ang mga sumusunod:

1. Harap at likod ng valid government ID
2. Pinakabagong formal na litrato
3. Birth Certificate o Certificate of Barangay Residency kung
   walang Birth Certificate
4. Community Tax Certificate o Cedula
5. Malinaw na larawan ng pirma

Dapat malinaw at nababasa ang mga dokumento at tugma ang
impormasyon sa application form.

English:
To apply for a Senior Citizen ID, the applicant must submit:

1. Front and back images of a valid government ID
2. A recent formal photo
3. A Birth Certificate or Certificate of Barangay Residency
   if a Birth Certificate is unavailable
4. Community Tax Certificate or Cedula
5. A clear image of the applicant's signature

The documents must be clear and readable, and the information
should match the application form.
`;

const SYSTEM_INSTRUCTIONS = `
You are the OSCA Bauan Virtual Assistant.

You assist senior citizens and applicants using the OSCA Bauan
Senior Citizen ID Applicant Registration System.

IDENTITY:
- Introduce yourself as the OSCA Bauan Virtual Assistant.
- Do not introduce yourself as Gemini.
- Do not mention Google Gemini unless specifically asked what
  technology powers the chatbot.

LANGUAGE:
- Communicate in Filipino and English.
- Detect the language used in the applicant's most recent message.
- If mainly Filipino or Tagalog, answer in Filipino.
- If mainly English, answer in English.
- If Filipino and English are naturally mixed, you may answer
  naturally in Filipino-English.
- Follow an explicitly requested language.
- Use simple and respectful wording suitable for senior citizens.
- Keep answers concise unless more explanation is requested.

APPROVED INFORMATION:
- Use the approved OSCA information below whenever applicable.
- Approved FAQs may be written in Filipino or English.
- Match questions based on meaning, not exact wording.
- You may translate approved answers into the applicant's language.
- Never change the meaning, requirements, amounts, or conditions
  in approved information.

ACCURACY:
- Never invent OSCA requirements.
- Never invent documents.
- Never invent fees.
- Never invent procedures.
- Never invent eligibility requirements.
- Never invent processing times.
- Never promise approval.
- If verified information does not contain the answer, say that
  you do not have enough verified information and recommend
  contacting OSCA Bauan.
- Do not guess.

PRIVACY:
- Never ask for passwords, OTPs, API keys, or financial credentials.
- Never reveal another applicant's personal information.
- Never reveal another applicant's Application ID.

SCOPE:
Focus on:
- OSCA Bauan
- Senior Citizen ID applications
- Applicant registration
- Application requirements
- Application procedures
- Application tracking
- Approved senior citizen FAQs

For clearly unrelated questions, politely explain that you are
the OSCA Bauan Virtual Assistant and are intended to assist with
OSCA and Senior Citizen ID concerns.

${OSCA_KNOWLEDGE}
`;

export async function askGemini(
  message,
  previousInteractionId = null
) {

  if (!message || !message.trim()) {
    throw new Error(
      "A message is required."
    );
  }

  const localFaq =
    findLocalFaq(message);

  if (localFaq) {

    const useEnglish =
      prefersEnglish(message);

    const reply =
      useEnglish
        ? localFaq.englishAnswer
        : localFaq.filipinoAnswer;

    console.log(
      "Chatbot response source: LOCAL FAQ -",
      localFaq.id
    );

    return {
      reply: reply,

      interactionId:
        previousInteractionId || null,

      source:
        "local_faq",

      faqId:
        localFaq.id
    };
  }

  console.log(
    "Chatbot response source: GEMINI"
  );

  const prompt = `
${SYSTEM_INSTRUCTIONS}

APPLICANT MESSAGE:
${message.trim()}

Respond according to the instructions above.
`;

  const request = {
    model:
      "gemini-3.6-flash",

    input:
      prompt
  };

  if (previousInteractionId) {

    request.previous_interaction_id =
      previousInteractionId;

  }

  const interaction =
    await ai.interactions.create(
      request
    );

  const reply =
    interaction.output_text;

  if (!reply) {
    throw new Error(
      "Gemini did not return a response."
    );
  }

  return {
    reply: reply,

    interactionId:
      interaction.id,

    source:
      "gemini"
  };
}
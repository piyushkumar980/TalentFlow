// /src/lib/db.js
import Dexie from "dexie";

export const db = new Dexie("talentflow");
// CREATE A FEW EXTRA INDEXES TO MAKE QUERIES AND SEARCHES MUCH FASTER.
db.version(1).stores({
  jobs: "++id, slug, status, order, title",
  candidates: "++id, email, stage, jobId, name",
  timelines: "++id, candidateId, ts, stage",
  assessments: "jobId",
  submissions: "++id, jobId, candidateId",
});

export async function seedIfEmpty() {
  // Ensure DB is open (important after a delete)
  await db.open();

  const count = await db.jobs.count();
  if (count > 0) return;

  // ---------- vocab pools ----------
  const companies = [
    "Acme Corp", "Globex", "Initech", "Umbrella", "Hooli",
    "Stark Industries", "Wayne Tech", "Wonka Labs", "Soylent", "Cyberdyne",
  ];
  const roles = [
    "Frontend Developer", "Backend Engineer", "Full-Stack Engineer",
    "Product Manager", "UI/UX Designer", "Data Scientist", "DevOps Engineer",
    "QA Engineer", "Marketing Manager", "Security Analyst", "HR Generalist",
    "Mobile Developer", "Cloud Engineer", "Data Analyst",
  ];
  const locations = [
    "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
    "Boston, MA", "Los Angeles, CA", "Chicago, IL", "Denver, CO",
    "Atlanta, GA", "Miami, FL", "London, UK",
  ];
  const eduPool = [
    "BS Computer Science, Stanford University",
    "BS Software Engineering, University of Texas",
    "MS Computer Science, MIT",
    "BFA Interaction Design, RISD", 
    "MBA, Harvard Business School",
    "BS Information Systems, UCLA",
    "BS Statistics, University of Chicago",
    "MS Data Science, University of Washington",
  ];
  const statusLabels = ["New", "Active", "In Progress", "Offer Sent", "Hired", "Closed"];
  const firstNames = [
    "Alice","Bob","Carol","David","Evelyn","Frank","Grace","Henry","Isabella","Jack",
    "Karen","Liam","Mia","Noah","Olivia","Zane","Aria","Brandon","Sophia","Ethan",
    "Madison","Lucas","Ava","Daniel","Chloe","Mason","Ella","James","Amelia","Alexander",
    "Scarlett","Michael","Zoe","Benjamin","Emily","Logan","Harper","Elijah","Avery","Jackson",
    "Sofia","Matthew","Lily","Samuel","Victoria","Anthony","Natalie","Christopher","Grace","Andrew",
    "Sophie","Joseph","Penelope","Ryan","Layla","William","Nora","David","Eleanor","Henry",
  ];
  const lastNames = [
    "Chen","Rodriguez","Williams","Kim","Johnson","Miller","Lee","Zhao","Torres","Nguyen",
    "Smith","Patel","Brown","Garcia","Martin","Wilson","Gomez","Lee","Turner","Scott",
    "Carter","Brooks","Collins","Foster","Adams","Rivera","Mitchell","Perry","Hughes","Price",
    "Ramirez","Simmons","Turner","Lopez","Russell","Scott","Young","Reed","Evans","Hayes",
    "Gray","Rivera","Sanders","Torres","Allen","Brooks","James","Diaz","Martinez","Bennett",
    "Rivera","Hughes","Foster","Cooper","Morgan","Bailey","King","Torres","Scott","Wright",
  ];

  const skillByRole = {
    "Frontend Developer": ["React","TypeScript","CSS","Jest","Webpack"],
    "Backend Engineer": ["Node.js","Express","PostgreSQL","REST","Redis"],
    "Full-Stack Engineer": ["React","Node.js","MongoDB","GraphQL","Docker"],
    "Product Manager": ["Roadmaps","User Research","A/B Testing","SQL"],
    "UI/UX Designer": ["Figma","Wireframing","Prototyping","Design Systems"],
    "Data Scientist": ["Python","Pandas","Machine Learning","SQL","Scikit-learn"],
    "DevOps Engineer": ["AWS","Docker","Kubernetes","Terraform","CI/CD"],
    "QA Engineer": ["Test Cases","Selenium","Cypress","Jira"],
    "Marketing Manager": ["SEO","Content","Email","Analytics"],
    "Security Analyst": ["Threat Modeling","SIEM","Network Security"],
    "HR Generalist": ["ATS","Onboarding","Employee Relations"],
    "Mobile Developer": ["Swift","Kotlin","React Native","Firebase"],
    "Cloud Engineer": ["Azure","GCP","Kubernetes","Terraform"],
    "Data Analyst": ["SQL","Tableau","Excel","Python"],
  };

  // helpers 
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const phone = () => `(${rand(200, 989)}) ${rand(100, 999)}-${rand(1000, 9999)}`;
  const yearsExp = () => `${rand(1, 10)} years`;
  const lastContact = () => {
    const d = rand(0, 7);
    if (d === 0) return "Today";
    if (d === 1) return "1 day ago";
    return `${d} days ago`;
  };
  const notePool = [
    "Great portfolio; schedule tech interview.",
    "Strong culture fit; get hiring manager feedback.",
    "Needs follow-up on availability.",
    "Salary expectations within range.",
    "Asked smart questions in screen.",
  ];

  //  seed jobs (150) 
  const tagsPool = ["react","node","intern","remote","senior","contract","ui","ml"];
  const jobs = Array.from({ length: 150 }).map((_, i) => {
    const company = pick(companies);
    const role = pick(roles);
    return {
      title: `${role} @ ${company}`,
      company,
      role,
      slug: `job-${i + 1}`,
      status: Math.random() > 0.3 ? "active" : "archived",
      tags: shuffle(tagsPool).slice(0, Math.floor(Math.random() * 3) + 1),
      order: i,
      location: pick(locations),
    };
  });
  const jobIds = await db.jobs.bulkAdd(jobs, { allKeys: true });

  //  seed candidates (1050) 
  const stageSteps = ["applied","screen","tech","offer","hired","rejected"];
  const candidateCount = 1050;

  const candidates = Array.from({ length: candidateCount }).map((_, i) => {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const email = `user${i + 1}@mail.com`;
    const jobIndex = Math.floor(Math.random() * jobIds.length);
    const jobId = jobIds[jobIndex];
    const job = jobs[jobIndex];
    const stage = pick(stageSteps);
    return {
      name,
      email,
      jobId,
      stage, // lower-case in DB; UI can uppercase when displaying
      phone: phone(),
      location: pick(locations),
      position: job.role,
      experience: yearsExp(),
      skills: shuffle(skillByRole[job.role] || ["Communication","Teamwork"]).slice(0, 4),
      education: pick(eduPool),
      status: pick(statusLabels),
      lastContact: lastContact(),
      notes: pick(notePool),
    };
  });
  const candIds = await db.candidates.bulkAdd(candidates, { allKeys: true });

  // seed timelines 
  const now = Date.now();
  const timelines = candIds.flatMap((cid, idx) => {
    const finalStage = candidates[idx].stage;
    const path = pathTo(finalStage, stageSteps); // applied -> ... -> finalStage
    const startDays = path.length * 2 + (idx % 3);
    return path.map((stg, k) => ({
      candidateId: cid,
      stage: stg,
      ts: now - (startDays - k) * 24 * 60 * 60 * 1000, // ≈2 days apart
      by: pick(["Priya (Recruiter)", "Anita (Hiring Manager)", "Rahul (Interviewer)", "System"]),
      note: `Stage set to ${stg}`,
    }));
  });
  await db.timelines.bulkAdd(timelines);

  // seed a few assessments (7) 
  for (let j = 0; j < Math.min(7, jobIds.length); j++) {
    const jobId = jobIds[j];
    const assessment = {
      jobId,
      sections: [
        {
          id: rid(),
          title: "Basics",
          questions: [
            { id: rid(), type: "single", label: "Are you willing to relocate?", required: true, options: ["Yes", "No"] },
            { id: rid(), type: "short", label: "Current company", required: false, maxLength: 60 },
          ],
        },
        {
          id: rid(),
          title: "Skills",
          questions: [
            { id: rid(), type: "multi", label: "Tech you know", required: true, options: ["React","Node","SQL","Python","AWS"] },
            { id: rid(), type: "numeric", label: "Years of experience", required: true, min: 0, max: 20 },
            { id: rid(), type: "long", label: "Biggest project you led", required: false, maxLength: 500 },
          ],
        },
      ],
    };
    await db.assessments.put(assessment);
  }
}

// Quick helper to drop & reseed from the console:
// import('/src/lib/db.js').then(m => m.resetAndReseed()).then(() => location.reload())
export async function resetAndReseed() {
  await db.delete();   // drop IndexedDB
  await db.open();     // recreate with current schema
  await seedIfEmpty(); // seed again
}

// ---------- utils ----------
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
function pathTo(finalStage, steps) {
  const idx = Math.max(0, steps.indexOf(finalStage));
  return steps.slice(0, idx + 1);
}
export function rid() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2);
}

import LegalPage from "./LegalPage";

const SECTIONS = [
  {
    heading: "About this service",
    body: [
      "JobMatch AI is a final year BSc Software Engineering research project. It is provided for demonstration and academic assessment. It is not a commercial recruitment service and no employment relationship arises from using it.",
    ],
  },
  {
    heading: "Using an account",
    body: [
      "You are responsible for the accuracy of the information you provide and for keeping your password secure. Accounts are personal, and you should not upload a CV belonging to someone else without their permission.",
    ],
  },
  {
    heading: "How to treat match scores",
    body: [
      "Match scores and skill gap lists are generated automatically from the text of your CV and the text of each advert. They are an aid to prioritising applications, not a judgement of your ability or your suitability for a role.",
      "A low score does not mean you should not apply, and a high score is not a prediction that you will be hired. Hiring decisions rest entirely with employers.",
    ],
  },
  {
    heading: "How to treat forecasts",
    body: [
      "Demand forecasts are statistical estimates produced from historical employment data used as a proxy for vacancy demand. They carry real uncertainty, described on the forecast page, and should not be relied on as financial or career advice.",
    ],
  },
  {
    heading: "Vacancy information",
    body: [
      "Vacancies are collected from public job boards and are reproduced for research purposes. Their accuracy, availability and closing dates are controlled by the original sources, and adverts may have changed or closed since they were collected. Always check the original advert before applying.",
    ],
  },
  {
    heading: "Availability",
    body: [
      "The service is provided as is, without warranty. It runs on development infrastructure for the duration of the project, may be unavailable at any time, and may be withdrawn once assessment is complete.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "The application code, the curated skills taxonomy and the trained models are the academic work of the author. Vacancy text and employer names remain the property of their respective owners.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "These terms may be updated as the project develops. The date at the top of this page shows when they were last revised.",
    ],
  },
];

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms and conditions"
      intro="The basis on which this research prototype is made available, and how its output should be interpreted."
      updated="August 2026"
      sections={SECTIONS}
      closing="By creating an account you confirm that you have read these terms and understand that JobMatch AI is an academic prototype rather than a commercial service."
    />
  );
}

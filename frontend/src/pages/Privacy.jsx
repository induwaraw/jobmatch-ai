import LegalPage from "./LegalPage";

const SECTIONS = [
  {
    heading: "What we collect",
    body: [
      "Only what the system needs to work. When you create an account we store your name, your email address and a hashed version of your password. Plain passwords are never stored.",
    ],
    list: [
      "Account details: name, email address, password hash, account role, sign up date.",
      "CV data: the filename you uploaded and the plain text extracted from it.",
      "Derived data: the skills identified in your CV and the subcategory assigned to it.",
    ],
  },
  {
    heading: "How your CV is used",
    body: [
      "Your CV text is used to extract skills and to score vacancies against your profile. It is processed on the server that runs this application and is stored against your account.",
      "Your CV is not shared with employers, is not sold, and is not used to train any model. The models in this system were trained before deployment on public job posting data.",
    ],
  },
  {
    heading: "What we do not collect",
    body: [
      "There is no advertising, no third party analytics and no tracking across other websites. No cookies are set for marketing purposes. Your authentication token is held in your own browser and is only sent back to this application.",
    ],
  },
  {
    heading: "Where data is stored",
    body: [
      "Account and CV data is held in a MySQL database on the machine running this application. As a student research prototype it is not hosted on production infrastructure and is not backed up for disaster recovery.",
    ],
  },
  {
    heading: "Deleting your data",
    body: [
      "You are in control of everything you upload. From your profile you can delete an individual CV, which removes its stored text and extracted skills immediately.",
      "You can also delete your entire account. That removes your account record and every CV attached to it. Deletion is immediate and cannot be undone.",
    ],
  },
  {
    heading: "Third party data sources",
    body: [
      "Vacancy information shown in this application is collected from publicly accessible Sri Lankan job boards and remains the property of those sources and the employers who posted it. Demand forecasting uses public employment statistics.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For any question about the data this system holds, or to request removal of information, use the contact page. Because this is a research project run by one student, responses are on a best effort basis.",
    ],
  },
];

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy policy"
      intro="What this application stores about you, why it stores it, and how to remove it."
      updated="August 2026"
      sections={SECTIONS}
      closing="This policy describes the current behaviour of the prototype. If the project is ever deployed publicly it should be reviewed against the applicable data protection requirements before launch."
    />
  );
}

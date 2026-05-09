export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number; // 1-5 stars
  category?: string;
}

export interface Course {
  id: string;
  name: string;
  institution: string;
  startDate: string;
  endDate: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  link: string;
}

export interface Award {
  id: string;
  name: string;
  date: string;
  issuer: string;
}

export interface Reference {
  id: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
}

export interface CVData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    summary: string;
    dob: string;
    nic: string;
    gender: string;
    nationality: string;
    religion: string;
    maritalStatus: string;
  };
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  courses: Course[];
  languages: Language[];
  projects: Project[];
  awards: Award[];
  references: Reference[];
  themeColor: string;
  fontFamily: string;
  profileImage: string;
  imageZoom?: number;
  imageX?: number;
  imageY?: number;
  sidebarColor: string;
  sectionOrder: string[];
  lineSpacing?: number;
  sectionGap?: number;
  hiddenSections?: string[];
}

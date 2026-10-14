export type ContentTranslationData = {
  locale: string;
  source: string;
  updatedAt: string;
};

export type ContentRevisionData = {
  id: string;
  locale: string;
  action: string;
  createdBy: string;
  createdAt: string;
  preview: string;
};

export type ContentBlockData = {
  id: string;
  key: string;
  type: string;
  displayOrder: number;
  status: "DRAFT" | "PUBLISHED";
  label: string;
  description: string;
  catalogued: boolean;
  missingLocales: string[];
  translations: ContentTranslationData[];
  published: ContentTranslationData[];
  revisions: ContentRevisionData[];
};

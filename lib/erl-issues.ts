import issuesData from '@/content/erl-issues/issues.json';

export type IssueStatus = 'done' | 'not-done' | 'in-progress';
export type IssueParty = 'TOA' | 'ERL';

export interface ErlIssue {
  number: number;
  id: string;
  title: string;
  tower: string;
  category: string;
  raisedBy: IssueParty;
  owner: IssueParty;
  status: IssueStatus;
  startDate?: string | null;
  etaDate?: string | null;
  erlComment: string;
  momComment: string;
  updatedOn: string;
}

export const erlIssues = (issuesData as ErlIssue[]).sort(
  (a, b) => a.number - b.number,
);

export const issueStatusLabels: Record<IssueStatus, string> = {
  done: 'Done',
  'in-progress': 'In Progress',
  'not-done': 'Not Done',
};

export function formatTower(tower: string) {
  if (tower === 'ABCE') return 'Towers A, B, C & E';
  if (tower === 'ABC') return 'Towers A, B & C';
  if (tower === 'E') return 'Tower E';
  return tower;
}

import { Priority } from '@prisma/client';

export interface KpiCards {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  myActiveProjects?: number;
  myAssignedTasks?: number;
  myCompletedTasks?: number;
  myOverdueTasks?: number;
}

export interface PriorityDistribution {
  priority: Priority;
  _count: {
    _all: number;
  };
}

export interface MemberWorkloadSummary {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

export interface DashboardInsights {
  kpi: KpiCards;
  priorityDistribution: PriorityDistribution[];
  memberWorkloadSummary: MemberWorkloadSummary[];
}

export interface RecentActivityResponse {
  id: string;
  message: string;
  createdAt: Date;
  user: {
    name: string;
  } | null;
}

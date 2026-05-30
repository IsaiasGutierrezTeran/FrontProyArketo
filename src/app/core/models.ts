// Domain types mirroring the Arketo backend contract.

export type Role = 'superadmin' | 'cliente' | 'arquitecto' | 'ingeniero';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: Role;
  avatar: string | null;
  subscription_plan: string;
  is_active: boolean;
  date_joined: string;
}

export interface Pagination {
  count: number; page: number; page_size: number;
  total_pages: number; next: string | null; previous: string | null;
}

export interface Project {
  id: number; name: string; description: string;
  status: 'draft' | 'active' | 'archived';
  thumbnail: string | null; owner_email: string;
  created_at: string; updated_at: string;
}

export interface DashboardSummary {
  total: number; by_status: Record<string, number>; recent: Project[];
}

export interface Member { id: number; project: number; user_email: string; role: string; created_at: string; }
export interface Comment { id: number; project: number; author_email: string; body: string; parent: number | null; created_at: string; }

export interface Plan {
  id: number; project: number; original_format: string; size_bytes: number;
  status: string; file_url: string | null; uploaded_by_email: string; created_at: string;
}

export interface Model3D {
  id: number; project: number; source_plan: number | null;
  glb_url: string | null; scene_json: any; bounds: any;
  element_count: number; model_name: string; unit: string;
  is_current: boolean; created_at: string;
}

export interface DetectionJob {
  id: number; plan: number; detector: string; status: string;
  processing_ms: number; error: string; model: Model3D | null; created_at: string;
}

export interface RiskFinding { id: number; category: string; severity: string; description: string; suggestion: string; }
export interface RiskAnalysis { id: number; model3d: number; provider: string; status: string; summary: string; findings: RiskFinding[]; created_at: string; }

export interface Material {
  id: number; category: number; category_name: string; name: string;
  unit: string; unit_price: string; block_quality: string; is_active: boolean;
}
export interface BudgetItem { id: number; material: number; material_name: string; quantity: string; unit_price_snapshot: string; subtotal: string; }
export interface BudgetReview { id: number; reviewer_email: string; decision: string; comments: string; created_at: string; }
export interface Budget {
  id: number; project: number; created_by_email: string; status: string;
  labor_people: number; labor_cost: string; materials_cost: string; total: string;
  currency: string; items: BudgetItem[]; review: BudgetReview | null;
  created_at: string; updated_at: string;
}

export interface DesignRequest {
  id: number; mode: string; project: number | null; prompt_text: string;
  transcript: string; provider: string; status: string; result: any;
  model: Model3D | null; created_at: string;
}

export interface ProjectVersion { id: number; project: number; version_number: number; message: string; author_email: string; snapshot: any; created_at: string; }

export interface SubscriptionPlan { id: number; code: string; name: string; price: string; interval: string; features: string[]; is_active: boolean; }
export interface Subscription { id: number; plan: number | null; plan_code: string | null; status: string; }

export interface YnabPayee {
  id: string;
  name: string;
}

export interface YnabCategory {
  id: string;
  name: string;
  group: string;
}

export interface PayeeOverride {
  id: number;
  payee_name: string;
  category_id: string;
  category_name: string | null;
  created_at: string;
  updated_at: string;
}

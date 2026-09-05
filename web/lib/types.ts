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

export interface YnabAccount {
  id: string;
  name: string;
  type: string;
  transfer_payee_id: string | null;
}

export interface BankRule {
  id: number;
  match_text: string;
  match_amount: number | null;
  payee_name: string;
  category_id: string | null;
  category_name: string | null;
  transfer_account_id: string | null;
  transfer_account_name: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}
